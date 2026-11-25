import { ChangeDetectionStrategy, Component } from '@angular/core';
import {MatSliderModule} from '@angular/material/slider';


@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatSliderModule]
})
export class TimelineComponent {

  //TODO: Add logic for scaling the timeline to the exercise attempt time

}
