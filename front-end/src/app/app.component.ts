import { Component, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { ExerciseAttempt, ProgramSnapshot, ReplayViewModel } from '../../src/types/types';
import type { TimelineMarker } from './playback-controls/timeline/timeline.component';
import * as jsdiff from 'diff';
import { ThemePalette } from '@angular/material/core';
import { MatLabel } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { CodeViewerComponent } from './code-viewer/code-viewer.component';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './services/loading.service';
import { ReplayService } from './services/replay.service';
import { PlaybackControlsComponent } from './playback-controls/playback-controls.component';
import { calculateTimeDifference } from './shared/time-utils';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatLabel, FormsModule, MatTooltip, CodeViewerComponent, PlaybackControlsComponent, RouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(
    private readonly loadingService: LoadingService,
    private readonly replayService: ReplayService
  ) {}

  tooltipShowDelay = new FormControl(1000);
  tooltipHideDelay = new FormControl(0);
  tooltipPosition = new FormControl('below');

  participantIds : [string, string][] | null = [];
  selectedParticipantId: string | null = null;
  participantExercises: number[] | null = [];
  selectedExercise: number | null = null;

  //Snapshot-set data
  snapshots: ProgramSnapshot[] | undefined;
  timelineMarkers: TimelineMarker[] = [];
  totalSnapshots: number | undefined;
  timeStartingExercise: string | undefined;
  didNotAttemptExercise: boolean | null = null; //TODO: Sort out convention on what is undefined and null

  contentLoaded: boolean = false;
  displayDiffs: boolean = false;
  matSlideToggleColor: ThemePalette = "primary";

  get currentReplayState(): ReplayViewModel | undefined {
    return this.replayService.viewModel();
  }

  get replayDurationMs(): number {
    return this.replayService.durationMs();
  }

  get isPlaying(): boolean {
    return this.replayService.isPlaying();
  }

  get canSkipToPreviousChange(): boolean {
    return this.replayService.canSkipToPreviousChange();
  }

  get canSkipToNextChange(): boolean {
    return this.replayService.canSkipToNextChange();
  }

  get codeToDisplay(): string | undefined {
    const state = this.currentReplayState;
    if (state === undefined) {
      return undefined;
    }

    const comparisonSnapshotIndex = state.stateOrigin === 'snapshot'
      ? state.snapshotIndex - 1
      : state.baseSnapshotIndex;
    if (!this.displayDiffs || comparisonSnapshotIndex < 0 || this.snapshots === undefined) {
      return state.code;
    }

    const previousCode = this.snapshots[comparisonSnapshotIndex].snapshot;
    return previousCode === state.code ? state.code : this.convertToDiffs(state, previousCode);
  }

  get displayDiffMarkdown(): boolean {
    const state = this.currentReplayState;
    return state !== undefined && this.codeToDisplay !== state.code;
  }

  async ngOnInit(): Promise<void> {
    const participantIds = await this.loadingService.getParticipants();
    this.participantIds = participantIds.map((participantId, index) => [
      participantId,
      `${index + 1}. ${participantId}`
    ]);
  }

  /**
   * Function that is called once a specific participant is selected, loading the exercises that exists for them in the back-end.
   * Also alters the display of some other UI elements
   */
  async loadParticipantExercises(): Promise<void> {
    this.resetExerciseState();

    if (this.selectedParticipantId === null) {
      return;
    }

    this.participantExercises = await this.loadingService.getExerciseNumbers(this.selectedParticipantId);
  }

  private resetExerciseState(): void {
    this.replayService.clear();
    this.snapshots = undefined;
    this.timelineMarkers = [];
    this.totalSnapshots = undefined;
    this.didNotAttemptExercise = null;
    this.contentLoaded = false;
    this.selectedExercise = null;
    this.participantExercises = [];
    this.displayDiffs = false;
  }

  displaySnapshot(snapshotIndex: number): void {
    this.replayService.seekToSnapshot(snapshotIndex);
    this.contentLoaded = true;
  }

  get timeSincePreviousSnapshotDisplay(): string | undefined {
    const timeSincePreviousSnapshot = this.currentReplayState?.timeSincePreviousSnapshot;
    return timeSincePreviousSnapshot === undefined
      ? undefined
      : calculateTimeDifference(0, timeSincePreviousSnapshot);
  }

  /**
   * Loads an exercise attempt for the selected participant and exercise.
   */
  async loadExerciseAttempt(): Promise<void> {
    if (this.selectedParticipantId === null || this.selectedExercise === null) {
      return;
    }

    this.contentLoaded = false;
    const attempt: ExerciseAttempt = await this.loadingService.getExerciseAttempt(
      this.selectedParticipantId,
      this.selectedExercise
    );
    this.replayService.loadAttempt(attempt);
    this.snapshots = attempt.snapshots;
    const startTimestamp = attempt.snapshots[0].timestamp;
    this.timelineMarkers = [
      ...attempt.snapshots.map(snapshot => ({
        kind: 'snapshot' as const,
        elapsedTime: snapshot.timestamp - startTimestamp,
        successful: snapshot.compiled
      })),
      ...attempt.changes.map(change => ({
        kind: 'change' as const,
        elapsedTime: change.timestamp - startTimestamp
      }))
    ]
      .filter(marker => marker.elapsedTime >= 0 && marker.elapsedTime <= this.replayService.durationMs())
      .sort((a, b) => a.elapsedTime - b.elapsedTime);
    this.totalSnapshots = this.snapshots.length - 1;
    if (this.totalSnapshots === 0 && attempt.changes.length === 0) {
      //No snapshot data to display
      this.didNotAttemptExercise = true;
      this.contentLoaded = true;
    }
    else {
      this.didNotAttemptExercise = false;
      this.contentLoaded = true;
    }
  }

  /**
   * A function that returns a markdown string showing the diffs between the current and previous snapshot codes.
   * For change-origin states, the comparison point is the base snapshot.
   * @returns The converted markdown string.
   */
  convertToDiffs(
    currentReplayState: ReplayViewModel | undefined = this.currentReplayState,
    previousSnapshotCode?: string
  ): string {
    if (currentReplayState === undefined || this.snapshots === undefined) {
      throw new Error("Cannot calculate a diff without a current snapshot");
    }

    const comparisonSnapshotIndex = currentReplayState.stateOrigin === 'snapshot'
      ? currentReplayState.snapshotIndex - 1
      : currentReplayState.baseSnapshotIndex;
    const codeToCompare = previousSnapshotCode
      ?? this.snapshots[comparisonSnapshotIndex]?.snapshot;
    if (comparisonSnapshotIndex < 0 || codeToCompare === undefined) {
      throw new Error("Cannot calculate a diff without a previous snapshot");
    }

    const diff = jsdiff.diffLines(codeToCompare, currentReplayState.code);
    let outputString = "";
    
    //Iterates through lines of diff string, grouped into added, removed, and unchanged and adds them to a new outputString. +'s and -'s are appended to added and removed lines respectively
    diff.forEach(part => {
      const lines: string[] = part.value.split('\n').filter(line => line.trim() !== '');
      if (part.added) {
        lines.forEach(line => {
          outputString += `+ ${line}\n`;
        });
      } else if (part.removed) {
        lines.forEach(line => {
          outputString += `- ${line}\n`;
        });
      }
      else {
        outputString += part.value;
      }
    });
    return outputString;
  }

  navigateToSnapshot(snapshotNumber: number): void {
    if (this.snapshots !== undefined) {
      this.displaySnapshot(snapshotNumber);
    }
  }

  seekToElapsedTime(elapsedTime: number): void {
    this.replayService.seekToElapsedTime(elapsedTime);
  }

  navigateToChange(direction: 'previous' | 'next'): void {
    if (direction === 'previous') {
      this.replayService.seekToPreviousChange();
    } else {
      this.replayService.seekToNextChange();
    }
  }

  togglePlayback(): void {
    if (this.replayService.isPlaying()) {
      this.replayService.pause();
    } else {
      this.replayService.play();
    }
  }

  onDisplayDiffsChange(displayDiffs: boolean): void {
    this.displayDiffs = displayDiffs;
  }

  /**
   * A listener for left and right arrow key binding to control moving between different snapshots. Shift + left arrow/right arrow moves to the first/last snapshot respectively.
   * @param event The keyboard event passed into the listener
   */
  @HostListener("document:keydown", ["$event"])
  handleSnapshotNavigationKeybinds(event: KeyboardEvent) {
    const currentReplayState = this.currentReplayState;
    if (this.contentLoaded && currentReplayState !== undefined && this.totalSnapshots != undefined) {
      const currentSnapshotIndex = currentReplayState.stateOrigin === 'snapshot'
        ? currentReplayState.snapshotIndex
        : currentReplayState.baseSnapshotIndex;
      switch(event.key) {
        case "ArrowLeft":
          if (currentSnapshotIndex > 0) {
            this.displaySnapshot(event.shiftKey ? 0 : currentSnapshotIndex - 1)
          }
          break;
        case "ArrowRight":
          if (currentSnapshotIndex < this.totalSnapshots) {
            this.displaySnapshot(event.shiftKey ? this.totalSnapshots : currentSnapshotIndex + 1)
          }
          break;
      }
    }
  }

  /**
   * A listener for the d key binding to control whether diffs between a current and previous snapshot are displayed or not.
   * @param event The keyboard event passed into the listener
   */
  @HostListener("document:keyup", ["$event"])
    handleToggleDiffKeybinds(event: KeyboardEvent) {
        if (this.contentLoaded && this.currentReplayState !== undefined && event.key == "d") {
        this.displayDiffs = !this.displayDiffs;
      }
    }
}