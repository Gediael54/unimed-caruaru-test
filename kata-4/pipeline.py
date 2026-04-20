"""Deterministic CSV reporting pipeline for Kata 4."""

from __future__ import annotations

import csv
import json
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Iterable


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"

CONSOLIDATED_COLUMNS = [
    "id_pedido",
    "nome_cliente",
    "cidade_normalizada",
    "estado",
    "valor_total",
    "status_pedido",
    "data_pedido",
    "data_prevista_entrega",
    "data_realizada_entrega",
    "atraso_dias",
    "status_entrega",
]


@dataclass(frozen=True)
class Order:
    id_pedido: str
    id_cliente: str
    valor_total: Decimal
    status_pedido: str
    data_pedido: date


@dataclass(frozen=True)
class Customer:
    id_cliente: str
    nome_cliente: str
    cidade_normalizada: str
    estado: str


@dataclass(frozen=True)
class Delivery:
    id_pedido: str
    data_prevista_entrega: date | None
    data_realizada_entrega: date | None
    status_entrega: str


def normalize_date(value: str | None) -> date | None:
    if value is None or not value.strip():
        return None

    clean_value = value.strip()
    formats = ("%d/%m/%Y", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S")
    for date_format in formats:
        try:
            return datetime.strptime(clean_value[:19], date_format).date()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(clean_value).date()
    except ValueError as exc:
        raise ValueError(f"Invalid date: {value}") from exc


def parse_money(value: str | None) -> Decimal:
    if value is None or not value.strip():
        raise ValueError("Money value is required")

    clean_value = value.strip()
    if "," in clean_value and "." in clean_value:
        normalized = clean_value.replace(".", "").replace(",", ".")
    elif "," in clean_value:
        normalized = clean_value.replace(",", ".")
    else:
        normalized = clean_value

    try:
        return Decimal(normalized).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except InvalidOperation as exc:
        raise ValueError(f"Invalid money value: {value}") from exc


def format_money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def normalize_city(value: str | None) -> str:
    if value is None or not value.strip():
        raise ValueError("City is required")

    without_accents = unicodedata.normalize("NFKD", value.strip())
    ascii_city = "".join(
        character for character in without_accents if not unicodedata.combining(character)
    )
    return " ".join(ascii_city.split()).title()


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


def require(row: dict[str, str], field: str) -> str:
    value = row.get(field, "")
    if not value.strip():
        raise ValueError(f"{field} is required")
    return value.strip()


def load_orders(path: Path) -> tuple[list[Order], list[dict[str, str]]]:
    orders: list[Order] = []
    rejected: list[dict[str, str]] = []

    for row_number, row in enumerate(read_csv(path), start=2):
        try:
            parsed_date = normalize_date(require(row, "data_pedido"))
            if parsed_date is None:
                raise ValueError("data_pedido is required")
            orders.append(
                Order(
                    id_pedido=require(row, "id_pedido"),
                    id_cliente=require(row, "id_cliente"),
                    valor_total=parse_money(require(row, "valor_total")),
                    status_pedido=require(row, "status_pedido").lower(),
                    data_pedido=parsed_date,
                )
            )
        except ValueError as exc:
            rejected.append(
                {"file": path.name, "row": str(row_number), "reason": str(exc)}
            )

    return orders, rejected


def load_customers(path: Path) -> tuple[dict[str, Customer], list[dict[str, str]]]:
    customers: dict[str, Customer] = {}
    rejected: list[dict[str, str]] = []

    for row_number, row in enumerate(read_csv(path), start=2):
        try:
            id_cliente = require(row, "id_cliente")
            customers[id_cliente] = Customer(
                id_cliente=id_cliente,
                nome_cliente=require(row, "nome_cliente"),
                cidade_normalizada=normalize_city(require(row, "cidade")),
                estado=require(row, "estado").upper(),
            )
        except ValueError as exc:
            rejected.append(
                {"file": path.name, "row": str(row_number), "reason": str(exc)}
            )

    return customers, rejected


def load_deliveries(path: Path) -> tuple[dict[str, Delivery], list[dict[str, str]]]:
    deliveries: dict[str, Delivery] = {}
    rejected: list[dict[str, str]] = []

    for row_number, row in enumerate(read_csv(path), start=2):
        try:
            id_pedido = require(row, "id_pedido")
            deliveries[id_pedido] = Delivery(
                id_pedido=id_pedido,
                data_prevista_entrega=normalize_date(row.get("data_prevista_entrega")),
                data_realizada_entrega=normalize_date(row.get("data_realizada_entrega")),
                status_entrega=(row.get("status_entrega") or "sem_entrega").strip().lower(),
            )
        except ValueError as exc:
            rejected.append(
                {"file": path.name, "row": str(row_number), "reason": str(exc)}
            )

    return deliveries, rejected


def calculate_delay(delivery: Delivery | None) -> int | None:
    if (
        delivery is None
        or delivery.data_prevista_entrega is None
        or delivery.data_realizada_entrega is None
    ):
        return None

    return max((delivery.data_realizada_entrega - delivery.data_prevista_entrega).days, 0)


def build_consolidated_rows(
    orders: Iterable[Order],
    customers: dict[str, Customer],
    deliveries: dict[str, Delivery],
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    rows: list[dict[str, str]] = []
    rejected: list[dict[str, str]] = []

    for order in sorted(orders, key=lambda item: item.id_pedido):
        customer = customers.get(order.id_cliente)
        if customer is None:
            rejected.append(
                {
                    "file": "pedidos.csv",
                    "row": order.id_pedido,
                    "reason": f"Missing customer {order.id_cliente}",
                }
            )
            continue

        delivery = deliveries.get(order.id_pedido)
        delay = calculate_delay(delivery)
        rows.append(
            {
                "id_pedido": order.id_pedido,
                "nome_cliente": customer.nome_cliente,
                "cidade_normalizada": customer.cidade_normalizada,
                "estado": customer.estado,
                "valor_total": format_money(order.valor_total),
                "status_pedido": order.status_pedido,
                "data_pedido": order.data_pedido.isoformat(),
                "data_prevista_entrega": (
                    delivery.data_prevista_entrega.isoformat()
                    if delivery and delivery.data_prevista_entrega
                    else ""
                ),
                "data_realizada_entrega": (
                    delivery.data_realizada_entrega.isoformat()
                    if delivery and delivery.data_realizada_entrega
                    else ""
                ),
                "atraso_dias": "" if delay is None else str(delay),
                "status_entrega": delivery.status_entrega if delivery else "sem_entrega",
            }
        )

    return rows, rejected


def calculate_indicators(
    rows: list[dict[str, str]],
    orders: list[Order],
    deliveries: dict[str, Delivery],
    rejected_rows: list[dict[str, str]],
) -> dict[str, object]:
    status_counter = Counter(row["status_pedido"] for row in rows)
    city_counter = Counter(row["cidade_normalizada"] for row in rows)

    state_totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    state_counts: Counter[str] = Counter()
    for row in rows:
        state = row["estado"]
        state_totals[state] += Decimal(row["valor_total"])
        state_counts[state] += 1

    delivered_rows = [row for row in rows if row["data_realizada_entrega"]]
    delayed_rows = [row for row in delivered_rows if int(row["atraso_dias"] or "0") > 0]
    on_time_rows = [row for row in delivered_rows if int(row["atraso_dias"] or "0") == 0]
    delivered_count = len(delivered_rows)

    order_ids = {order.id_pedido for order in orders}
    orphan_deliveries = sorted(
        delivery_id for delivery_id in deliveries if delivery_id not in order_ids
    )

    average_delay = (
        sum(int(row["atraso_dias"]) for row in delayed_rows) / len(delayed_rows)
        if delayed_rows
        else 0
    )

    return {
        "total_orders_by_status": dict(sorted(status_counter.items())),
        "average_ticket_by_state": {
            state: format_money(state_totals[state] / state_counts[state])
            for state in sorted(state_totals)
        },
        "delivery_percentages": {
            "on_time": round((len(on_time_rows) / delivered_count) * 100, 2)
            if delivered_count
            else 0,
            "delayed": round((len(delayed_rows) / delivered_count) * 100, 2)
            if delivered_count
            else 0,
        },
        "top_3_cities_by_order_volume": [
            {"city": city, "orders": count}
            for city, count in city_counter.most_common(3)
        ],
        "average_delay_days_for_delayed_orders": round(average_delay, 2),
        "orphan_delivery_count": len(orphan_deliveries),
        "orphan_delivery_ids": orphan_deliveries,
        "rejected_row_count": len(rejected_rows),
        "rejected_rows": rejected_rows,
    }


def write_consolidated(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CONSOLIDATED_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def write_indicators(path: Path, indicators: dict[str, object]) -> None:
    path.write_text(
        json.dumps(indicators, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def run_pipeline(data_dir: Path = DATA_DIR, output_dir: Path = OUTPUT_DIR) -> dict[str, object]:
    orders, rejected_orders = load_orders(data_dir / "pedidos.csv")
    customers, rejected_customers = load_customers(data_dir / "clientes.csv")
    deliveries, rejected_deliveries = load_deliveries(data_dir / "entregas.csv")

    rows, rejected_join_rows = build_consolidated_rows(orders, customers, deliveries)
    rejected_rows = rejected_orders + rejected_customers + rejected_deliveries + rejected_join_rows
    indicators = calculate_indicators(rows, orders, deliveries, rejected_rows)

    output_dir.mkdir(parents=True, exist_ok=True)
    write_consolidated(output_dir / "consolidated.csv", rows)
    write_indicators(output_dir / "indicators.json", indicators)

    return indicators


if __name__ == "__main__":
    run_pipeline()
