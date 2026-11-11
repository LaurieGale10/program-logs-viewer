export type ProgramSnapshot = {
  snapshot: string;
  timestamp: number;
  compiled: boolean;
  error?: {
    error: string;
  };
};

export type ProgramChange = {
  changes: (number | [number, string])[];
  timestamp: number;
  annotations: string[];
  selections: {
    anchor: number;
    head: number;
  }[];
};

export type ExerciseAttempt = {
  snapshots: ProgramSnapshot[];
  changes: ProgramChange[];
  date: string;
  comments: string | null;
  id: number;
};

export function isExerciseAttempt(value: unknown): value is ExerciseAttempt {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const attempt = value as Record<string, unknown>;
  return Array.isArray(attempt["snapshots"])
    && Array.isArray(attempt["changes"])
    && typeof attempt["date"] === "string"
    && (typeof attempt["comments"] === "string" || attempt["comments"] === null)
    && typeof attempt["id"] === "number";
}

export type CurrentSnapshot = {
  snapshot: ProgramSnapshot;
  codeToDisplay: string;
  codeEqualToPreviousSnapshot: boolean;
  snapshotNumber: number;
  timeBetweenLastRun: string;
  timeSpentOnExerciseSoFar: string;
};