import { Component, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { ExerciseAttempt, ProgramSnapshot, ReplayViewModel } from '../../src/types/types';
import * as jsdiff from 'diff';
import { ThemePalette } from '@angular/material/core';
import { MatLabel } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { CodeViewerComponent } from './code-viewer/code-viewer.component';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './services/loading.service';
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
  constructor(private readonly loadingService: LoadingService) {}

  tooltipShowDelay = new FormControl(1000);
  tooltipHideDelay = new FormControl(0);
  tooltipPosition = new FormControl('below');

  participantIds : [string, string][] | null = [];
  selectedParticipantId: string | null = null;
  participantExercises: number[] | null = [];
  selectedExercise: number | null = null;

  //Snapshot-set data
  snapshots: ProgramSnapshot[] | undefined;
  totalSnapshots: number | undefined;
  timeStartingExercise: string | undefined;
  didNotAttemptExercise: boolean | null = null; //TODO: Sort out convention on what is undefined and null

  currentReplayState: ReplayViewModel | undefined;

  contentLoaded: boolean = false;
  displayDiffs: boolean = false;
  matSlideToggleColor: ThemePalette = "primary";

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
    this.currentReplayState = undefined;
    this.snapshots = undefined;
    this.totalSnapshots = undefined;
    this.didNotAttemptExercise = null;
    this.contentLoaded = false;
    this.selectedExercise = null;
    this.participantExercises = [];
    this.displayDiffs = false;
  }

  /**
   * Builds display state for a selected snapshot.
   * @param snapshotIndex Index of the selected snapshot
   * @param snapshots Array containing all snapshots
   */
  displaySnapshot(snapshotIndex: number, snapshots: ProgramSnapshot[]): void {
    const currentSnapshot = snapshots[snapshotIndex];
    if (currentSnapshot === undefined) {
      throw new Error(`Snapshot index ${snapshotIndex} is out of range`);
    }

    const previousSnapshot = snapshotIndex > 0 ? snapshots[snapshotIndex - 1] : undefined;

    const snapshotState: Extract<ReplayViewModel, { stateOrigin: 'snapshot' }> = {
      stateOrigin: 'snapshot',
      snapshotIndex,
      snapshot: currentSnapshot,
      code: currentSnapshot.snapshot,
      codeToDisplay: currentSnapshot.snapshot,
      codeEqualToPreviousSnapshot: previousSnapshot === undefined
        ? undefined
        : currentSnapshot.snapshot === previousSnapshot.snapshot,
      timeSincePreviousSnapshot: previousSnapshot === undefined
        ? undefined
        : currentSnapshot.timestamp - previousSnapshot.timestamp,
      elapsedTime: currentSnapshot.timestamp - snapshots[0].timestamp,
    };
    this.currentReplayState = snapshotState;

    if (this.displayDiffs && previousSnapshot !== undefined && !snapshotState.codeEqualToPreviousSnapshot) {
      snapshotState.codeToDisplay = this.convertToDiffs();
    }
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

    const attempt: ExerciseAttempt = await this.loadingService.getExerciseAttempt(
      this.selectedParticipantId,
      this.selectedExercise
    );
    this.snapshots = attempt.snapshots;
    this.totalSnapshots = this.snapshots.length - 1;
    if (this.totalSnapshots === 0) {
      //No snapshot data to display
      this.currentReplayState = undefined;
      this.didNotAttemptExercise = true;
      this.contentLoaded = true;
    }
    else {
      this.didNotAttemptExercise = false;
      this.displaySnapshot(0, this.snapshots);
    }
  }

  /**
   * A function that returns a markdown string showing the diffs between the current and previous snapshot codes.
   * Only called on snapshot codes that are not identical to each other
   * @returns The converted markdown string.
   */
  convertToDiffs(): string {
    const currentReplayState = this.currentReplayState;
    if (currentReplayState === undefined
      || currentReplayState.stateOrigin !== 'snapshot'
      || currentReplayState.snapshotIndex === 0
      || this.snapshots === undefined) {
      throw new Error("Cannot calculate a diff without a current snapshot");
    }

    const previousSnapshotCode = this.snapshots[currentReplayState.snapshotIndex - 1].snapshot;
    const diff = jsdiff.diffLines(previousSnapshotCode, currentReplayState.code);
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

  /**
   * Adjusts whether the diffs between the current and previous snapshot are displayed or not.
   * The starting snapshot has no previous snapshot to compare against.
   */
  toggleDiffs() {
    const currentReplayState = this.currentReplayState;
    if (currentReplayState === undefined || currentReplayState.stateOrigin !== 'snapshot') {
      return;
    }

    if (this.displayDiffs
      && currentReplayState.snapshotIndex > 0
      && !currentReplayState.codeEqualToPreviousSnapshot) {
      currentReplayState.codeToDisplay = this.convertToDiffs();
    }
    else {
      currentReplayState.codeToDisplay = currentReplayState.code;
    }
  }

  navigateToSnapshot(snapshotNumber: number): void {
    if (this.snapshots !== undefined) {
      this.displaySnapshot(snapshotNumber, this.snapshots);
    }
  }

  onDisplayDiffsChange(displayDiffs: boolean): void {
    this.displayDiffs = displayDiffs;
    this.toggleDiffs();
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
            this.displaySnapshot(event.shiftKey ? 0 : currentSnapshotIndex - 1, this.snapshots!)
          }
          break;
        case "ArrowRight":
          if (currentSnapshotIndex < this.totalSnapshots) {
            this.displaySnapshot(event.shiftKey ? this.totalSnapshots : currentSnapshotIndex + 1, this.snapshots!)
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
        if (this.contentLoaded && this.currentReplayState?.stateOrigin === 'snapshot' && event.key == "d") {
        this.displayDiffs = !this.displayDiffs;
        this.toggleDiffs();
      }
    }
}