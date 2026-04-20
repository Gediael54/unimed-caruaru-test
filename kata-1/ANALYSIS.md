# Kata 1 Analysis

## Queue Strategy

A sorted list is enough for this batch problem because all patients are known before ordering. The algorithm calculates the adjusted priority once per patient, then sorts by:

1. adjusted priority descending;
2. arrival time ascending;
3. original input position as the final tie-breaker.

That final tie-breaker preserves FIFO behavior for records with equal adjusted urgency and equal arrival time.

## Complexity

The implementation costs `O(n log n)` because sorting dominates the work. For a small or medium triage batch this is simple and reliable.

For 1 million patients, alternatives are worth considering:

- A priority queue if patients arrive continuously and the next patient must be selected incrementally.
- Buckets by priority level because there are only four urgency levels. Each bucket can preserve FIFO order and reduce sorting work.
- Database-side ordering if records already live in a transactional store and paging is required.

## Rule Interaction

The elderly rule only upgrades `MEDIUM` urgency to `HIGH` for patients aged 60 or older. The minor rule applies separately to patients under 18 and increases the current priority by one level, capped at `CRITICAL`.

A 15-year-old with `MEDIUM` urgency becomes `HIGH` because of the minor rule. The elderly rule does not apply because the patient is not at least 60 years old.

## Extensibility

The priority adjustment is isolated in `calculate_adjusted_priority`. New rules can be added there or moved into a list of rule functions if the number of rules grows. Keeping adjustment separate from sorting avoids mixing business decisions with queue mechanics.
