from __future__ import annotations

import sqlite3
import unittest
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from triage import (
    ELDERLY_AGE_THRESHOLD,
    ELDERLY_PROMOTION_SOURCE_PRIORITY,
    ELDERLY_PROMOTION_TARGET_PRIORITY,
    MAX_PRIORITY,
    MIN_PRIORITY,
    MINOR_AGE_THRESHOLD,
    PRIORITY_URGENCY,
    Patient,
    PrioritizedPatient,
    TriageBucketQueue,
    URGENCY_PRIORITY,
    calculate_adjusted_priority,
    canonical_urgency,
    order_triage_queue,
    parse_arrival_time,
)


BASE_TIME = datetime(2026, 4, 20, 8, 0)
TODAY = date(2026, 4, 20)
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def patient(
    name: str,
    urgency: str,
    minutes: int,
    age: int = 30,
    *,
    patient_id: str | None = None,
) -> Patient:
    return Patient(
        id=patient_id or name,
        name=name,
        age=age,
        urgency=urgency,
        arrival_time=BASE_TIME + timedelta(minutes=minutes),
    )


class CanonicalUrgencyTests(unittest.TestCase):
    def test_accepts_portuguese_labels_with_accents(self) -> None:
        self.assertEqual(canonical_urgency("CRÍTICA"), "CRÍTICA")
        self.assertEqual(canonical_urgency("ALTA"), "ALTA")
        self.assertEqual(canonical_urgency("MÉDIA"), "MÉDIA")
        self.assertEqual(canonical_urgency("BAIXA"), "BAIXA")

    def test_accepts_portuguese_labels_without_accents(self) -> None:
        self.assertEqual(canonical_urgency("CRITICA"), "CRÍTICA")
        self.assertEqual(canonical_urgency("MEDIA"), "MÉDIA")

    def test_accepts_english_labels(self) -> None:
        self.assertEqual(canonical_urgency("CRITICAL"), "CRÍTICA")
        self.assertEqual(canonical_urgency("HIGH"), "ALTA")
        self.assertEqual(canonical_urgency("MEDIUM"), "MÉDIA")
        self.assertEqual(canonical_urgency("LOW"), "BAIXA")

    def test_is_case_insensitive(self) -> None:
        self.assertEqual(canonical_urgency("crítica"), "CRÍTICA")
        self.assertEqual(canonical_urgency("Alta"), "ALTA")
        self.assertEqual(canonical_urgency("medium"), "MÉDIA")

    def test_rejects_empty_or_whitespace(self) -> None:
        with self.assertRaises(ValueError):
            canonical_urgency("")
        with self.assertRaises(ValueError):
            canonical_urgency("   ")

    def test_rejects_unknown_label(self) -> None:
        with self.assertRaises(ValueError):
            canonical_urgency("URGENTÍSSIMA")

    def test_rejects_non_string(self) -> None:
        with self.assertRaises(ValueError):
            canonical_urgency(None)  # type: ignore[arg-type]


class ParseArrivalTimeTests(unittest.TestCase):
    def test_passes_through_datetime(self) -> None:
        moment = datetime(2026, 4, 20, 9, 30)
        self.assertEqual(parse_arrival_time(moment), moment)

    def test_parses_hh_mm_with_today_reference(self) -> None:
        result = parse_arrival_time("09:15", today=TODAY)
        self.assertEqual(result, datetime(2026, 4, 20, 9, 15))

    def test_parses_hh_mm_with_default_today(self) -> None:
        result = parse_arrival_time("12:00")
        self.assertEqual(result.hour, 12)
        self.assertEqual(result.minute, 0)
        self.assertEqual(result.date(), date.today())

    def test_parses_iso_8601(self) -> None:
        result = parse_arrival_time("2026-04-20T10:30:00")
        self.assertEqual(result, datetime(2026, 4, 20, 10, 30))

    def test_rejects_timezone_aware_datetime(self) -> None:
        aware = datetime(2026, 4, 20, 9, 30, tzinfo=timezone.utc)
        with self.assertRaises(ValueError):
            parse_arrival_time(aware)

    def test_rejects_timezone_aware_iso_8601(self) -> None:
        with self.assertRaises(ValueError):
            parse_arrival_time("2026-04-20T10:30:00+00:00")

    def test_rejects_empty_or_whitespace(self) -> None:
        with self.assertRaises(ValueError):
            parse_arrival_time("")
        with self.assertRaises(ValueError):
            parse_arrival_time("   ")

    def test_rejects_non_string_non_datetime(self) -> None:
        with self.assertRaises(ValueError):
            parse_arrival_time(12345)  # type: ignore[arg-type]

    def test_rejects_malformed_hh_mm_non_digits(self) -> None:
        with self.assertRaises(ValueError):
            parse_arrival_time("ab:cd", today=TODAY)

    def test_rejects_out_of_range_hh_mm(self) -> None:
        with self.assertRaises(ValueError):
            parse_arrival_time("24:00", today=TODAY)
        with self.assertRaises(ValueError):
            parse_arrival_time("12:60", today=TODAY)

    def test_rejects_unparseable_string(self) -> None:
        with self.assertRaises(ValueError):
            parse_arrival_time("not-a-date")


class AdjustedPriorityTests(unittest.TestCase):
    def test_elderly_medium_becomes_alta(self) -> None:
        priority = calculate_adjusted_priority(patient("elderly", "MÉDIA", 0, age=60))
        self.assertEqual(priority, URGENCY_PRIORITY["ALTA"])

    def test_elderly_boundary_59_does_not_trigger_rule_4(self) -> None:
        priority = calculate_adjusted_priority(patient("just-young", "MÉDIA", 0, age=59))
        self.assertEqual(priority, URGENCY_PRIORITY["MÉDIA"])

    def test_elderly_critical_stays_critical(self) -> None:
        priority = calculate_adjusted_priority(patient("elder-crit", "CRÍTICA", 0, age=80))
        self.assertEqual(priority, URGENCY_PRIORITY["CRÍTICA"])

    def test_minor_gains_one_level(self) -> None:
        priority = calculate_adjusted_priority(patient("kid-low", "BAIXA", 0, age=10))
        self.assertEqual(priority, URGENCY_PRIORITY["MÉDIA"])

    def test_minor_is_capped_at_critical(self) -> None:
        priority = calculate_adjusted_priority(patient("kid-crit", "CRÍTICA", 0, age=10))
        self.assertEqual(priority, MAX_PRIORITY)

    def test_minor_boundary_17_triggers_rule_5(self) -> None:
        priority = calculate_adjusted_priority(patient("17yo", "BAIXA", 0, age=17))
        self.assertEqual(priority, URGENCY_PRIORITY["MÉDIA"])

    def test_minor_boundary_18_does_not_trigger_rule_5(self) -> None:
        priority = calculate_adjusted_priority(patient("18yo", "BAIXA", 0, age=18))
        self.assertEqual(priority, URGENCY_PRIORITY["BAIXA"])

    def test_fifteen_year_old_medium_becomes_alta_via_rule_5_only(self) -> None:
        candidate = patient("15yo-med", "MÉDIA", 0, age=15)
        self.assertLess(candidate.age, 60)
        self.assertEqual(calculate_adjusted_priority(candidate), URGENCY_PRIORITY["ALTA"])

    def test_negative_age_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            calculate_adjusted_priority(patient("invalid", "BAIXA", 0, age=-1))

    def test_non_integer_age_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            calculate_adjusted_priority(
                Patient(name="float-age", age=17.5, urgency="BAIXA", arrival_time="08:00")
            )

    def test_boolean_age_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            calculate_adjusted_priority(
                Patient(name="bool-age", age=True, urgency="BAIXA", arrival_time="08:00")
            )

    def test_invalid_urgency_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            calculate_adjusted_priority(patient("x", "ROSA", 0, age=30))


class OrderTriageQueueTests(unittest.TestCase):
    def test_orders_by_adjusted_urgency_then_fifo(self) -> None:
        ordered = order_triage_queue(
            [
                patient("low", "BAIXA", 0),
                patient("critical-late", "CRÍTICA", 10),
                patient("critical-early", "CRÍTICA", 5),
                patient("high", "ALTA", 1),
            ]
        )
        self.assertEqual(
            [item.patient.name for item in ordered],
            ["critical-early", "critical-late", "high", "low"],
        )

    def test_preserves_input_order_for_exact_ties(self) -> None:
        first = patient("first", "ALTA", 0)
        second = patient("second", "ALTA", 0)
        ordered = order_triage_queue([first, second])
        self.assertEqual([item.patient.name for item in ordered], ["first", "second"])

    def test_accepts_empty_input(self) -> None:
        self.assertEqual(order_triage_queue([]), [])

    def test_accepts_mixed_language_urgency(self) -> None:
        ordered = order_triage_queue(
            [
                patient("en-high", "HIGH", 0),
                patient("pt-alta", "ALTA", 1),
                patient("en-low", "LOW", 2),
            ]
        )
        self.assertEqual(
            [item.canonical_urgency for item in ordered],
            ["ALTA", "ALTA", "BAIXA"],
        )

    def test_accepts_hh_mm_arrival_time(self) -> None:
        ordered = order_triage_queue(
            [
                Patient(name="08h30", age=30, urgency="ALTA", arrival_time="08:30"),
                Patient(name="08h10", age=30, urgency="ALTA", arrival_time="08:10"),
            ],
            today=TODAY,
        )
        self.assertEqual(
            [item.patient.name for item in ordered],
            ["08h10", "08h30"],
        )

    def test_accepts_mixed_datetime_and_hh_mm(self) -> None:
        ordered = order_triage_queue(
            [
                Patient(name="dt", age=30, urgency="ALTA", arrival_time=datetime(2026, 4, 20, 8, 15)),
                Patient(name="hhmm", age=30, urgency="ALTA", arrival_time="08:05"),
            ],
            today=TODAY,
        )
        self.assertEqual([item.patient.name for item in ordered], ["hhmm", "dt"])

    def test_rejects_timezone_aware_arrival_time_in_batch_ordering(self) -> None:
        with self.assertRaises(ValueError):
            order_triage_queue(
                [
                    Patient(name="local", age=30, urgency="ALTA", arrival_time="08:00"),
                    Patient(
                        name="aware",
                        age=30,
                        urgency="ALTA",
                        arrival_time="2026-04-20T08:05:00+00:00",
                    ),
                ],
                today=TODAY,
            )


class TriageBucketQueueTests(unittest.TestCase):
    def test_initial_state_is_empty(self) -> None:
        queue = TriageBucketQueue()
        self.assertEqual(len(queue), 0)
        self.assertTrue(queue.is_empty)
        self.assertIsNone(queue.peek())
        self.assertIsNone(queue.dequeue_next())
        self.assertEqual(queue.snapshot(), [])

    def test_enqueue_and_len(self) -> None:
        queue = TriageBucketQueue()
        queue.enqueue(patient("a", "BAIXA", 0))
        queue.enqueue(patient("b", "ALTA", 1))
        self.assertEqual(len(queue), 2)
        self.assertFalse(queue.is_empty)

    def test_dequeue_respects_priority(self) -> None:
        queue = TriageBucketQueue()
        queue.enqueue(patient("low", "BAIXA", 0))
        queue.enqueue(patient("critical", "CRÍTICA", 10))
        queue.enqueue(patient("high", "ALTA", 5))
        self.assertEqual(queue.dequeue_next().patient.name, "critical")
        self.assertEqual(queue.dequeue_next().patient.name, "high")
        self.assertEqual(queue.dequeue_next().patient.name, "low")
        self.assertIsNone(queue.dequeue_next())

    def test_peek_does_not_remove(self) -> None:
        queue = TriageBucketQueue()
        queue.enqueue(patient("a", "ALTA", 0))
        self.assertEqual(queue.peek().patient.name, "a")
        self.assertEqual(len(queue), 1)

    def test_fifo_within_bucket(self) -> None:
        queue = TriageBucketQueue()
        queue.enqueue(patient("first", "ALTA", 0))
        queue.enqueue(patient("second", "ALTA", 1))
        queue.enqueue(patient("third", "ALTA", 2))
        self.assertEqual(
            [queue.dequeue_next().patient.name for _ in range(3)],
            ["first", "second", "third"],
        )

    def test_applies_rules_on_enqueue(self) -> None:
        queue = TriageBucketQueue()
        result = queue.enqueue(patient("15yo-med", "MÉDIA", 0, age=15))
        self.assertEqual(result.adjusted_priority, URGENCY_PRIORITY["ALTA"])

    def test_snapshot_matches_order_triage_queue(self) -> None:
        patients = [
            patient("low", "BAIXA", 0),
            patient("high", "ALTA", 1),
            patient("critical", "CRÍTICA", 2),
            patient("medium", "MÉDIA", 3),
            patient("kid-low", "BAIXA", 4, age=12),
            patient("elder-med", "MÉDIA", 5, age=70),
        ]
        batch = order_triage_queue(patients)
        queue = TriageBucketQueue()
        for p in patients:
            queue.enqueue(p)
        self.assertEqual(
            [item.patient.name for item in queue.snapshot()],
            [item.patient.name for item in batch],
        )

    def test_iterator_returns_snapshot(self) -> None:
        queue = TriageBucketQueue()
        queue.enqueue(patient("a", "ALTA", 0))
        queue.enqueue(patient("b", "BAIXA", 1))
        self.assertEqual([item.patient.name for item in queue], ["a", "b"])

    def test_accepts_hh_mm_with_today(self) -> None:
        queue = TriageBucketQueue(today=TODAY)
        result = queue.enqueue(
            Patient(name="early", age=30, urgency="ALTA", arrival_time="07:45")
        )
        self.assertEqual(result.parsed_arrival_time, datetime(2026, 4, 20, 7, 45))

    def test_rejects_out_of_order_arrival_within_same_priority_bucket(self) -> None:
        queue = TriageBucketQueue(today=TODAY)
        queue.enqueue(Patient(name="late", age=30, urgency="ALTA", arrival_time="08:10"))
        with self.assertRaises(ValueError):
            queue.enqueue(
                Patient(name="early", age=30, urgency="ALTA", arrival_time="08:05")
            )

    def test_accepts_equal_arrival_time_within_same_priority_bucket(self) -> None:
        queue = TriageBucketQueue(today=TODAY)
        queue.enqueue(Patient(name="first", age=30, urgency="ALTA", arrival_time="08:10"))
        queue.enqueue(Patient(name="second", age=30, urgency="ALTA", arrival_time="08:10"))
        self.assertEqual(
            [item.patient.name for item in queue.snapshot()],
            ["first", "second"],
        )

    def test_large_volume_is_linear(self) -> None:
        queue = TriageBucketQueue()
        for i in range(10_000):
            queue.enqueue(patient(f"p-{i}", "BAIXA", i))
        self.assertEqual(len(queue), 10_000)
        self.assertEqual(queue.dequeue_next().patient.name, "p-0")
        self.assertEqual(len(queue), 9_999)


class ConstantsSanityTests(unittest.TestCase):
    def test_domain_thresholds_match_brief(self) -> None:
        self.assertEqual(ELDERLY_AGE_THRESHOLD, 60)
        self.assertEqual(MINOR_AGE_THRESHOLD, 18)

    def test_priority_bounds(self) -> None:
        self.assertEqual(MIN_PRIORITY, URGENCY_PRIORITY["BAIXA"])
        self.assertEqual(MAX_PRIORITY, URGENCY_PRIORITY["CRÍTICA"])

    def test_elderly_promotion_constants_match_domain(self) -> None:
        self.assertEqual(ELDERLY_PROMOTION_SOURCE_PRIORITY, URGENCY_PRIORITY["MÉDIA"])
        self.assertEqual(ELDERLY_PROMOTION_TARGET_PRIORITY, URGENCY_PRIORITY["ALTA"])

    def test_priority_urgency_is_reversible(self) -> None:
        for label, priority in URGENCY_PRIORITY.items():
            self.assertEqual(PRIORITY_URGENCY[priority], label)

    def test_prioritized_patient_adjusted_urgency_property(self) -> None:
        item = PrioritizedPatient(
            patient=patient("x", "ALTA", 0),
            adjusted_priority=URGENCY_PRIORITY["ALTA"],
            parsed_arrival_time=BASE_TIME,
            canonical_urgency="ALTA",
        )
        self.assertEqual(item.adjusted_urgency, "ALTA")


class SqlSchemaIntegrationTests(unittest.TestCase):
    """Loads `schema.sql` into in-memory SQLite and verifies the VIEW output.

    Proves that `order_triage_queue` (Python) and `v_triage_queue_ordered`
    (SQL) agree byte-for-byte on ordering for the same input set.
    """

    def setUp(self) -> None:
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

    def tearDown(self) -> None:
        self.conn.close()

    def _seed_queue(self) -> tuple[str, list[Patient]]:
        queue_id = str(uuid.uuid4())
        self.conn.execute(
            "INSERT INTO triage_queues (id, session_date, shift) VALUES (?, ?, ?)",
            (queue_id, "2026-04-20", "MANHA"),
        )

        patients_input = [
            patient("kid-low", "BAIXA", 2, age=10),
            patient("elder-med", "MÉDIA", 4, age=65),
            patient("adult-high", "ALTA", 1),
            patient("adult-critical", "CRÍTICA", 6),
            patient("adult-low", "BAIXA", 0),
            patient("kid-high", "ALTA", 3, age=15),
            patient("adult-med-tie-a", "MÉDIA", 5),
            patient("adult-med-tie-b", "MÉDIA", 5),
            patient("elder-critical", "CRÍTICA", 7, age=72),
            patient("boundary-59-med", "MÉDIA", 8, age=59),
            patient("boundary-18-low", "BAIXA", 9, age=18),
        ]

        for index, p in enumerate(patients_input):
            patient_id = p.id or str(uuid.uuid4())
            self.conn.execute(
                "INSERT INTO patients (id, name, age) VALUES (?, ?, ?)",
                (patient_id, p.name, p.age),
            )
            canonical = canonical_urgency(p.urgency)
            adjusted = calculate_adjusted_priority(p)
            adjusted_label = next(
                label for label, value in URGENCY_PRIORITY.items() if value == adjusted
            )
            self.conn.execute(
                """
                INSERT INTO triage_queue_entries (
                    id, queue_id, patient_id, urgency_code,
                    adjusted_urgency_code, arrived_at, sequence_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    queue_id,
                    patient_id,
                    canonical,
                    adjusted_label,
                    parse_arrival_time(p.arrival_time).isoformat(),
                    index,
                ),
            )

        self.conn.commit()
        return queue_id, patients_input

    def test_urgency_levels_seeded(self) -> None:
        rows = self.conn.execute(
            "SELECT code, numeric_priority FROM urgency_levels ORDER BY numeric_priority"
        ).fetchall()
        self.assertEqual(
            [(row["code"], row["numeric_priority"]) for row in rows],
            [("BAIXA", 1), ("MÉDIA", 2), ("ALTA", 3), ("CRÍTICA", 4)],
        )

    def test_ordering_index_covers_operational_query(self) -> None:
        rows = self.conn.execute(
            "PRAGMA index_info('idx_queue_entries_ordering')"
        ).fetchall()
        self.assertEqual(
            [row["name"] for row in rows],
            ["queue_id", "status", "adjusted_urgency_code", "arrived_at", "sequence_number"],
        )

    def test_view_ordering_matches_python(self) -> None:
        queue_id, patients_input = self._seed_queue()
        view_rows = self.conn.execute(
            """
            SELECT patient_name
            FROM v_triage_queue_ordered
            WHERE queue_id = ?
            """,
            (queue_id,),
        ).fetchall()
        sql_order = [row["patient_name"] for row in view_rows]

        python_order = [
            item.patient.name for item in order_triage_queue(patients_input)
        ]
        self.assertEqual(sql_order, python_order)

    def test_view_recomputes_adjusted_urgency(self) -> None:
        self._seed_queue()
        rows = self.conn.execute(
            """
            SELECT patient_name, declared_urgency,
                   stored_adjusted_urgency, adjusted_urgency_computed
            FROM v_triage_queue_ordered
            """
        ).fetchall()
        for row in rows:
            self.assertEqual(
                row["stored_adjusted_urgency"],
                row["adjusted_urgency_computed"],
                f"Divergence on {row['patient_name']}",
            )

    def test_unique_patient_per_queue_constraint(self) -> None:
        queue_id, _ = self._seed_queue()
        patient_id = self.conn.execute(
            "SELECT id FROM patients LIMIT 1"
        ).fetchone()["id"]

        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                """
                INSERT INTO triage_queue_entries (
                    id, queue_id, patient_id, urgency_code,
                    adjusted_urgency_code, arrived_at, sequence_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    queue_id,
                    patient_id,
                    "ALTA",
                    "ALTA",
                    datetime.now().isoformat(),
                    999,
                ),
            )

    def test_unique_queue_per_date_shift(self) -> None:
        self.conn.execute(
            "INSERT INTO triage_queues (id, session_date, shift) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), "2026-04-21", "TARDE"),
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO triage_queues (id, session_date, shift) VALUES (?, ?, ?)",
                (str(uuid.uuid4()), "2026-04-21", "TARDE"),
            )

    def test_appointment_requires_started_before_ended(self) -> None:
        queue_id, _ = self._seed_queue()
        entry_id = self.conn.execute(
            "SELECT id, patient_id FROM triage_queue_entries WHERE queue_id = ? LIMIT 1",
            (queue_id,),
        ).fetchone()
        doctor_id = str(uuid.uuid4())
        self.conn.execute(
            """
            INSERT INTO doctors (id, name, registration, specialty)
            VALUES (?, ?, ?, ?)
            """,
            (doctor_id, "Dra. Exemplo", "CRM-12345", "Clínica Geral"),
        )

        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                """
                INSERT INTO appointments (
                    id, queue_entry_id, patient_id, doctor_id,
                    started_at, ended_at, outcome
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    entry_id["id"],
                    entry_id["patient_id"],
                    doctor_id,
                    "2026-04-20T10:00:00",
                    "2026-04-20T09:00:00",  # invalid: ended before started
                    "ATTENDED",
                ),
            )


if __name__ == "__main__":
    unittest.main()
