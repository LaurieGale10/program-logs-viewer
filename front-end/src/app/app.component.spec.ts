import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { LoadingService } from './services/loading.service';
import { ProgramSnapshot } from '../types/types';

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule, AppComponent],
    providers: [{
      provide: LoadingService,
      useValue: {
        getParticipants: async () => []
      }
    }]
}));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Program Logs Viewer');
  });

  it('should build replay view state for the starting snapshot', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const snapshots: ProgramSnapshot[] = [
      { snapshot: 'start', timestamp: 100, compiled: true },
      { snapshot: 'next', timestamp: 250, compiled: true }
    ];
    app.snapshots = snapshots;

    app.displaySnapshot(0, snapshots);

    expect(app.currentReplayState).toEqual(jasmine.objectContaining({
      stateOrigin: 'snapshot',
      snapshotIndex: 0,
      snapshot: snapshots[0],
      code: 'start',
      elapsedTime: 0,
      codeEqualToPreviousSnapshot: undefined,
      timeSincePreviousSnapshot: undefined
    }));
  });

  it('records time since the previous snapshot in milliseconds', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const snapshots: ProgramSnapshot[] = [
      { snapshot: 'start', timestamp: 100, compiled: true },
      { snapshot: 'next', timestamp: 250, compiled: true }
    ];

    app.displaySnapshot(1, snapshots);

    expect(app.currentReplayState?.stateOrigin).toBe('snapshot');
    expect(app.currentReplayState?.timeSincePreviousSnapshot).toBe(150);
  });
});
