import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';

export type TimelineMarker =
  | {
      kind: 'snapshot';
      elapsedTime: number;
      successful: boolean;
    }
  | {
      kind: 'change';
      elapsedTime: number;
    };

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, MatSliderModule]
})
export class TimelineComponent {
  @Input() elapsedTime = 0;
  @Input() durationMs = 0;
  @Input() markers: TimelineMarker[] = [];
  @Input() disabled = false;
  @Output() seek = new EventEmitter<number>();

  markerPosition(elapsedTime: number): number {
    if (this.durationMs <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, elapsedTime / this.durationMs * 100));
  }
}
