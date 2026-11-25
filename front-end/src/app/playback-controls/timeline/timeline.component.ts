import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';


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
  @Input() disabled = false;
  @Output() seek = new EventEmitter<number>();

}
