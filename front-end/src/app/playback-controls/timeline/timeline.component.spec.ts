import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineComponent } from './timeline.component';

describe('TimelineComponent', () => {
  let fixture: ComponentFixture<TimelineComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TimelineComponent]
    });
    fixture = TestBed.createComponent(TimelineComponent);
  });

  it('logs elapsed time and duration when the timeline inputs change', () => {
    const logSpy = spyOn(console, 'log');
    fixture.detectChanges();
    logSpy.calls.reset();

    fixture.componentRef.setInput('elapsedTime', 250);
    fixture.componentRef.setInput('durationMs', 1000);
    fixture.detectChanges();

    expect(logSpy).toHaveBeenCalledOnceWith('Elapsed time: 250ms; duration: 1000ms');
  });
});
