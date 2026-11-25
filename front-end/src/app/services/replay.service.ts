import { Injectable, signal } from '@angular/core';
import { ChangeSet, Text } from '@codemirror/state';
import {
  ExerciseAttempt,
  ProgramChange,
  ProgramSnapshot,
  ReplayViewModel
} from '../../types/types';

@Injectable({
  providedIn: 'root'
})

/**
 * The ReplayService is responsible for managing the state of a replay of an exercise attempt.
 * This is mostly contained within the `viewModelSignal`, which stores the elapsed time in the replay,
 * the program state at that time, and other kinds of metadata (e.g., the previous snapshot, time since previous snapshot)
 * All of this is maintained within this service and then displayed in the front-end.
 */
export class ReplayService {
  private readonly viewModelSignal = signal<ReplayViewModel | undefined>(undefined);
  readonly viewModel = this.viewModelSignal.asReadonly();

  private readonly durationSignal = signal(0);
  readonly durationMs = this.durationSignal.asReadonly();

  private attempt: ExerciseAttempt | undefined;
  private snapshots: ProgramSnapshot[] = [];
  private changes: ProgramChange[] = [];

  loadAttempt(attempt: ExerciseAttempt): void {
    if (attempt.snapshots.length === 0) {
      throw new Error('Cannot load a replay attempt without snapshots');
    }
    this.attempt = attempt;
    this.snapshots = attempt.snapshots;
    this.changes = attempt.changes;

    const startTimestamp = this.startTimestamp;
    const lastSnapshot = attempt.snapshots[attempt.snapshots.length - 1];
    const lastChange = attempt.changes[attempt.changes.length - 1];
    const endTimestamp = Math.max(
      lastSnapshot.timestamp,
      lastChange?.timestamp ?? startTimestamp
    );
    this.durationSignal.set(endTimestamp - startTimestamp);
    this.seekToElapsedTime(0);
  }

  clear(): void {
    this.attempt = undefined;
    this.snapshots = [];
    this.changes = [];
    this.viewModelSignal.set(undefined);
    this.durationSignal.set(0);
  }

  /**
   * Updates the replayViewModel to be correct for a given point in time.
   * This is done by iteratively applying the line-level changes to the most recent snapshot before `elapsedTime`
   * until we reach the most recent change after `elapsedTime`. 
   * Each reconstruction uses CodeMirror's `apply` method.
   * If the elapsedTime is equal to the timestamp of a snapshot, we skip the above and update the replayViewModel using the snapshot.
   */
  seekToElapsedTime(elapsedTime: number): void {
    if (this.attempt === undefined) {
      throw new Error('Cannot seek before an exercise attempt is loaded');
    }
    if (!Number.isFinite(elapsedTime)) {
      throw new Error('Cannot seek to an invalid elapsed time');
    }

    const boundedElapsedTime = Math.max(0, Math.min(elapsedTime, this.durationSignal()));
    const timestamp = this.startTimestamp + boundedElapsedTime;
    const snapshotIndex = this.getMostRecentSnapshot(timestamp);
    const snapshot = this.snapshots[snapshotIndex];
    let document = Text.of(snapshot.snapshot.split('\n'));
    let latestChangeIndex: number | undefined;

    let changeIndex = this.getFirstChangeAfter(snapshot.timestamp);
    while (
      changeIndex < this.changes.length
      && this.changes[changeIndex].timestamp <= timestamp
    ) {
      const change = this.changes[changeIndex];
      try {
        document = ChangeSet.fromJSON(change.changes).apply(document);
      } catch (error) {
        throw new Error(`Unable to apply editor change at timestamp ${change.timestamp}`, {
          cause: error
        });
      }
      latestChangeIndex = changeIndex;
      changeIndex += 1;
    }

    const code = document.toString();
    //Update replayViewModel based on the most recent snapshot when there's no corresponding changes before elapsedTime
    if (latestChangeIndex === undefined) {
      const previousSnapshot = this.snapshots[snapshotIndex - 1];
      this.viewModelSignal.set({
        stateOrigin: 'snapshot',
        snapshotIndex,
        snapshot,
        code,
        elapsedTime: boundedElapsedTime,
        codeEqualToPreviousSnapshot: previousSnapshot === undefined
          ? undefined
          : snapshot.snapshot === previousSnapshot.snapshot,
        timeSincePreviousSnapshot: previousSnapshot === undefined
          ? undefined
          : snapshot.timestamp - previousSnapshot.timestamp
      });
      return;
    }

    //Otherwise, use the latest change before elapsedTime to update replayViewModel
    const change = this.changes[latestChangeIndex];
    this.viewModelSignal.set({
      stateOrigin: 'change',
      changeIndex: latestChangeIndex,
      baseSnapshotIndex: snapshotIndex,
      change,
      code,
      elapsedTime: boundedElapsedTime,
      timeSincePreviousSnapshot: change.timestamp - snapshot.timestamp
    });
  }

  seekToSnapshot(snapshotIndex: number): void {
    const snapshot = this.snapshots[snapshotIndex];
    if (snapshot === undefined) {
      throw new Error(`Snapshot index ${snapshotIndex} is out of range`);
    }
    this.seekToElapsedTime(snapshot.timestamp - this.startTimestamp);
  }

  private getMostRecentSnapshot(timestamp: number): number {
    let selectedSnapshotIndex = 0;
    for (let snapshotIndex = 0; snapshotIndex < this.snapshots.length; snapshotIndex += 1) {
      if (this.snapshots[snapshotIndex].timestamp > timestamp) {
        break;
      }
      selectedSnapshotIndex = snapshotIndex;
    }
    return selectedSnapshotIndex;
  }

  private getFirstChangeAfter(timestamp: number): number {
    let first = 0;
    let last = this.changes.length;

    while (first < last) {
      const middle = Math.floor((first + last) / 2);
      if (this.changes[middle].timestamp <= timestamp) {
        first = middle + 1;
      } else {
        last = middle;
      }
    }

    return first;
  }

  private get startTimestamp(): number {
    if (this.attempt === undefined) {
      throw new Error('Cannot access the replay start time before an attempt is loaded');
    }
    return this.attempt.snapshots[0].timestamp;
  }

}
