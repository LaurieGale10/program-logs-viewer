import { Component, HostListener, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { CurrentSnapshot, ExerciseAttempt, isExerciseAttempt, ProgramSnapshot } from '../../src/types/types';
import * as jsdiff from 'diff';
import { ThemePalette } from '@angular/material/core';
import { MatLabel } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { CodeViewerComponent } from './code-viewer/code-viewer.component';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatLabel, FormsModule, MatTooltip, CodeViewerComponent, MatIconButton, MatIcon, MatSlideToggle, RouterOutlet]
})
export class AppComponent implements OnInit {
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
  timeStartingExerise: string | undefined;
  timeSpentOnExercise: string | undefined;
  didNotAttemptExercise: boolean | null = null; //TODO: Sort out convention on what is undefined and null

  currentSnapshot: CurrentSnapshot | undefined;

  contentLoaded: boolean = false;
  displayDiffs: boolean = false;
  matSlideToggleColor: ThemePalette = "primary";

  async ngOnInit(): Promise<void> {
    let displayCount: number = 1;
    let response = await fetch('/participants')
    .then(response => response.json())
    .then(json => {
        json.forEach((participantId: string) => {
          this.participantIds?.push([participantId[0], displayCount+". "+participantId[0]])
          displayCount++;
        })
    })
  }

  /**
   * Calculates time difference between two timestamps
   * @param timestamp1 The chronologically earlier timestamp
   * @param timestamp2 The chronologically later timestamp
   * @returns String indicating different between timestamps
   * TODO: Make more general (include ability to include hours), and make more pure (just return difference) and test!!
   */
  calculateTimeDifference(timestamp1: number, timestamp2: number):string {
    if (timestamp1 != null && timestamp2 != null ){
        let difference = (timestamp2 - timestamp1) / 1000;
        let minutes = Math.floor(difference / 60);
        if (minutes == 0) {
            return difference.toFixed(3)+" seconds";
        }
        let seconds = difference - minutes * 60;
        return minutes+" minutes "+seconds.toFixed(3)+" seconds";
    }
    throw new Error("Don't have two timestamps to compare against"); //TODO: Improve error handling here
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

    const response = await fetch('/exercise_numbers?' + new URLSearchParams({
      participantId: this.selectedParticipantId
    }));
    if (!response.ok) {
      throw new Error(`Failed to load exercises: ${response.status} ${response.statusText}`);
    }

    const exerciseRows: [number][] = await response.json();
    this.participantExercises = exerciseRows.map(([exerciseNumber]) => exerciseNumber);
  }

  private resetExerciseState(): void {
    this.currentSnapshot = undefined;
    this.snapshots = undefined;
    this.totalSnapshots = undefined;
    this.timeStartingExerise = undefined;
    this.timeSpentOnExercise = undefined;
    this.didNotAttemptExercise = null;
    this.contentLoaded = false;
    this.selectedExercise = null;
    this.participantExercises = [];
    this.displayDiffs = false;
  }

  /**
   * Displays the snapshot-related data for a given snapshot number and list of snapshots
   * @param snapshotNumber Current snapshot number
   * @param snapshots Array containing all snapshots
   */
  displaySnapshot(snapshotNumber: number, snapshots: ProgramSnapshot[]): void {
    let currentSnapshot = snapshots[snapshotNumber];

    this.currentSnapshot = {
      snapshot: currentSnapshot,
      codeToDisplay: currentSnapshot.snapshot,
      codeEqualToPreviousSnapshot: currentSnapshot.snapshot === this.snapshots![snapshotNumber - 1].snapshot,
      snapshotNumber: snapshotNumber,
      timeBetweenLastRun: this.calculateTimeDifference(snapshots[snapshotNumber - 1]["timestamp"],snapshots[snapshotNumber]["timestamp"]),
      timeSpentOnExerciseSoFar: this.calculateTimeDifference(snapshots[0]["timestamp"],snapshots[snapshotNumber]["timestamp"]),
    }

    //Update UI elements related to if code "compiled" (ran)
    if (this.displayDiffs) {
      this.currentSnapshot.codeToDisplay = this.convertToDiffs();
    }
    this.contentLoaded = true;
  }

  /**
   * Loads the snapshot for a given participantId and exercise number, called when a new exercise is selected.
   * //TODO: return some promise as the method is async
   */
  async loadSnapshots(): Promise<void> {
    const response = await fetch('/snapshots?' + new URLSearchParams({
      "participantId": this.selectedParticipantId!,
      "exercise_number": this.selectedExercise!.toString()
    }));
    if (!response.ok) {
      throw new Error(`Failed to load snapshots: ${response.status} ${response.statusText}`);
    }

    const responseBody: unknown = await response.json();
    if (!isExerciseAttempt(responseBody)) {
      throw new Error("The snapshots API returned an invalid exercise attempt");
    }

    const attempt: ExerciseAttempt = responseBody;
    this.snapshots = attempt.snapshots;
    this.totalSnapshots = this.snapshots.length - 1; //TODO: Implement more error handling
    if (this.totalSnapshots === 0) {
      //No snapshot data to display
      this.currentSnapshot = undefined;
      this.didNotAttemptExercise = true;
      this.contentLoaded = true;
    }
    else {
      this.didNotAttemptExercise = false;
      this.displaySnapshot(1, this.snapshots);
    }
    this.timeStartingExerise = attempt.date;
    this.timeSpentOnExercise = this.calculateTimeDifference(
      this.snapshots[0].timestamp,
      this.snapshots[this.totalSnapshots].timestamp
    );
  }

  /**
   * A function that returns a markdown string showing the diffs between the current and previous snapshot codes.
   * Only called on snapshot codes that are not identical to each other
   * @returns The converted markdown string.
   */
  convertToDiffs(): string {
    if (this.currentSnapshot === undefined || this.snapshots === undefined) {
      throw new Error("Cannot calculate a diff without a current snapshot");
    }

    const previousSnapshotCode = this.snapshots[this.currentSnapshot.snapshotNumber - 1].snapshot;
    const diff = jsdiff.diffLines(previousSnapshotCode, this.currentSnapshot.snapshot.snapshot);
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
   * When currentSnapshot = 1, displays the diffs between the first snapshot and the original state of the code when the exercise was loaded.
   */
  toggleDiffs() {
    if (this.currentSnapshot === undefined) {
      return;
    }

    if (this.displayDiffs && !this.currentSnapshot.codeEqualToPreviousSnapshot) {
      this.currentSnapshot.codeToDisplay = this.convertToDiffs();
    }
    else {
      this.currentSnapshot.codeToDisplay = this.currentSnapshot.snapshot?.snapshot;
    }
  }

  /**
   * A listener for left and right arrow key binding to control moving between different snapshots. Shift + left arrow/right arrow moves to the first/last snapshot respectively.
   * @param event The keyboard event passed into the listener
   */
  @HostListener("document:keydown", ["$event"])
  handleSnapshotNavigationKeybinds(event: KeyboardEvent) {
    const currentSnapshot = this.currentSnapshot;
    if (this.contentLoaded && currentSnapshot !== undefined && this.totalSnapshots != undefined) {
      switch(event.key) {
        case "ArrowLeft":
          if (currentSnapshot.snapshotNumber > 1) {
            this.displaySnapshot(event.shiftKey ? 1 : currentSnapshot.snapshotNumber - 1, this.snapshots!)
          }
          break;
        case "ArrowRight":
          if (currentSnapshot.snapshotNumber < this.totalSnapshots) {
            this.displaySnapshot(event.shiftKey ? this.totalSnapshots : currentSnapshot.snapshotNumber + 1, this.snapshots!)
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
        if (this.contentLoaded && this.currentSnapshot !== undefined && event.key == "d") {
        this.displayDiffs = !this.displayDiffs;
        this.toggleDiffs();
      }
    }
}