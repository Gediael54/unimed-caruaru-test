# Kata 4 Analysis

## Treatment Decisions

Dates are normalized to ISO `YYYY-MM-DD` output. The parser accepts `DD/MM/YYYY`, `YYYY-MM-DD`, and ISO timestamp-like values.

Money values are parsed as `Decimal` to avoid floating point rounding issues. Comma decimals are accepted, and output values are written with two decimal places.

Required fields are validated before records enter the consolidated dataset. Invalid rows are skipped and reported in `indicators.json` under `rejected_rows`.

Deliveries without a matching order are treated as orphan records. They do not create consolidated orders, but their count and IDs are included in the indicators.

City names are trimmed, de-accented, whitespace-normalized, and title-cased before grouping. For example, `Maceió` becomes `Maceio`.

## Idempotency

The pipeline is idempotent for the same input files. It reads only the three source CSV files and overwrites `consolidated.csv` and `indicators.json` deterministically on each run.

## Scaling to 10 Million Rows

For 10 million rows, the in-memory approach should be replaced or constrained:

- Stream CSV files instead of loading everything into lists.
- Use a database or columnar storage for joins and grouped indicators.
- Add indexes for order IDs and customer IDs.
- Write validation rejects to a separate report as rows are processed.
- Partition processing by date or order ID range.
- Run the pipeline as an orchestrated job with retries, metrics, and clear audit logs.

## Test Coverage

The tests cover date parsing, money parsing, city normalization, joins, delay calculation, orphan delivery reporting, and indicator output.
