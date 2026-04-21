from __future__ import annotations

import contextlib
import csv
import io
import json
import runpy
import tempfile
import types
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import pipeline
from pipeline import (
    Delivery,
    _AnsiTheme,
    _PlainTheme,
    _SummaryRenderer,
    _Theme,
    build_consolidated_rows,
    calculate_delay,
    main,
    normalize_city,
    normalize_date,
    parse_money,
    print_summary,
    require,
    run_pipeline,
)


class PipelineParsingTests(unittest.TestCase):
    def test_theme_base_methods_raise_not_implemented(self) -> None:
        theme = _Theme()
        with self.assertRaises(NotImplementedError):
            theme.header("x")
        with self.assertRaises(NotImplementedError):
            theme.muted("x")
        with self.assertRaises(NotImplementedError):
            theme.success("x")
        with self.assertRaises(NotImplementedError):
            theme.info("x")

    def test_theme_variants_render_expected_output(self) -> None:
        ansi = _AnsiTheme()
        plain = _PlainTheme()

        self.assertIn("\033[", ansi.header("titulo"))
        self.assertIn("\033[", ansi.muted("texto"))
        self.assertIn("\033[", ansi.success("ok"))
        self.assertIn("\033[", ansi.info("info"))
        self.assertEqual(plain.header("titulo"), "titulo")
        self.assertEqual(plain.muted("texto"), "texto")
        self.assertEqual(plain.success("ok"), "ok")
        self.assertEqual(plain.info("info"), "info")

    def test_color_support_detection_respects_terminal_and_env(self) -> None:
        class TtyStream:
            def isatty(self) -> bool:
                return True

        with patch.object(pipeline.sys, "stdout", TtyStream()), patch.dict(
            pipeline.os.environ, {"TERM": "xterm-256color"}, clear=True
        ):
            self.assertTrue(pipeline._color_is_supported())
            self.assertIsInstance(pipeline._pick_theme(), _AnsiTheme)

        with patch.object(pipeline.sys, "stdout", TtyStream()), patch.dict(
            pipeline.os.environ, {"TERM": "dumb"}, clear=True
        ):
            self.assertFalse(pipeline._color_is_supported())
            self.assertIsInstance(pipeline._pick_theme(), _PlainTheme)

    def test_normalizes_supported_dates(self) -> None:
        self.assertEqual(str(normalize_date("20/04/2026")), "2026-04-20")
        self.assertEqual(str(normalize_date("2026-04-20")), "2026-04-20")
        self.assertEqual(str(normalize_date("2026-04-20T10:30:00")), "2026-04-20")

    def test_date_parser_handles_blank_and_invalid_values(self) -> None:
        self.assertIsNone(normalize_date(None))
        self.assertIsNone(normalize_date("   "))
        with self.assertRaises(ValueError):
            normalize_date("20-04-2026")

    def test_normalizes_money(self) -> None:
        self.assertEqual(parse_money("120,50"), Decimal("120.50"))
        self.assertEqual(parse_money("120.50"), Decimal("120.50"))
        self.assertEqual(parse_money("1.250,75"), Decimal("1250.75"))

    def test_money_parser_rejects_blank_and_invalid_values(self) -> None:
        with self.assertRaises(ValueError):
            parse_money("   ")
        with self.assertRaises(ValueError):
            parse_money("12,3x")

    def test_normalizes_city(self) -> None:
        self.assertEqual(normalize_city(" Maceió "), "Maceio")
        self.assertEqual(normalize_city("sao   paulo"), "Sao Paulo")

    def test_city_and_required_field_reject_blank_values(self) -> None:
        with self.assertRaises(ValueError):
            normalize_city(" ")
        with self.assertRaises(ValueError):
            require({}, "id_pedido")


class PipelineHelpersTests(unittest.TestCase):
    def test_delay_returns_none_when_dates_are_incomplete(self) -> None:
        self.assertIsNone(calculate_delay(None))
        self.assertIsNone(
            calculate_delay(
                Delivery(
                    id_pedido="P001",
                    data_prevista_entrega=None,
                    data_realizada_entrega=None,
                    status_entrega="sem_entrega",
                )
            )
        )

    def test_build_consolidated_rows_rejects_missing_customer_and_handles_missing_delivery(self) -> None:
        rows, rejected = build_consolidated_rows(
            orders=[
                pipeline.Order(
                    id_pedido="P001",
                    id_cliente="C001",
                    valor_total=Decimal("100.00"),
                    status_pedido="pago",
                    data_pedido=pipeline.date(2026, 4, 20),
                ),
                pipeline.Order(
                    id_pedido="P002",
                    id_cliente="C404",
                    valor_total=Decimal("80.00"),
                    status_pedido="pendente",
                    data_pedido=pipeline.date(2026, 4, 21),
                ),
            ],
            customers={
                "C001": pipeline.Customer(
                    id_cliente="C001",
                    nome_cliente="Ana",
                    cidade_normalizada="Caruaru",
                    estado="PE",
                )
            },
            deliveries={},
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["status_entrega"], "sem_entrega")
        self.assertEqual(rows[0]["data_prevista_entrega"], "")
        self.assertEqual(rows[0]["data_realizada_entrega"], "")
        self.assertEqual(
            rejected,
            [
                {
                    "file": "pedidos.csv",
                    "row": "P002",
                    "reason": "Missing customer C404",
                }
            ],
        )

    def test_summary_renderer_and_print_summary_emit_human_readable_sections(self) -> None:
        indicators = {
            "total_orders_by_status": {"pago": 2},
            "average_ticket_by_state": {"PE": "100.00"},
            "delivery_percentages": {"on_time": 50.0, "delayed": 50.0},
            "top_3_cities_by_order_volume": [{"city": "Caruaru", "orders": 2}],
            "average_delay_days_for_delayed_orders": 2.0,
            "orphan_delivery_count": 1,
            "orphan_delivery_ids": ["P999"],
            "rejected_row_count": 3,
            "rejected_rows": [],
        }

        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            _SummaryRenderer(
                indicators=indicators,
                data_dir=Path("/tmp/data"),
                output_dir=Path("/tmp/output"),
            ).render()
            print_summary(indicators, data_dir=Path("/tmp/data"), output_dir=Path("/tmp/output"))

        output = stream.getvalue()
        self.assertIn("KATA 4 - PIPELINE DE INDICADORES", output)
        self.assertIn("Total de pedidos por status", output)
        self.assertIn("Top 3 cidades por volume", output)
        self.assertIn("Pipeline concluido", output)

    def test_argument_parser_and_main_support_quiet_and_verbose_modes(self) -> None:
        parser = pipeline._build_argument_parser()
        args = parser.parse_args(["--quiet"])
        self.assertTrue(args.quiet)
        self.assertEqual(args.data_dir, pipeline.DATA_DIR)
        self.assertEqual(args.output_dir, pipeline.OUTPUT_DIR)

        indicators = {"total_orders_by_status": {}}
        with patch.object(pipeline, "run_pipeline", return_value=indicators) as run_mock, patch.object(
            pipeline, "print_summary"
        ) as summary_mock:
            exit_code = main(["--data-dir", "/tmp/data", "--output-dir", "/tmp/output"])

        self.assertEqual(exit_code, 0)
        run_mock.assert_called_once_with(Path("/tmp/data"), Path("/tmp/output"))
        summary_mock.assert_called_once_with(
            indicators,
            data_dir=Path("/tmp/data"),
            output_dir=Path("/tmp/output"),
        )

        with patch.object(pipeline, "run_pipeline", return_value=indicators) as run_mock, patch.object(
            pipeline, "print_summary"
        ) as summary_mock:
            exit_code = main(["--quiet"])

        self.assertEqual(exit_code, 0)
        run_mock.assert_called_once()
        summary_mock.assert_not_called()

    def test_module_branch_exits_zero(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            (data_dir / "pedidos.csv").write_text(
                "id_pedido,id_cliente,valor_total,status_pedido,data_pedido\n",
                encoding="utf-8",
            )
            (data_dir / "clientes.csv").write_text(
                "id_cliente,nome_cliente,cidade,estado\n",
                encoding="utf-8",
            )
            (data_dir / "entregas.csv").write_text(
                "id_pedido,data_prevista_entrega,data_realizada_entrega,status_entrega\n",
                encoding="utf-8",
            )

            pipeline_path = Path(pipeline.__file__).resolve()
            with patch.object(
                pipeline.argparse.ArgumentParser,
                "parse_args",
                return_value=types.SimpleNamespace(
                    data_dir=data_dir,
                    output_dir=output_dir,
                    quiet=True,
                ),
            ):
                with self.assertRaises(SystemExit) as raised:
                    runpy.run_path(str(pipeline_path), run_name="__main__")

        self.assertEqual(raised.exception.code, 0)


class PipelineIntegrationTests(unittest.TestCase):
    def test_pipeline_rejects_missing_required_fields(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            (data_dir / "pedidos.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,id_cliente,valor_total,status_pedido,data_pedido",
                        "P001,C001,120.50,pago,",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "clientes.csv").write_text(
                "id_cliente,nome_cliente,cidade,estado\n",
                encoding="utf-8",
            )
            (data_dir / "entregas.csv").write_text(
                "id_pedido,data_prevista_entrega,data_realizada_entrega,status_entrega\n",
                encoding="utf-8",
            )

            indicators = run_pipeline(data_dir, output_dir)

            self.assertEqual(indicators["rejected_row_count"], 1)
            self.assertEqual(indicators["rejected_rows"][0]["reason"], "data_pedido is required")

    def test_pipeline_accepts_empty_files_and_writes_zeroed_indicators(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            (data_dir / "pedidos.csv").write_text(
                "id_pedido,id_cliente,valor_total,status_pedido,data_pedido\n",
                encoding="utf-8",
            )
            (data_dir / "clientes.csv").write_text(
                "id_cliente,nome_cliente,cidade,estado\n",
                encoding="utf-8",
            )
            (data_dir / "entregas.csv").write_text(
                "id_pedido,data_prevista_entrega,data_realizada_entrega,status_entrega\n",
                encoding="utf-8",
            )

            indicators = run_pipeline(data_dir, output_dir)

            with (output_dir / "consolidated.csv").open(
                "r", encoding="utf-8", newline=""
            ) as file:
                rows = list(csv.DictReader(file))

            self.assertEqual(rows, [])
            self.assertEqual(indicators["rejected_row_count"], 0)
            self.assertEqual(indicators["orphan_delivery_count"], 0)
            self.assertEqual(indicators["top_3_cities_by_order_volume"], [])

    def test_pipeline_joins_data_and_writes_indicators(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            (data_dir / "pedidos.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,id_cliente,valor_total,status_pedido,data_pedido",
                        "P001,C001,\"120,50\",pago,20/04/2026",
                        "P002,C002,80.00,pendente,2026-04-19",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "clientes.csv").write_text(
                "\n".join(
                    [
                        "id_cliente,nome_cliente,cidade,estado",
                        "C001,Ana Silva,Caruaru,PE",
                        "C002,Bruno Lima,Maceió,AL",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "entregas.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,data_prevista_entrega,data_realizada_entrega,status_entrega",
                        "P001,2026-04-22,2026-04-22,entregue",
                        "P002,2026-04-22,2026-04-24,entregue",
                        "P999,2026-04-20,2026-04-21,entregue",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            indicators = run_pipeline(data_dir, output_dir)

            with (output_dir / "consolidated.csv").open(
                "r", encoding="utf-8", newline=""
            ) as file:
                rows = list(csv.DictReader(file))

            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["cidade_normalizada"], "Caruaru")
            self.assertEqual(rows[1]["atraso_dias"], "2")
            self.assertEqual(indicators["orphan_delivery_count"], 1)
            self.assertEqual(indicators["delivery_percentages"]["on_time"], 50.0)
            self.assertEqual(indicators["delivery_percentages"]["delayed"], 50.0)

            saved_indicators = json.loads((output_dir / "indicators.json").read_text())
            self.assertEqual(saved_indicators["orphan_delivery_ids"], ["P999"])

    def test_duplicate_ids_are_rejected_and_first_valid_row_wins(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            (data_dir / "pedidos.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,id_cliente,valor_total,status_pedido,data_pedido",
                        "P001,C001,100.00,pago,2026-04-20",
                        "P001,C001,200.00,pago,2026-04-21",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "clientes.csv").write_text(
                "\n".join(
                    [
                        "id_cliente,nome_cliente,cidade,estado",
                        "C001,Ana Silva,Recife,PE",
                        "C001,Ana Silva,Olinda,PE",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "entregas.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,data_prevista_entrega,data_realizada_entrega,status_entrega",
                        "P001,2026-04-22,2026-04-23,entregue",
                        "P001,2026-04-22,2026-04-24,entregue",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            indicators = run_pipeline(data_dir, output_dir)

            with (output_dir / "consolidated.csv").open(
                "r", encoding="utf-8", newline=""
            ) as file:
                rows = list(csv.DictReader(file))

            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["valor_total"], "100.00")
            self.assertEqual(rows[0]["cidade_normalizada"], "Recife")
            self.assertEqual(rows[0]["atraso_dias"], "1")
            self.assertEqual(indicators["rejected_row_count"], 3)
            self.assertTrue(
                any("Duplicate id_pedido: P001" == row["reason"] for row in indicators["rejected_rows"])
            )
            self.assertTrue(
                any("Duplicate id_cliente: C001" == row["reason"] for row in indicators["rejected_rows"])
            )

    def test_delivery_before_expected_date_is_negative_and_counts_as_on_time(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            (data_dir / "pedidos.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,id_cliente,valor_total,status_pedido,data_pedido",
                        "P001,C001,100.00,pago,2026-04-18",
                        "P002,C001,100.00,pago,2026-04-18",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "clientes.csv").write_text(
                "\n".join(
                    [
                        "id_cliente,nome_cliente,cidade,estado",
                        "C001,Ana Silva,Caruaru,PE",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "entregas.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,data_prevista_entrega,data_realizada_entrega,status_entrega",
                        "P001,2026-04-20,2026-04-19,entregue",
                        "P002,2026-04-22,2026-04-24,entregue",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            indicators = run_pipeline(data_dir, output_dir)

            with (output_dir / "consolidated.csv").open(
                "r", encoding="utf-8", newline=""
            ) as file:
                rows = {row["id_pedido"]: row for row in csv.DictReader(file)}

            self.assertEqual(rows["P001"]["atraso_dias"], "-1")
            self.assertEqual(rows["P002"]["atraso_dias"], "2")
            self.assertEqual(indicators["delivery_percentages"]["on_time"], 50.0)
            self.assertEqual(indicators["delivery_percentages"]["delayed"], 50.0)
            self.assertEqual(indicators["average_delay_days_for_delayed_orders"], 2.0)

    def test_pipeline_is_idempotent_for_same_input(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            (data_dir / "pedidos.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,id_cliente,valor_total,status_pedido,data_pedido",
                        "P001,C001,120.50,pago,2026-04-20",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "clientes.csv").write_text(
                "\n".join(
                    [
                        "id_cliente,nome_cliente,cidade,estado",
                        "C001,Ana Silva,Caruaru,PE",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )
            (data_dir / "entregas.csv").write_text(
                "\n".join(
                    [
                        "id_pedido,data_prevista_entrega,data_realizada_entrega,status_entrega",
                        "P001,2026-04-22,2026-04-22,entregue",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            first_indicators = run_pipeline(data_dir, output_dir)
            first_csv = (output_dir / "consolidated.csv").read_text(encoding="utf-8")
            first_json = (output_dir / "indicators.json").read_text(encoding="utf-8")

            second_indicators = run_pipeline(data_dir, output_dir)
            second_csv = (output_dir / "consolidated.csv").read_text(encoding="utf-8")
            second_json = (output_dir / "indicators.json").read_text(encoding="utf-8")

            self.assertEqual(first_indicators, second_indicators)
            self.assertEqual(first_csv, second_csv)
            self.assertEqual(first_json, second_json)


if __name__ == "__main__":
    unittest.main()
