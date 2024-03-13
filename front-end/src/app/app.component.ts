import { Component, HostListener, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { snapshotData } from '../../src/types/types';
import * as jsdiff from 'diff';
import { ThemePalette } from '@angular/material/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
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
  snapshots: any[] | undefined; //TODO: Change to proper JSON type
  totalSnapshots: number | undefined;
  timeStartingExerise: string | undefined;
  timeSpentOnExercise: string | undefined;
  didNotAttemptExercise: boolean | null = null; //TODO: Sort out convention on what is undefined and null

  currentSnapshotData: snapshotData = {
    currentSnapshotCode: undefined,
    codeToDisplay: undefined,
    codeEqualToPreviousSnapshot: undefined,
    snapshotNumber: undefined,
    timeBetweenLastRun: undefined,
    timeSpentOnExerciseSoFar: undefined,
    codeCompiled: undefined,
  }

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
  async loadParticipantExercises() {
    //Reset snapshot-related data for a given participantId and exercise number to remove out-of-date data
    this.currentSnapshotData = {
      currentSnapshotCode: undefined,
      codeToDisplay: undefined,
      codeEqualToPreviousSnapshot: undefined,
      snapshotNumber: undefined,
      timeBetweenLastRun: undefined,
      timeSpentOnExerciseSoFar: undefined,
      codeCompiled: undefined,
    }
    this.totalSnapshots = undefined;
    this.timeStartingExerise = undefined;
    this.timeSpentOnExercise = undefined;
    this.didNotAttemptExercise = null;
    this.contentLoaded = false;
    this.selectedExercise = null;
    this.participantExercises = [];
    this.displayDiffs = false;


    let response = fetch('/exercise_numbers?' + new URLSearchParams({
        "participantId": this.selectedParticipantId!
    }))
    .then(response => response.json())
    .then(json => {
        json.forEach((participantData: number[]) => {
          this.participantExercises?.push(participantData[0]);
        });
    })
  }

  /**
   * Displays the snapshot-related data for a given snapshot number and list of snapshots
   * @param snapshotNumber Current snapshot number
   * @param snapshots Array containing all snapshots
   */
  displaySnapshot(snapshotNumber:number, snapshots:any):void {
    let currentSnapshot = snapshots[snapshotNumber];

    this.currentSnapshotData = {
      currentSnapshotCode: currentSnapshot["snapshot"],
      codeToDisplay: currentSnapshot["snapshot"],
      codeEqualToPreviousSnapshot: currentSnapshot["snapshot"] == this.snapshots![snapshotNumber - 1]["snapshot"],
      snapshotNumber: snapshotNumber,
      timeBetweenLastRun: this.calculateTimeDifference(snapshots[snapshotNumber - 1]["timestamp"],snapshots[snapshotNumber]["timestamp"]),
      timeSpentOnExerciseSoFar: this.calculateTimeDifference(snapshots[0]["timestamp"],snapshots[snapshotNumber]["timestamp"]),
      codeCompiled: undefined,
    }

    //Update UI elements related to if code "compiled" (ran)
    if (currentSnapshot["compiled"]) {
      this.currentSnapshotData.codeCompiled = true;
    }
    else {
      this.currentSnapshotData.codeCompiled = false;
      this.currentSnapshotData.snapshotErrorMessage = currentSnapshot["error"]["error"];
    }

    if (this.displayDiffs) {
      this.currentSnapshotData.codeToDisplay = this.convertToDiffs();
    }
    this.contentLoaded = true;
  }

  /**
   * Loads the snapshot for a given participantId and exercise number, called when a new exercise is selected.
   * //TODO: return some promise as the method is async
   */
  async loadSnapshots() {
    let request = await fetch('/snapshots?' + new URLSearchParams({
      "participantId": this.selectedParticipantId!,
      "exercise_number": this.selectedExercise!.toString()
    }))
    .then(response => response.json())
    .then(json => {
      //Update snapshot-set data
      this.snapshots = json[0][0]
      this.totalSnapshots = this.snapshots!.length - 1; //TODO: Implement more error handling
      if (this.totalSnapshots == 0) {
        //No snapshot data to display
        this.currentSnapshotData = {
          currentSnapshotCode: undefined,
          codeToDisplay: undefined,
          codeEqualToPreviousSnapshot: undefined,
          snapshotNumber: undefined,
          timeBetweenLastRun: undefined,
          timeSpentOnExerciseSoFar: undefined,
          codeCompiled: undefined,
        }
        this.didNotAttemptExercise = true;
        this.contentLoaded = true;
      }
      else {
        this.didNotAttemptExercise = false;
        this.displaySnapshot(1,this.snapshots);
      }
      this.timeStartingExerise = json[0][1];
      this.timeSpentOnExercise = this.calculateTimeDifference(this.snapshots![0]["timestamp"], this.snapshots![this.totalSnapshots]["timestamp"]);
    })
  }

  /**
   * A function that returns a markdown string showing the diffs between the current and previous snapshot codes.
   * Only called on snapshot codes that are not identical to each other
   * @returns The converted markdown string.
   */
  convertToDiffs(): string {
    let previousSnapshotCode = this.snapshots![this.currentSnapshotData.snapshotNumber! - 1]["snapshot"];
    let diff = jsdiff.diffLines(previousSnapshotCode, this.currentSnapshotData.currentSnapshotCode!);
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
    if (this.displayDiffs && !this.currentSnapshotData.codeEqualToPreviousSnapshot) {
      this.currentSnapshotData.codeToDisplay = this.convertToDiffs();
    }
    else {
      this.currentSnapshotData.codeToDisplay = this.currentSnapshotData.currentSnapshotCode;
    }
  }

  /**
   * A listener for left and right arrow key binding to control moving between different snapshots. Shift + left arrow/right arrow moves to the first/last snapshot respectively.
   * @param event The keyboard event passed into the listener
   */
  @HostListener("document:keydown", ["$event"])
  handleSnapshotNavigationKeybinds(event: KeyboardEvent) {
    if (this.contentLoaded && this.currentSnapshotData!.snapshotNumber != undefined && this.totalSnapshots != undefined) {
      switch(event.key) {
        case "ArrowLeft":
          if (this.currentSnapshotData!.snapshotNumber! > 1) {
            this.displaySnapshot(event.shiftKey ? 1 : this.currentSnapshotData!.snapshotNumber - 1, this.snapshots)

          }
          break;
        case "ArrowRight":
          if (this.currentSnapshotData!.snapshotNumber! < this.totalSnapshots!) {
            this.displaySnapshot(event.shiftKey ? this.totalSnapshots : this.currentSnapshotData!.snapshotNumber + 1, this.snapshots)
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
      if (this.contentLoaded && this.currentSnapshotData!.snapshotNumber != undefined && event.key == "d") {
        this.displayDiffs = !this.displayDiffs;
        this.toggleDiffs();
      }
    }
}