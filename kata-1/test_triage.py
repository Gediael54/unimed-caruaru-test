from __future__ import annotations

import unittest
from datetime import datetime, timedelta

from triage import Patient, calculate_adjusted_priority, order_triage_queue


BASE_TIME = datetime(2026, 4, 20, 8, 0)


def patient(
    patient_id: str,
    urgency: str,
    minutes: int,
    age: int = 30,
) -> Patient:
    return Patient(
        id=patient_id,
        name=f"Patient {patient_id}",
        age=age,
        urgency=urgency,
        arrival_time=BASE_TIME + timedelta(minutes=minutes),
    )


class TriageTests(unittest.TestCase):
    def test_orders_by_adjusted_urgency_then_fifo(self) -> None:
        ordered = order_triage_queue(
            [
                patient("low", "LOW", 0),
                patient("critical-late", "CRITICAL", 10),
                patient("critical-early", "CRITICAL", 5),
                patient("high", "HIGH", 1),
            ]
        )

        self.assertEqual(
            [item.patient.id for item in ordered],
            ["critical-early", "critical-late", "high", "low"],
        )

    def test_preserves_input_order_for_exact_ties(self) -> None:
        first = patient("first", "HIGH", 0)
        second = patient("second", "HIGH", 0)

        ordered = order_triage_queue([first, second])

        self.assertEqual([item.patient.id for item in ordered], ["first", "second"])

    def test_elderly_medium_becomes_high(self) -> None:
        priority = calculate_adjusted_priority(patient("elderly", "MEDIUM", 0, age=60))

        self.assertEqual(priority, 3)

    def test_minor_priority_increases_one_level(self) -> None:
        priority = calculate_adjusted_priority(patient("minor", "MEDIUM", 0, age=15))

        self.assertEqual(priority, 3)

    def test_minor_priority_is_capped_at_critical(self) -> None:
        priority = calculate_adjusted_priority(patient("minor", "CRITICAL", 0, age=12))

        self.assertEqual(priority, 4)

    def test_fifteen_year_old_medium_becomes_high_only_by_minor_rule(self) -> None:
        candidate = patient("minor-medium", "MEDIUM", 0, age=15)

        self.assertLess(candidate.age, 60)
        self.assertEqual(calculate_adjusted_priority(candidate), 3)


if __name__ == "__main__":
    unittest.main()
