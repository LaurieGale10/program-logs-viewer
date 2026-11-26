import { TestBed } from '@angular/core/testing';
import { TimelineComponent } from './timeline.component';

describe('TimelineComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [TimelineComponent]
  }));

  it('positions markers proportionally and distinguishes snapshot outcomes', () => {
    const fixture = TestBed.createComponent(TimelineComponent);
    fixture.componentRef.setInput('durationMs', 1000);
    fixture.componentRef.setInput('markers', [
      { kind: 'snapshot', elapsedTime: 250, successful: true },
      { kind: 'snapshot', elapsedTime: 750, successful: false },
      { kind: 'change', elapsedTime: 500 }
    ]);

    fixture.detectChanges();

    const markers = fixture.nativeElement.querySelectorAll('.timeline-marker') as NodeListOf<HTMLElement>;
    expect(markers.length).toBe(3);
    expect(markers[0].style.left).toBe('25%');
    expect(markers[0].classList).toContain('timeline-marker--successful');
    expect(markers[1].style.left).toBe('75%');
    expect(markers[1].classList).toContain('timeline-marker--unsuccessful');
    expect(markers[2].style.left).toBe('50%');
    expect(markers[2].classList).toContain('timeline-marker--change');
  });

  it('keeps marker positions finite when duration is zero', () => {
    const fixture = TestBed.createComponent(TimelineComponent);
    expect(fixture.componentInstance.markerPosition(100)).toBe(0);
  });
});
