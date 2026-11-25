import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { ThemePalette } from '@angular/material/core';
import { ReplayViewModel } from '../../types/types';
import { TimelineComponent } from './timeline/timeline.component';
import { calculateTimeDifference } from '../shared/time-utils';

@Component({
  selector: 'app-playback-controls',
  templateUrl: './playback-controls.component.html',
  styleUrls: ['./playback-controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, MatIconButton, MatIcon, MatSlideToggle, MatTooltip, TimelineComponent]
})
export class PlaybackControlsComponent {
  @Input() currentReplayState: ReplayViewModel | undefined;
  @Input() totalSnapshots: number | undefined;
  @Input() durationMs = 0;
  @Input() contentLoaded = false;
  @Input() didNotAttemptExercise: boolean | null = null;
  @Input() displayDiffs = false;
  
  tooltipShowDelay = 1000;
  tooltipHideDelay = 0;
  slideToggleColor: ThemePalette = 'primary';

  @Output() snapshotNavigation = new EventEmitter<number>();
  @Output() timelineSeek = new EventEmitter<number>();
  @Output() displayDiffsChange = new EventEmitter<boolean>();

  get timeSpentOnExercise(): string | undefined {
    if (!this.contentLoaded) {
      return undefined;
    }

    return calculateTimeDifference(0, this.durationMs);
  }

  get elapsedTimeDisplay(): string | undefined {
    if (this.currentReplayState === undefined) {
      return undefined;
    }

    return calculateTimeDifference(0, this.currentReplayState.elapsedTime);
  }

  get currentSnapshotIndex(): number | undefined {
    if (this.currentReplayState === undefined) {
      return undefined;
    }

    return this.currentReplayState.stateOrigin === 'snapshot'
      ? this.currentReplayState.snapshotIndex
      : this.currentReplayState.baseSnapshotIndex;
  }

  get currentSnapshotMatchesPrevious(): boolean {
    return this.currentReplayState?.stateOrigin === 'snapshot'
      && this.currentReplayState.codeEqualToPreviousSnapshot === true;
  }
}
