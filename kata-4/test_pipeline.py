from __future__ import annotations

import contextlib
import csv
import io
import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import pipeline
from pipeline import (
    Delivery,
    MAX_REJECTED_IN_JSON,
    _SummaryRenderer,
    build_consolidated_rows,
    calculate_delay,
    format_money,
    main,
    normalize_city,
    normalize_date,
    parse_money,
    require,
    run_pipeline,
)


class PipelineParsingTests(unittest.TestCase):
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

    def test_parse_money_is_round_trip_stable(self) -> None:
        samples = ["0.00", "1.00", "120.50", "1250.75", "999999.99", "0,01", "1.250,75"]
        for raw in samples:
            parsed = parse_money(raw)
            formatted = format_money(parsed)
            reparsed = parse_money(formatted)
            self.assertEqual(parsed, reparsed, msg=f"round-trip diverged for {raw!r}")
            self.assertEqual(format_money(reparsed), formatted)

    def test_normalizes_city(self) -> None:
        self.assertEqual(normalize_city(" Maceió "), "Maceio")
        self.assertEqual(normalize_city("sao   paulo"), "Sao Paulo")

    def test_normalize_city_is_idempotent(self) -> None:
        samples = [" São Paulo ", "sao paulo", "SAO   PAULO", "Maceió", "  recife  "]
        for raw in samples:
            once = normalize_city(raw)
            twice = normalize_city(once)
            self.assertEqual(once, twice, msg=f"not idempotent for {raw!r}")

    def test_city_and_required_field_reject_blank_values(self) -> None:
        with self.assertRaises(ValueError):
            normalize_city(" ")
        with self.assertRaises(ValueError):
            require({}, "id_pedido")
        with self.assertRaises(ValueError):
            pipeline.require_any({}, "status", "status_pedido")

    def test_alias_helpers_accept_prompt_and_legacy_headers(self) -> None:
        self.assertEqual(
            pipeline.require_any({"status_pedido": " pago "}, "status", "status_pedido"),
            "pago",
        )
        self.assertEqual(
            pipeline.optional_any(
                {"data_prevista_entrega": "2026-04-22"},
                "data_prevista",
                "data_prevista_entrega",
            ),
            "2026-04-22",
        )


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
        self.assertEqual(rows[0].status_entrega, "sem_entrega")
        self.assertIsNone(rows[0].data_prevista_entrega)
        self.assertIsNone(rows[0].data_realizada_entrega)
        self.assertIsNone(rows[0].atraso_dias)
        self.assertEqual(rows[0].valor_total, Decimal("100.00"))
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

    def test_consolidated_order_serializes_to_csv_row(self) -> None:
        consolidated = pipeline.ConsolidatedOrder(
            id_pedido="P001",
            nome_cliente="Ana",
            cidade_normalizada="Caruaru",
            estado="PE",
            valor_total=Decimal("120.50"),
            status_pedido="pago",
            data_pedido=pipeline.date(2026, 4, 20),
            data_prevista_entrega=pipeline.date(2026, 4, 22),
            data_realizada_entrega=pipeline.date(2026, 4, 22),
            atraso_dias=0,
            status_entrega="entregue",
        )

        row = consolidated.as_csv_row()

        self.assertEqual(row["valor_total"], "120.50")
        self.assertEqual(row["data_pedido"], "2026-04-20")
        self.assertEqual(row["atraso_dias"], "0")

    def test_summary_renderer_and_print_summary_emit_human_readable_sections(self) -> None:
        indicators = {
            "total_orders_by_status": {"pago": 2},
            "average_ticket_by_state": {"PE": "100.00"},
            "delivery_percentages": {"on_time": 50.0, "delayed": 50.0},
            "delivered_without_expected_date": 1,
            "top_3_cities_by_order_volume": [{"city": "Caruaru", "orders": 2}],
            "average_delay_days_for_delayed_orders": 2.0,
            "orphan_delivery_count": 1,
            "orphan_delivery_ids": ["P999"],
            "rejected_row_count": 75,
            "rejected_rows": [],
            "rejected_rows_truncated": True,
        }

        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            _SummaryRenderer(
                indicators=indicators,
                data_dir=Path("/tmp/data"),
                output_dir=Path("/tmp/output"),
            ).render()
            pipeline.print_summary(
                indicators, data_dir=Path("/tmp/data"), output_dir=Path("/tmp/output")
            )

        output = stream.getvalue()
        self.assertIn("KATA 4 - PIPELINE DE INDICADORES", output)
        self.assertIn("Total de pedidos por status", output)
        self.assertIn("Top 3 cidades por volume", output)
        self.assertIn("Pipeline concluido", output)
        self.assertIn("sem prazo", output)
        self.assertIn("amostra no JSON", output)

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


class PipelineIntegrationTests(unittest.TestCase):
    def _write_csv_set(
        self,
        data_dir: Path,
        *,
        pedidos: list[str],
        clientes: list[str],
        entregas: list[str],
    ) -> None:
        data_dir.mkdir(parents=True, exist_ok=True)
        (data_dir / "pedidos.csv").write_text("\n".join(pedidos) + "\n", encoding="utf-8")
        (data_dir / "clientes.csv").write_text("\n".join(clientes) + "\n", encoding="utf-8")
        (data_dir / "entregas.csv").write_text("\n".join(entregas) + "\n", encoding="utf-8")

    def test_pipeline_rejects_missing_required_fields(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"

            self._write_csv_set(
                data_dir,
                pedidos=[
                    "id_pedido,data_pedido,id_cliente,valor_total,status",
                    "P001,,C001,120.50,pago",
                ],
                clientes=["id_cliente,nome,cidade,estado,data_cadastro"],
                entregas=["id_entrega,id_pedido,data_prevista,data_realizada,status_entrega"],
            )

            indicators = run_pipeline(data_dir, output_dir)

            self.assertEqual(indicators["rejected_row_count"], 1)
            self.assertEqual(indicators["rejected_rows"][0]["reason"], "data_pedido is required")
            self.assertFalse(indicators["rejected_rows_truncated"])

            rejected_path = output_dir / "rejected.csv"
            self.assertTrue(rejected_path.exists())

    def test_pipeline_accepts_empty_files_and_writes_zeroed_indicators(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"

            self._write_csv_set(
                data_dir,
                pedidos=["id_pedido,data_pedido,id_cliente,valor_total,status"],
                clientes=["id_cliente,nome,cidade,estado,data_cadastro"],
                entregas=["id_entrega,id_pedido,data_prevista,data_realizada,status_entrega"],
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
            self.assertFalse((output_dir / "rejected.csv").exists())

    def test_pipeline_joins_data_and_writes_indicators(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"

            self._write_csv_set(
                data_dir,
                pedidos=[
                    "id_pedido,data_pedido,id_cliente,valor_total,status",
                    "P001,20/04/2026,C001,\"120,50\",pago",
                    "P002,2026-04-19,C002,80.00,pendente",
                ],
                clientes=[
                    "id_cliente,nome,cidade,estado,data_cadastro",
                    "C001,Ana Silva,Caruaru,PE,2024-01-10",
                    "C002,Bruno Lima,Maceió,AL,2024-02-15",
                ],
                entregas=[
                    "id_entrega,id_pedido,data_prevista,data_realizada,status_entrega",
                    "E001,P001,2026-04-22,2026-04-22,entregue",
                    "E002,P002,2026-04-22,2026-04-24,entregue",
                    "E999,P999,2026-04-20,2026-04-21,entregue",
                ],
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

            self._write_csv_set(
                data_dir,
                pedidos=[
                    "id_pedido,data_pedido,id_cliente,valor_total,status",
                    "P001,2026-04-20,C001,100.00,pago",
                    "P001,2026-04-21,C001,200.00,pago",
                ],
                clientes=[
                    "id_cliente,nome,cidade,estado,data_cadastro",
                    "C001,Ana Silva,Recife,PE,2024-01-10",
                    "C001,Ana Silva,Olinda,PE,2024-01-11",
                ],
                entregas=[
                    "id_entrega,id_pedido,data_prevista,data_realizada,status_entrega",
                    "E001,P001,2026-04-22,2026-04-23,entregue",
                    "E002,P001,2026-04-22,2026-04-24,entregue",
                ],
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

            self._write_csv_set(
                data_dir,
                pedidos=[
                    "id_pedido,data_pedido,id_cliente,valor_total,status",
                    "P001,2026-04-18,C001,100.00,pago",
                    "P002,2026-04-18,C001,100.00,pago",
                ],
                clientes=[
                    "id_cliente,nome,cidade,estado,data_cadastro",
                    "C001,Ana Silva,Caruaru,PE,2024-01-10",
                ],
                entregas=[
                    "id_entrega,id_pedido,data_prevista,data_realizada,status_entrega",
                    "E001,P001,2026-04-20,2026-04-19,entregue",
                    "E002,P002,2026-04-22,2026-04-24,entregue",
                ],
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

    def test_delivered_without_expected_date_is_excluded_from_ratio(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"

            self._write_csv_set(
                data_dir,
                pedidos=[
                    "id_pedido,data_pedido,id_cliente,valor_total,status",
                    "P001,2026-04-18,C001,100.00,pago",
                    "P002,2026-04-18,C001,100.00,pago",
                    "P003,2026-04-18,C001,100.00,pago",
                ],
                clientes=[
                    "id_cliente,nome,cidade,estado,data_cadastro",
                    "C001,Ana Silva,Caruaru,PE,2024-01-10",
                ],
                entregas=[
                    "id_entrega,id_pedido,data_prevista,data_realizada,status_entrega",
                    "E001,P001,2026-04-20,2026-04-20,entregue",
                    "E002,P002,2026-04-22,2026-04-25,entregue",
                    "E003,P003,,2026-04-24,entregue",
                ],
            )

            indicators = run_pipeline(data_dir, output_dir)

            self.assertEqual(indicators["delivery_percentages"]["on_time"], 50.0)
            self.assertEqual(indicators["delivery_percentages"]["delayed"], 50.0)
            self.assertEqual(indicators["delivered_without_expected_date"], 1)

    def test_rejected_overflow_truncates_json_and_writes_full_csv(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"

            pedidos = ["id_pedido,data_pedido,id_cliente,valor_total,status"]
            total_rejected = MAX_REJECTED_IN_JSON + 10
            for i in range(total_rejected):
                pedidos.append(f"P{i:03d},invalid-date,C001,100.00,pago")

            self._write_csv_set(
                data_dir,
                pedidos=pedidos,
                clientes=[
                    "id_cliente,nome,cidade,estado,data_cadastro",
                    "C001,Ana,Recife,PE,2024-01-10",
                ],
                entregas=["id_entrega,id_pedido,data_prevista,data_realizada,status_entrega"],
            )

            indicators = run_pipeline(data_dir, output_dir)

            self.assertEqual(indicators["rejected_row_count"], total_rejected)
            self.assertEqual(len(indicators["rejected_rows"]), MAX_REJECTED_IN_JSON)
            self.assertTrue(indicators["rejected_rows_truncated"])

            with (output_dir / "rejected.csv").open(
                "r", encoding="utf-8", newline=""
            ) as file:
                full_rejected = list(csv.DictReader(file))
            self.assertEqual(len(full_rejected), total_rejected)

    def test_rejected_file_is_removed_when_no_rejections(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            output_dir.mkdir(parents=True)

            stale = output_dir / "rejected.csv"
            stale.write_text("file,row,reason\npedidos.csv,2,stale\n", encoding="utf-8")

            self._write_csv_set(
                data_dir,
                pedidos=["id_pedido,data_pedido,id_cliente,valor_total,status"],
                clientes=["id_cliente,nome,cidade,estado,data_cadastro"],
                entregas=["id_entrega,id_pedido,data_prevista,data_realizada,status_entrega"],
            )

            run_pipeline(data_dir, output_dir)

            self.assertFalse(stale.exists())

    def test_missing_input_file_raises_file_not_found(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()
            (data_dir / "pedidos.csv").write_text(
                "id_pedido,data_pedido,id_cliente,valor_total,status\n",
                encoding="utf-8",
            )

            with self.assertRaises(FileNotFoundError) as ctx:
                run_pipeline(data_dir, output_dir)

            self.assertIn("clientes.csv", str(ctx.exception))

    def test_main_returns_nonzero_when_input_file_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"
            data_dir.mkdir()

            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                exit_code = main(
                    [
                        "--data-dir",
                        str(data_dir),
                        "--output-dir",
                        str(output_dir),
                        "--quiet",
                    ]
                )

            self.assertEqual(exit_code, 2)
            self.assertIn("nao encontrado", stderr.getvalue())

    def test_pipeline_is_idempotent_for_same_input(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "data"
            output_dir = root / "output"

            self._write_csv_set(
                data_dir,
                pedidos=[
                    "id_pedido,data_pedido,id_cliente,valor_total,status",
                    "P001,2026-04-20,C001,120.50,pago",
                ],
                clientes=[
                    "id_cliente,nome,cidade,estado,data_cadastro",
                    "C001,Ana Silva,Caruaru,PE,2024-01-10",
                ],
                entregas=[
                    "id_entrega,id_pedido,data_prevista,data_realizada,status_entrega",
                    "E001,P001,2026-04-22,2026-04-22,entregue",
                ],
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
