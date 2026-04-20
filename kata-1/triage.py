"""Triage queue ordering rules for Kata 1."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable


URGENCY_PRIORITY = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4,
}

PRIORITY_URGENCY = {value: key for key, value in URGENCY_PRIORITY.items()}
MAX_PRIORITY = URGENCY_PRIORITY["CRITICAL"]


@dataclass(frozen=True)
class Patient:
    """Input patient record for queue ordering."""

    id: str
    name: str
    age: int
    urgency: str
    arrival_time: datetime


@dataclass(frozen=True)
class PrioritizedPatient:
    """Patient plus the urgency calculated after business rules."""

    patient: Patient
    adjusted_priority: int

    @property
    def adjusted_urgency(self) -> str:
        return PRIORITY_URGENCY[self.adjusted_priority]


def calculate_adjusted_priority(patient: Patient) -> int:
    """Apply age-based triage rules and return the final numeric priority."""

    urgency = patient.urgency.upper()
    if urgency not in URGENCY_PRIORITY:
        raise ValueError(f"Unsupported urgency: {patient.urgency}")

    priority = URGENCY_PRIORITY[urgency]

    if patient.age >= 60 and priority == URGENCY_PRIORITY["MEDIUM"]:
        priority = URGENCY_PRIORITY["HIGH"]

    if patient.age < 18:
        priority = min(priority + 1, MAX_PRIORITY)

    return priority


def order_triage_queue(patients: Iterable[Patient]) -> list[PrioritizedPatient]:
    """Return patients ordered by adjusted urgency and arrival FIFO."""

    prioritized = [
        (index, PrioritizedPatient(patient, calculate_adjusted_priority(patient)))
        for index, patient in enumerate(patients)
    ]

    prioritized.sort(
        key=lambda item: (
            -item[1].adjusted_priority,
            item[1].patient.arrival_time,
            item[0],
        )
    )

    return [item[1] for item in prioritized]
