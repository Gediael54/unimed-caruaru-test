from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Iterable, Sequence


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"

REPORT_WIDTH = 66
MAX_REJECTED_IN_JSON = 50


class _Theme:
    def header(self, text: str) -> str:
        raise NotImplementedError

    def muted(self, text: str) -> str:
        raise NotImplementedError

    def success(self, text: str) -> str:
        raise NotImplementedError

    def info(self, text: str) -> str:
        raise NotImplementedError


class _AnsiTheme(_Theme):
    def _wrap(self, text: str, code: str) -> str:
        return f"\033[{code}m{text}\033[0m"

    def header(self, text: str) -> str:
        return self._wrap(text, "1;38;5;29")

    def muted(self, text: str) -> str:
        return self._wrap(text, "2")

    def success(self, text: str) -> str:
        return self._wrap(text, "32")

    def info(self, text: str) -> str:
        return self._wrap(text, "36")


class _PlainTheme(_Theme):
    def header(self, text: str) -> str:
        return text

    def muted(self, text: str) -> str:
        return text

    def success(self, text: str) -> str:
        return text

    def info(self, text: str) -> str:
        return text


def _color_is_supported() -> bool:
    return (
        sys.stdout.isatty()
        and os.environ.get("NO_COLOR") is None
        and os.environ.get("TERM", "") not in ("", "dumb")
    )


def _pick_theme() -> _Theme:
    return _AnsiTheme() if _color_is_supported() else _PlainTheme()


theme = _pick_theme()

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

REJECTED_COLUMNS = ["file", "row", "reason"]

REQUIRED_INPUT_FILES = ("pedidos.csv", "clientes.csv", "entregas.csv")


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


@dataclass(frozen=True)
class ConsolidatedOrder:
    id_pedido: str
    nome_cliente: str
    cidade_normalizada: str
    estado: str
    valor_total: Decimal
    status_pedido: str
    data_pedido: date
    data_prevista_entrega: date | None
    data_realizada_entrega: date | None
    atraso_dias: int | None
    status_entrega: str

    def as_csv_row(self) -> dict[str, str]:
        return {
            "id_pedido": self.id_pedido,
            "nome_cliente": self.nome_cliente,
            "cidade_normalizada": self.cidade_normalizada,
            "estado": self.estado,
            "valor_total": format_money(self.valor_total),
            "status_pedido": self.status_pedido,
            "data_pedido": self.data_pedido.isoformat(),
            "data_prevista_entrega": (
                self.data_prevista_entrega.isoformat() if self.data_prevista_entrega else ""
            ),
            "data_realizada_entrega": (
                self.data_realizada_entrega.isoformat() if self.data_realizada_entrega else ""
            ),
            "atraso_dias": "" if self.atraso_dias is None else str(self.atraso_dias),
            "status_entrega": self.status_entrega,
        }


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

    clean_value = "".join(value.strip().split())
    if "," in clean_value and "." in clean_value:
        comma_position = clean_value.rfind(",")
        dot_position = clean_value.rfind(".")
        decimal_separator = "," if comma_position > dot_position else "."
        thousands_separator = "." if decimal_separator == "," else ","
        normalized = clean_value.replace(thousands_separator, "").replace(decimal_separator, ".")
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


def require_any(row: dict[str, str], *fields: str) -> str:
    for field in fields:
        value = row.get(field)
        if value is not None and value.strip():
            return value.strip()
    raise ValueError(f"{fields[0]} is required")


def normalize_delivery_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    return normalized or "sem_entrega"


def optional_any(row: dict[str, str], *fields: str) -> str:
    for field in fields:
        value = row.get(field)
        if value is not None and value.strip():
            return value.strip()
    return ""


def load_orders(path: Path) -> tuple[list[Order], list[dict[str, str]]]:
    orders: list[Order] = []
    rejected: list[dict[str, str]] = []
    seen_order_ids: set[str] = set()

    for row_number, row in enumerate(read_csv(path), start=2):
        try:
            order_id = require(row, "id_pedido")
            parsed_date = normalize_date(row.get("data_pedido"))
            if parsed_date is None:
                raise ValueError("data_pedido is required")
            if order_id in seen_order_ids:
                raise ValueError(f"Duplicate id_pedido: {order_id}")

            orders.append(
                Order(
                    id_pedido=order_id,
                    id_cliente=require(row, "id_cliente"),
                    valor_total=parse_money(require(row, "valor_total")),
                    status_pedido=require_any(row, "status", "status_pedido").lower(),
                    data_pedido=parsed_date,
                )
            )
            seen_order_ids.add(order_id)
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
            if id_cliente in customers:
                raise ValueError(f"Duplicate id_cliente: {id_cliente}")

            customers[id_cliente] = Customer(
                id_cliente=id_cliente,
                nome_cliente=require_any(row, "nome", "nome_cliente"),
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
            if id_pedido in deliveries:
                raise ValueError(f"Duplicate id_pedido: {id_pedido}")

            deliveries[id_pedido] = Delivery(
                id_pedido=id_pedido,
                data_prevista_entrega=normalize_date(
                    optional_any(row, "data_prevista", "data_prevista_entrega")
                ),
                data_realizada_entrega=normalize_date(
                    optional_any(row, "data_realizada", "data_realizada_entrega")
                ),
                status_entrega=normalize_delivery_status(row.get("status_entrega")),
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

    return (delivery.data_realizada_entrega - delivery.data_prevista_entrega).days


def build_consolidated_rows(
    orders: Iterable[Order],
    customers: dict[str, Customer],
    deliveries: dict[str, Delivery],
) -> tuple[list[ConsolidatedOrder], list[dict[str, str]]]:
    rows: list[ConsolidatedOrder] = []
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
        rows.append(
            ConsolidatedOrder(
                id_pedido=order.id_pedido,
                nome_cliente=customer.nome_cliente,
                cidade_normalizada=customer.cidade_normalizada,
                estado=customer.estado,
                valor_total=order.valor_total,
                status_pedido=order.status_pedido,
                data_pedido=order.data_pedido,
                data_prevista_entrega=(
                    delivery.data_prevista_entrega if delivery else None
                ),
                data_realizada_entrega=(
                    delivery.data_realizada_entrega if delivery else None
                ),
                atraso_dias=calculate_delay(delivery),
                status_entrega=delivery.status_entrega if delivery else "sem_entrega",
            )
        )

    return rows, rejected


def calculate_indicators(
    rows: list[ConsolidatedOrder],
    order_ids: set[str],
    deliveries: dict[str, Delivery],
    rejected_rows: list[dict[str, str]],
) -> dict[str, object]:
    status_counter = Counter(row.status_pedido for row in rows)
    city_counter = Counter(row.cidade_normalizada for row in rows)

    state_totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    state_counts: Counter[str] = Counter()
    for row in rows:
        state_totals[row.estado] += row.valor_total
        state_counts[row.estado] += 1

    delivered_rows = [
        row
        for row in rows
        if row.status_pedido != "cancelado"
        and row.status_entrega == "entregue"
        and row.data_realizada_entrega is not None
    ]
    rated_rows = [row for row in delivered_rows if row.atraso_dias is not None]
    delayed_rows = [row for row in rated_rows if row.atraso_dias > 0]
    on_time_rows = [row for row in rated_rows if row.atraso_dias <= 0]
    rated_count = len(rated_rows)

    orphan_deliveries = sorted(
        delivery_id for delivery_id in deliveries if delivery_id not in order_ids
    )

    average_delay = (
        sum(row.atraso_dias for row in delayed_rows) / len(delayed_rows)
        if delayed_rows
        else 0
    )

    rejected_total = len(rejected_rows)
    rejected_truncated = rejected_total > MAX_REJECTED_IN_JSON

    return {
        "total_orders_by_status": dict(sorted(status_counter.items())),
        "average_ticket_by_state": {
            state: format_money(state_totals[state] / state_counts[state])
            for state in sorted(state_totals)
        },
        "delivery_percentages": {
            "on_time": round((len(on_time_rows) / rated_count) * 100, 2)
            if rated_count
            else 0,
            "delayed": round((len(delayed_rows) / rated_count) * 100, 2)
            if rated_count
            else 0,
        },
        "delivered_without_expected_date": len(delivered_rows) - rated_count,
        "top_3_cities_by_order_volume": [
            {"city": city, "orders": count}
            for city, count in city_counter.most_common(3)
        ],
        "average_delay_days_for_delayed_orders": round(average_delay, 2),
        "orphan_delivery_count": len(orphan_deliveries),
        "orphan_delivery_ids": orphan_deliveries,
        "rejected_row_count": rejected_total,
        "rejected_rows": rejected_rows[:MAX_REJECTED_IN_JSON],
        "rejected_rows_truncated": rejected_truncated,
    }


def write_consolidated(path: Path, rows: list[ConsolidatedOrder]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CONSOLIDATED_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(row.as_csv_row() for row in rows)


def write_rejected(path: Path, rejected: list[dict[str, str]]) -> None:
    if not rejected:
        if path.exists():
            path.unlink()
        return

    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=REJECTED_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rejected)


def write_indicators(path: Path, indicators: dict[str, object]) -> None:
    path.write_text(
        json.dumps(indicators, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _check_inputs(data_dir: Path) -> None:
    for required_file in REQUIRED_INPUT_FILES:
        path = data_dir / required_file
        if not path.exists():
            raise FileNotFoundError(f"arquivo de entrada nao encontrado: {path}")


def run_pipeline(data_dir: Path = DATA_DIR, output_dir: Path = OUTPUT_DIR) -> dict[str, object]:
    _check_inputs(data_dir)

    orders, rejected_orders = load_orders(data_dir / "pedidos.csv")
    customers, rejected_customers = load_customers(data_dir / "clientes.csv")
    deliveries, rejected_deliveries = load_deliveries(data_dir / "entregas.csv")

    rows, rejected_join_rows = build_consolidated_rows(orders, customers, deliveries)
    rejected_rows = (
        rejected_orders + rejected_customers + rejected_deliveries + rejected_join_rows
    )
    order_ids = {order.id_pedido for order in orders}
    indicators = calculate_indicators(rows, order_ids, deliveries, rejected_rows)

    output_dir.mkdir(parents=True, exist_ok=True)
    write_consolidated(output_dir / "consolidated.csv", rows)
    write_rejected(output_dir / "rejected.csv", rejected_rows)
    write_indicators(output_dir / "indicators.json", indicators)

    return indicators


def _print_separator(text: str) -> None:
    print(theme.muted(text))


def _print_heading(title: str) -> None:
    print(f"  {theme.header(title)}")


def _print_path_line(label: str, value: Path | str) -> None:
    print(f"  {theme.muted(label)}    {value}")


@dataclass(frozen=True)
class _SummaryRenderer:
    indicators: dict[str, object]
    data_dir: Path
    output_dir: Path

    def render(self) -> None:
        print()
        self._print_banner()
        self._print_metadata()
        self._print_status_totals()
        self._print_state_tickets()
        self._print_deliveries()
        self._print_top_cities()
        self._print_quality()
        self._print_footer()
        print()

    def _print_banner(self) -> None:
        sep = "=" * REPORT_WIDTH
        print(theme.header(sep))
        print(theme.header("  KATA 4 - PIPELINE DE INDICADORES"))
        print(theme.header(sep))

    def _print_metadata(self) -> None:
        _print_path_line("Entrada", self.data_dir)
        _print_path_line("Saida", self.output_dir)
        _print_path_line("Gerados", "consolidated.csv, indicators.json, rejected.csv")
        _print_separator("-" * REPORT_WIDTH)

    def _print_status_totals(self) -> None:
        _print_heading("Total de pedidos por status")
        for status, count in self.indicators["total_orders_by_status"].items():
            print(f"    {status:<12} {count}")
        print()

    def _print_state_tickets(self) -> None:
        _print_heading("Ticket medio por estado")
        for state, ticket in self.indicators["average_ticket_by_state"].items():
            print(f"    {state:<4} R$ {ticket}")
        print()

    def _print_deliveries(self) -> None:
        _print_heading("Entregas")
        percentages = self.indicators["delivery_percentages"]
        print(f"    {theme.success('no prazo')}   {percentages['on_time']}%")
        print(f"    com atraso  {percentages['delayed']}%")
        without_sla = self.indicators.get("delivered_without_expected_date", 0)
        if without_sla:
            print(f"    sem prazo   {without_sla}")
        print(
            f"    atraso medio (dias) {self.indicators['average_delay_days_for_delayed_orders']}"
        )
        print()

    def _print_top_cities(self) -> None:
        _print_heading("Top 3 cidades por volume")
        for idx, entry in enumerate(self.indicators["top_3_cities_by_order_volume"], start=1):
            print(f"    {idx}. {entry['city']:<16} {entry['orders']} pedido(s)")
        print()

    def _print_quality(self) -> None:
        _print_heading("Qualidade dos dados")
        print(f"    entregas orfas   {self.indicators['orphan_delivery_count']}")
        print(f"    linhas rejeitadas {self.indicators['rejected_row_count']}")
        if self.indicators.get("rejected_rows_truncated"):
            print(
                f"    amostra no JSON  primeiras {MAX_REJECTED_IN_JSON} "
                f"(lista completa em rejected.csv)"
            )

    def _print_footer(self) -> None:
        consolidated_path = self.output_dir / "consolidated.csv"
        indicators_path = self.output_dir / "indicators.json"
        footer_lines = [
            theme.success("[OK] Pipeline concluido."),
            theme.info(f"Consolidado completo em: {consolidated_path}"),
            theme.info(f"Indicadores em:          {indicators_path}"),
        ]
        _print_separator("-" * REPORT_WIDTH)
        for line in footer_lines:
            print(f"  {line}")


def print_summary(
    indicators: dict[str, object],
    *,
    data_dir: Path = DATA_DIR,
    output_dir: Path = OUTPUT_DIR,
) -> None:
    _SummaryRenderer(
        indicators=indicators,
        data_dir=data_dir,
        output_dir=output_dir,
    ).render()


def _build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pipeline",
        description="Kata 4 - pipeline de indicadores a partir de pedidos, clientes e entregas.",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DATA_DIR,
        help="Diretorio com pedidos.csv, clientes.csv e entregas.csv (default: kata-4/data).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=OUTPUT_DIR,
        help="Diretorio de saida para consolidated.csv e indicators.json (default: kata-4/output).",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Nao imprime o resumo no terminal.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_argument_parser().parse_args(argv)
    try:
        indicators = run_pipeline(args.data_dir, args.output_dir)
    except FileNotFoundError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2

    if not args.quiet:
        print_summary(indicators, data_dir=args.data_dir, output_dir=args.output_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
