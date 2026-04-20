from __future__ import annotations

import csv
import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from pipeline import normalize_city, normalize_date, parse_money, run_pipeline


class PipelineParsingTests(unittest.TestCase):
    def test_normalizes_supported_dates(self) -> None:
        self.assertEqual(str(normalize_date("20/04/2026")), "2026-04-20")
        self.assertEqual(str(normalize_date("2026-04-20")), "2026-04-20")
        self.assertEqual(str(normalize_date("2026-04-20T10:30:00")), "2026-04-20")

    def test_normalizes_money(self) -> None:
        self.assertEqual(parse_money("120,50"), Decimal("120.50"))
        self.assertEqual(parse_money("120.50"), Decimal("120.50"))
        self.assertEqual(parse_money("1.250,75"), Decimal("1250.75"))

    def test_normalizes_city(self) -> None:
        self.assertEqual(normalize_city(" Maceió "), "Maceio")
        self.assertEqual(normalize_city("sao   paulo"), "Sao Paulo")


class PipelineIntegrationTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
