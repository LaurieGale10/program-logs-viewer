export type ProgramSnapshot = {
  snapshot: string;
  timestamp: number;
  compiled: boolean;
  error?: {
    error: string;
  };
};

export type ProgramChange = {
  changes: (number | [number, string?])[];
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
    && attempt["snapshots"].length > 0
    && attempt["snapshots"].every(isProgramSnapshot)
    && Array.isArray(attempt["changes"])
    && attempt["changes"].every(isProgramChange)
    && typeof attempt["date"] === "string"
    && (typeof attempt["comments"] === "string" || attempt["comments"] === null)
    && typeof attempt["id"] === "number";
}

function isProgramSnapshot(value: unknown): value is ProgramSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const snapshot = value as Record<string, unknown>;
  const error = snapshot["error"];
  return typeof snapshot["snapshot"] === "string"
    && typeof snapshot["timestamp"] === "number"
    && Number.isFinite(snapshot["timestamp"])
    && typeof snapshot["compiled"] === "boolean"
    && (error === undefined
      || (typeof error === "object"
        && error !== null
        && typeof (error as Record<string, unknown>)["error"] === "string"));
}

function isProgramChange(value: unknown): value is ProgramChange {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const change = value as Record<string, unknown>;
  return Array.isArray(change["changes"])
    && change["changes"].every(isChangePart)
    && typeof change["timestamp"] === "number"
    && Number.isFinite(change["timestamp"])
    && Array.isArray(change["annotations"])
    && change["annotations"].every(annotation => typeof annotation === "string")
    && Array.isArray(change["selections"])
    && change["selections"].every(isSelection);
}

function isChangePart(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0;
  }
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) {
    return false;
  }
  return typeof value[0] === "number"
    && Number.isInteger(value[0])
    && value[0] >= 0
    && (value.length === 1 || typeof value[1] === "string");
}

function isSelection(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const selection = value as Record<string, unknown>;
  return typeof selection["anchor"] === "number"
    && Number.isInteger(selection["anchor"])
    && selection["anchor"] >= 0
    && typeof selection["head"] === "number"
    && Number.isInteger(selection["head"])
    && selection["head"] >= 0;
}

/**
 * Describes the program state and its provenance at a replay position.
 * elapsedTime is measured in milliseconds from the attempt's starting snapshot.
 * timeSincePreviousSnapshot is measured in milliseconds from the previous snapshot,
 * or from the base snapshot when stateOrigin is 'change'. It is undefined at the start.
 */
export type ReplayViewModel = {
  code: string;
  codeToDisplay: string;
  playheadTimestamp: number;
  elapsedTime: number;
  timeSincePreviousSnapshot?: number;
} & (
  | {
      stateOrigin: 'snapshot';
      snapshotIndex: number;
      snapshot: ProgramSnapshot;
      codeEqualToPreviousSnapshot?: boolean;
    }
  | {
      stateOrigin: 'change';
      changeIndex: number;
      baseSnapshotIndex: number;
      change: ProgramChange;
    }
);