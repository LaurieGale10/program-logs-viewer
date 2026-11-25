import { ChangeSet } from '@codemirror/state';
import { ExerciseAttempt, ProgramChange } from '../../types/types';
import { ReplayService } from './replay.service';

describe('ReplayService', () => {
  let service: ReplayService;

  beforeEach(() => {
    service = new ReplayService();
  });

  it('starts at zero elapsed time with the initial snapshot code', () => {
    service.loadAttempt(createAttempt());

    expect(service.viewModel()).toEqual(jasmine.objectContaining({
      stateOrigin: 'snapshot',
      snapshotIndex: 0,
      code: 'a',
      elapsedTime: 0
    }));
    expect(service.durationMs()).toBe(300);
  });

  it('reconstructs code from the nearest snapshot and changes up to the requested elapsed time', () => {
    service.loadAttempt(createAttempt());

    service.seekToElapsedTime(150);

    expect(service.viewModel()).toEqual(jasmine.objectContaining({
      stateOrigin: 'change',
      changeIndex: 0,
      baseSnapshotIndex: 0,
      code: 'ab',
      elapsedTime: 150,
      timeSincePreviousSnapshot: 100
    }));
  });

  it('uses the next snapshot as a checkpoint when seeking beyond it', () => {
    service.loadAttempt(createAttempt());

    service.seekToElapsedTime(300);

    expect(service.viewModel()).toEqual(jasmine.objectContaining({
      stateOrigin: 'snapshot',
      snapshotIndex: 1,
      code: 'abc',
      elapsedTime: 300,
      timeSincePreviousSnapshot: 300
    }));
  });

  it('starts applying changes after the selected snapshot checkpoint', () => {
    const attempt = createAttempt();
    attempt.changes.push(createInsertChange(1400, 3, 'd', 3));
    service.loadAttempt(attempt);

    service.seekToElapsedTime(400);

    expect(service.viewModel()).toEqual(jasmine.objectContaining({
      stateOrigin: 'change',
      changeIndex: 2,
      baseSnapshotIndex: 1,
      code: 'abcd',
      elapsedTime: 400
    }));
  });

  it('clamps elapsed time to the attempt duration', () => {
    service.loadAttempt(createAttempt());

    service.seekToElapsedTime(500);

    expect(service.viewModel()?.elapsedTime).toBe(300);
    expect(service.viewModel()?.code).toBe('abc');
  });

  it('uses logged changes as the replay duration when there is only an initial snapshot', () => {
    service.loadAttempt({
      snapshots: [{ snapshot: 'a', timestamp: 1000, compiled: true }],
      changes: [createInsertChange(1150, 1, 'b', 1)],
      date: '',
      comments: null,
      id: 1
    });

    service.seekToElapsedTime(150);

    expect(service.durationMs()).toBe(150);
    expect(service.viewModel()).toEqual(jasmine.objectContaining({
      stateOrigin: 'change',
      code: 'ab',
      elapsedTime: 150
    }));
  });

  it('rejects seeking before an attempt has been loaded', () => {
    expect(() => service.seekToElapsedTime(0)).toThrowError(
      'Cannot seek before an exercise attempt is loaded'
    );
  });

});

function createAttempt(): ExerciseAttempt {
  return {
    snapshots: [
      { snapshot: 'a', timestamp: 1000, compiled: true },
      { snapshot: 'abc', timestamp: 1300, compiled: true }
    ],
    changes: [
      createInsertChange(1100, 1, 'b', 1),
      createInsertChange(1200, 2, 'c', 2)
    ],
    date: '',
    comments: null,
    id: 1
  };
}

function createInsertChange(
  timestamp: number,
  position: number,
  insertedText: string,
  documentLength: number
): ProgramChange {
  return {
    changes: ChangeSet.of([{ from: position, insert: insertedText }], documentLength).toJSON(),
    timestamp,
    annotations: [],
    selections: []
  };
}
