import { calculateTimeDifference } from './time-utils';

describe('calculateTimeDifference', () => {
  it('formats a difference shorter than a minute as mm:ss', () => {
    expect(calculateTimeDifference(1000, 2500)).toBe('00:01');
  });

  it('pads minutes and seconds for a difference of at least a minute', () => {
    expect(calculateTimeDifference(1000, 62500)).toBe('01:01');
  });

  it('includes hours for durations of an hour or more', () => {
    expect(calculateTimeDifference(0, 3600000)).toBe('01:00:00');
    expect(calculateTimeDifference(0, 90000000)).toBe('25:00:00');
  });

  it('truncates fractional seconds like a video player', () => {
    expect(calculateTimeDifference(0, 1999)).toBe('00:01');
  });
});
