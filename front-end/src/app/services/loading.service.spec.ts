import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoadingService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(LoadingService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('maps participant rows to participant IDs', async () => {
    const participantsPromise = service.getParticipants();

    const request = httpTestingController.expectOne('/participants');
    expect(request.request.method).toBe('GET');
    request.flush([['participant-1'], ['participant-2']]);

    await expectAsync(participantsPromise).toBeResolvedTo(['participant-1', 'participant-2']);
  });

  it('returns a validated attempt including deletion-only change data', async () => {
    const attemptPromise = service.getExerciseAttempt('participant-1', 3);

    const request = httpTestingController.expectOne(
      request => request.url === '/snapshots'
        && request.params.get('participantId') === 'participant-1'
        && request.params.get('exercise_number') === '3'
    );
    request.flush({
      snapshots: [{ snapshot: 'x', timestamp: 100, compiled: true }],
      changes: [{
        changes: [0, [1]],
        timestamp: 101,
        annotations: ['delete.backward'],
        selections: [{ anchor: 0, head: 0 }]
      }],
      date: '2023-10-23T19:31:05',
      comments: null,
      id: 1
    });

    const attempt = await attemptPromise;
    expect(attempt.changes[0].changes).toEqual([0, [1]]);
  });

  it('rejects malformed attempt data', async () => {
    const attemptPromise = service.getExerciseAttempt('participant-1', 3);
    const rejected = expectAsync(attemptPromise).toBeRejectedWithError(
      'The snapshots API returned an invalid exercise attempt'
    );

    httpTestingController.expectOne(
      request => request.url === '/snapshots'
    ).flush({
        snapshots: [null],
        changes: [],
        date: '2023-10-23T19:31:05',
        comments: null,
        id: 1
      });

    await rejected;
  });
});
