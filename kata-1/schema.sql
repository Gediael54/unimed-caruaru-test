CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0),
    urgency TEXT NOT NULL CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    arrival_time TIMESTAMP NOT NULL
);

CREATE INDEX idx_patients_triage_order
    ON patients (urgency, arrival_time);
