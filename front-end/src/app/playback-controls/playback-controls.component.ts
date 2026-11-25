import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { ThemePalette } from '@angular/material/core';
import { CurrentSnapshot } from '../../types/types';
import { TimelineComponent } from './timeline/timeline.component';

@Component({
  selector: 'app-playback-controls',
  templateUrl: './playback-controls.component.html',
  styleUrls: ['./playback-controls.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, MatIconButton, MatIcon, MatSlideToggle, MatTooltip, TimelineComponent]
})
export class PlaybackControlsComponent {
  @Input() currentSnapshot: CurrentSnapshot | undefined;
  @Input() totalSnapshots: number | undefined;
  @Input() contentLoaded = false;
  @Input() didNotAttemptExercise: boolean | null = null;
  @Input() displayDiffs = false;
  tooltipShowDelay = 1000;
  tooltipHideDelay = 0;
  slideToggleColor: ThemePalette = 'primary';

  @Output() snapshotNavigation = new EventEmitter<number>();
  @Output() displayDiffsChange = new EventEmitter<boolean>();
}
