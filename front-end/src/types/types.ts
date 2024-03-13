  //Current snapshot data
  export type snapshotData = {
    currentSnapshotCode: string | undefined;
    codeToDisplay: string | undefined;
    codeEqualToPreviousSnapshot: boolean | undefined,
    snapshotNumber: number | undefined;
    timeBetweenLastRun: string | undefined;
    timeSpentOnExerciseSoFar: string | undefined;
    codeCompiled: boolean | undefined;
    snapshotErrorMessage?: string | undefined;
  };