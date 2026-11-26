import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ExerciseAttempt, isExerciseAttempt } from '../../types/types';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  constructor(private readonly http: HttpClient) {}

  async getParticipants(): Promise<string[]> {
    const response: unknown = await firstValueFrom(this.http.get<unknown>('/participants'));
    if (!Array.isArray(response) || !response.every(isParticipantRow)) {
      throw new Error('The participants API returned an invalid response');
    }

    return response.map(([participantId]) => participantId);
  }

  async getExerciseNumbers(participantId: string): Promise<number[]> {
    const params = new HttpParams().set('participantId', participantId);
    const response: unknown = await firstValueFrom(
      this.http.get<unknown>('/exercise_numbers', { params })
    );
    if (!Array.isArray(response) || !response.every(isExerciseNumberRow)) {
      throw new Error('The exercise numbers API returned an invalid response');
    }

    return response.map(([exerciseNumber]) => exerciseNumber);
  }

  async getExerciseAttempt(participantId: string, exerciseNumber: number): Promise<ExerciseAttempt> {
    const params = new HttpParams()
      .set('participantId', participantId)
      .set('exercise_number', exerciseNumber);
    const response: unknown = await firstValueFrom(
      this.http.get<unknown>('/snapshots', { params })
    );
    if (!isExerciseAttempt(response)) {
      throw new Error('The snapshots API returned an invalid exercise attempt');
    }

    return response;
  }
}

function isParticipantRow(value: unknown): value is [string] {
  return Array.isArray(value) && value.length === 1 && typeof value[0] === 'string';
}

function isExerciseNumberRow(value: unknown): value is [number] {
  return Array.isArray(value)
    && value.length === 1
    && typeof value[0] === 'number'
    && Number.isInteger(value[0]);
}
