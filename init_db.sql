CREATE TABLE program_logs (
    id serial PRIMARY KEY,
    participantId varchar NOT NULL,
    "date" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    exercise_number smallint NOT NULL,
    logs_changes jsonb NOT NULL,
    logs_snapshots jsonb NOT NULL,
    comments text
);