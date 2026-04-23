from __future__ import annotations

import unicodedata
from collections import deque
from dataclasses import dataclass
from datetime import date, datetime
from typing import Iterable, Iterator, Union


URGENCY_PRIORITY = {
    "BAIXA": 1,
    "MÉDIA": 2,
    "ALTA": 3,
    "CRÍTICA": 4,
}

PRIORITY_URGENCY = {value: key for key, value in URGENCY_PRIORITY.items()}
MAX_PRIORITY = URGENCY_PRIORITY["CRÍTICA"]
MIN_PRIORITY = URGENCY_PRIORITY["BAIXA"]
ELDERLY_AGE_THRESHOLD = 60
MINOR_AGE_THRESHOLD = 18
ELDERLY_PROMOTION_SOURCE_PRIORITY = URGENCY_PRIORITY["MÉDIA"]
ELDERLY_PROMOTION_TARGET_PRIORITY = URGENCY_PRIORITY["ALTA"]

_URGENCY_ALIASES = {
    "BAIXA": "BAIXA",
    "LOW": "BAIXA",
    "MEDIA": "MÉDIA",
    "MÉDIA": "MÉDIA",
    "MEDIUM": "MÉDIA",
    "ALTA": "ALTA",
    "HIGH": "ALTA",
    "CRITICA": "CRÍTICA",
    "CRÍTICA": "CRÍTICA",
    "CRITICAL": "CRÍTICA",
}

ArrivalInput = Union[datetime, str]


def _strip_accents(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(character)
    )


def canonical_urgency(value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Urgency is required.")

    key = _strip_accents(value.strip()).upper()
    canonical = _URGENCY_ALIASES.get(key)
    if canonical is None:
        raise ValueError(f"Unsupported urgency: {value!r}")
    return canonical


def parse_arrival_time(value: ArrivalInput, *, today: date | None = None) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is not None and value.utcoffset() is not None:
            raise ValueError("Timezone-aware arrival times are not supported.")
        return value

    if not isinstance(value, str) or not value.strip():
        raise ValueError("Arrival time is required.")

    clean = value.strip()
    reference_date = today or date.today()

    if len(clean) == 5 and clean[2] == ":":
        try:
            hour = int(clean[:2])
            minute = int(clean[3:])
        except ValueError as exc:
            raise ValueError(f"Invalid HH:MM arrival time: {value!r}") from exc
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError(f"Invalid HH:MM arrival time: {value!r}")
        return datetime.combine(reference_date, datetime.min.time()).replace(
            hour=hour, minute=minute
        )

    try:
        parsed = datetime.fromisoformat(clean)
    except ValueError as exc:
        raise ValueError(f"Invalid arrival time: {value!r}") from exc
    if parsed.tzinfo is not None and parsed.utcoffset() is not None:
        raise ValueError("Timezone-aware arrival times are not supported.")
    return parsed


@dataclass(frozen=True)
class Patient:
    name: str
    age: int
    urgency: str
    arrival_time: ArrivalInput
    id: str | None = None


@dataclass(frozen=True)
class PrioritizedPatient:
    patient: Patient
    adjusted_priority: int
    parsed_arrival_time: datetime
    canonical_urgency: str

    @property
    def adjusted_urgency(self) -> str:
        return PRIORITY_URGENCY[self.adjusted_priority]


def calculate_adjusted_priority(patient: Patient) -> int:
    if isinstance(patient.age, bool) or not isinstance(patient.age, int):
        raise ValueError("Age must be an integer.")
    if patient.age < 0:
        raise ValueError("Age must be non-negative.")

    urgency = canonical_urgency(patient.urgency)
    priority = URGENCY_PRIORITY[urgency]

    if (
        patient.age >= ELDERLY_AGE_THRESHOLD
        and priority == ELDERLY_PROMOTION_SOURCE_PRIORITY
    ):
        priority = ELDERLY_PROMOTION_TARGET_PRIORITY

    if patient.age < MINOR_AGE_THRESHOLD:
        priority = min(priority + 1, MAX_PRIORITY)

    return priority


def _build_prioritized_patient(
    patient: Patient, *, today: date | None = None
) -> PrioritizedPatient:
    priority = calculate_adjusted_priority(patient)
    arrival = parse_arrival_time(patient.arrival_time, today=today)
    return PrioritizedPatient(
        patient=patient,
        adjusted_priority=priority,
        parsed_arrival_time=arrival,
        canonical_urgency=canonical_urgency(patient.urgency),
    )


def order_triage_queue(
    patients: Iterable[Patient], *, today: date | None = None
) -> list[PrioritizedPatient]:
    prioritized: list[tuple[int, PrioritizedPatient]] = []
    for index, patient in enumerate(patients):
        prioritized.append(
            (
                index,
                _build_prioritized_patient(patient, today=today),
            )
        )

    prioritized.sort(
        key=lambda item: (
            -item[1].adjusted_priority,
            item[1].parsed_arrival_time,
            item[0],
        )
    )

    return [item[1] for item in prioritized]


_PRIORITIES_DESC: tuple[int, ...] = tuple(
    sorted(PRIORITY_URGENCY.keys(), reverse=True)
)


class TriageBucketQueue:
    def __init__(self, *, today: date | None = None) -> None:
        self._today = today
        self._buckets: dict[int, deque[PrioritizedPatient]] = {
            priority: deque() for priority in _PRIORITIES_DESC
        }
        self._size = 0

    def __len__(self) -> int:
        return self._size

    def __iter__(self) -> Iterator[PrioritizedPatient]:
        return iter(self.snapshot())

    @property
    def is_empty(self) -> bool:
        return self._size == 0

    def enqueue(self, patient: Patient) -> PrioritizedPatient:
        prioritized = _build_prioritized_patient(patient, today=self._today)
        bucket = self._buckets[prioritized.adjusted_priority]
        if bucket and prioritized.parsed_arrival_time < bucket[-1].parsed_arrival_time:
            raise ValueError(
                "TriageBucketQueue requires non-decreasing arrival time within "
                "the same adjusted-priority bucket."
            )
        bucket.append(prioritized)
        self._size += 1
        return prioritized

    def peek(self) -> PrioritizedPatient | None:
        for priority in _PRIORITIES_DESC:
            bucket = self._buckets[priority]
            if bucket:
                return bucket[0]
        return None

    def dequeue_next(self) -> PrioritizedPatient | None:
        for priority in _PRIORITIES_DESC:
            bucket = self._buckets[priority]
            if bucket:
                self._size -= 1
                return bucket.popleft()
        return None

    def snapshot(self) -> list[PrioritizedPatient]:
        result: list[PrioritizedPatient] = []
        for priority in _PRIORITIES_DESC:
            result.extend(self._buckets[priority])
        return result
