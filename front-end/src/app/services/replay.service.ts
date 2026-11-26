import { computed, Injectable, signal } from '@angular/core';
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

  private readonly isPlayingSignal = signal(false);
  readonly isPlaying = this.isPlayingSignal.asReadonly();

  readonly canSkipToPreviousChange = computed(() => this.getPreviousChangeElapsedTime() !== undefined);
  readonly canSkipToNextChange = computed(() => this.getNextChangeIndex() !== undefined);

  private attempt: ExerciseAttempt | undefined;
  private snapshots: ProgramSnapshot[] = [];
  private changes: ProgramChange[] = [];

  private playbackTimer: ReturnType<typeof setInterval> | undefined;
  private playbackStartedAt = 0;
  private playbackStartElapsed = 0;
  private playbackDocument: Text | undefined;
  private playbackSnapshotIndex: number | undefined;
  private playbackNextChangeIndex = 0;
  private playbackLatestChangeIndex: number | undefined;

  loadAttempt(attempt: ExerciseAttempt): void {
    this.stopPlayback();
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
    this.stopPlayback();
    this.attempt = undefined;
    this.snapshots = [];
    this.changes = [];
    this.viewModelSignal.set(undefined);
    this.durationSignal.set(0);
    this.resetPlaybackCursor();
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

    this.updateViewModel(
      boundedElapsedTime,
      snapshotIndex,
      latestChangeIndex,
      document.toString()
    );

    if (this.isPlayingSignal()) {
      if (boundedElapsedTime >= this.durationSignal()) {
        this.stopPlayback();
      } else {
        this.initializePlaybackCursor();
        this.playbackStartedAt = performance.now();
        this.playbackStartElapsed = boundedElapsedTime;
      }
    }
  }

  seekToSnapshot(snapshotIndex: number): void {
    const snapshot = this.snapshots[snapshotIndex];
    if (snapshot === undefined) {
      throw new Error(`Snapshot index ${snapshotIndex} is out of range`);
    }
    this.seekToElapsedTime(snapshot.timestamp - this.startTimestamp);
  }

  seekToPreviousChange(): void {
    const previousElapsedTime = this.getPreviousChangeElapsedTime();
    if (previousElapsedTime !== undefined) {
      this.seekToElapsedTime(previousElapsedTime);
    }
  }

  seekToNextChange(): void {
    const changeIndex = this.getNextChangeIndex();
    if (changeIndex !== undefined) {
      this.seekToElapsedTime(this.changes[changeIndex].timestamp - this.startTimestamp);
    }
  }

  /**
   * Starts playback from the current view model. Elapsed time is driven by a monotonic clock,
   * while a cached cursor lets each tick apply only changes reached since the previous tick.
   */
  play(): void {
    if (this.attempt === undefined || this.durationSignal() <= 0 || this.isPlayingSignal()) {
      return;
    }

    if ((this.viewModelSignal()?.elapsedTime ?? 0) >= this.durationSignal()) {
      this.seekToElapsedTime(0);
    }

    this.initializePlaybackCursor();
    this.playbackStartElapsed = this.viewModelSignal()!.elapsedTime;
    this.playbackStartedAt = performance.now();
    this.isPlayingSignal.set(true);
    this.playbackTimer = setInterval(() => this.updatePlayback(), 16);
  }

  /**
   * Updates to the current clock position before stopping, preserving the exact pause position.
   */
  pause(): void {
    if (!this.isPlayingSignal()) {
      return;
    }

    this.updatePlayback();
    this.stopPlayback();
  }

  private getMostRecentSnapshot(timestamp: number): number {
    /**
     * Gets the latest snapshot immediately before a given timestamp. Used for reconstruction logic in `seekToElapsedTime`.
     */
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
    /**
     * Gets the most recent change (not snapshot) immediately after a given snapshot.
     * Used to optimise reconstruction in `seekToElapsedTime`.
     */
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

  private getFirstChangeAtOrAfter(timestamp: number): number {
    let first = 0;
    let last = this.changes.length;

    while (first < last) {
      const middle = Math.floor((first + last) / 2);
      if (this.changes[middle].timestamp < timestamp) {
        first = middle + 1;
      } else {
        last = middle;
      }
    }

    return first;
  }

  private getPreviousChangeElapsedTime(): number | undefined {
    const viewModel = this.viewModelSignal();
    if (viewModel === undefined) {
      return undefined;
    }

    if (viewModel.stateOrigin === 'change') {
      if (viewModel.changeIndex === 0) {
        return viewModel.elapsedTime > 0 ? 0 : undefined;
      }
      return this.changes[viewModel.changeIndex - 1].timestamp - this.startTimestamp;
    }

    const timestamp = this.startTimestamp + viewModel.elapsedTime;
    const previousChangeIndex = this.getFirstChangeAtOrAfter(timestamp) - 1;
    return previousChangeIndex >= 0
      ? this.changes[previousChangeIndex].timestamp - this.startTimestamp
      : undefined;
  }

  private getNextChangeIndex(): number | undefined {
    const viewModel = this.viewModelSignal();
    if (viewModel === undefined) {
      return undefined;
    }

    const nextChangeIndex = viewModel.stateOrigin === 'change'
      ? viewModel.changeIndex + 1
      : this.getFirstChangeAfter(this.startTimestamp + viewModel.elapsedTime);
    return nextChangeIndex < this.changes.length ? nextChangeIndex : undefined;
  }

  /**
   * Seeds incremental playback from the current state so playback can resume after a seek or pause.
   */
  private initializePlaybackCursor(): void {
    const viewModel = this.viewModelSignal();
    if (viewModel === undefined) {
      throw new Error('Cannot play before an exercise attempt has been loaded');
    }

    this.playbackDocument = Text.of(viewModel.code.split('\n'));
    this.playbackSnapshotIndex = viewModel.stateOrigin === 'snapshot'
      ? viewModel.snapshotIndex
      : viewModel.baseSnapshotIndex;
    this.playbackLatestChangeIndex = viewModel.stateOrigin === 'change'
      ? viewModel.changeIndex
      : undefined;
    this.playbackNextChangeIndex = this.getFirstChangeAfter(
      this.startTimestamp + viewModel.elapsedTime
    );
  }

  /**
   * Advances elapsed time, resets from a snapshot when crossing a checkpoint, and applies newly reached changes.
   */
  private updatePlayback(): void {
    const elapsedTime = this.playbackStartElapsed + (performance.now() - this.playbackStartedAt);
    const boundedElapsedTime = Math.min(elapsedTime, this.durationSignal());
    const timestamp = this.startTimestamp + boundedElapsedTime;
    const snapshotIndex = this.getMostRecentSnapshot(timestamp);

    if (snapshotIndex !== this.playbackSnapshotIndex) {
      const snapshot = this.snapshots[snapshotIndex];
      this.playbackDocument = Text.of(snapshot.snapshot.split('\n'));
      this.playbackSnapshotIndex = snapshotIndex;
      this.playbackLatestChangeIndex = undefined;
      this.playbackNextChangeIndex = this.getFirstChangeAfter(snapshot.timestamp);
    }

    while (
      this.playbackNextChangeIndex < this.changes.length
      && this.changes[this.playbackNextChangeIndex].timestamp <= timestamp
    ) {
      const changeIndex = this.playbackNextChangeIndex;
      this.playbackDocument = this.applyChange(this.playbackDocument!, this.changes[changeIndex]);
      this.playbackLatestChangeIndex = changeIndex;
      this.playbackNextChangeIndex += 1;
    }

    this.updateViewModel(
      boundedElapsedTime,
      this.playbackSnapshotIndex!,
      this.playbackLatestChangeIndex,
      this.playbackDocument!.toString()
    );

    if (elapsedTime >= this.durationSignal()) {
      this.stopPlayback();
    }
  }

  private updateViewModel(
    elapsedTime: number,
    snapshotIndex: number,
    latestChangeIndex: number | undefined,
    code: string
  ): void {
    const snapshot = this.snapshots[snapshotIndex];
    // Update the replay view model from the most recent snapshot when there are no changes before elapsedTime.
    if (latestChangeIndex === undefined) {
      const previousSnapshot = this.snapshots[snapshotIndex - 1];
      this.viewModelSignal.set({
        stateOrigin: 'snapshot',
        snapshotIndex,
        snapshot,
        code,
        elapsedTime,
        codeEqualToPreviousSnapshot: previousSnapshot === undefined
          ? undefined
          : snapshot.snapshot === previousSnapshot.snapshot,
        timeSincePreviousSnapshot: previousSnapshot === undefined
          ? undefined
          : snapshot.timestamp - previousSnapshot.timestamp
      });
      return;
    }

    // Otherwise, use the latest change before elapsedTime to update the replay view model.
    const change = this.changes[latestChangeIndex];
    this.viewModelSignal.set({
      stateOrigin: 'change',
      changeIndex: latestChangeIndex,
      baseSnapshotIndex: snapshotIndex,
      change,
      code,
      elapsedTime,
      timeSincePreviousSnapshot: change.timestamp - snapshot.timestamp
    });
  }

  private applyChange(document: Text, change: ProgramChange): Text {
    try {
      return ChangeSet.fromJSON(change.changes).apply(document);
    } catch (error) {
      throw new Error(`Unable to apply editor change at timestamp ${change.timestamp}`, {
        cause: error
      });
    }
  }

  private stopPlayback(): void {
    if (this.playbackTimer !== undefined) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = undefined;
    }
    this.isPlayingSignal.set(false);
    this.resetPlaybackCursor();
  }

  private resetPlaybackCursor(): void {
    this.playbackDocument = undefined;
    this.playbackSnapshotIndex = undefined;
    this.playbackLatestChangeIndex = undefined;
    this.playbackNextChangeIndex = 0;
  }

  private get startTimestamp(): number {
    if (this.attempt === undefined) {
      throw new Error('Cannot access the replay start time before an attempt is loaded');
    }
    return this.attempt.snapshots[0].timestamp;
  }

}
