import { calculateTimeDifference } from './time-utils';

describe('calculateTimeDifference', () => {
  it('formats a difference shorter than a minute in seconds', () => {
    expect(calculateTimeDifference(1000, 2500)).toBe('1.500 seconds');
  });

  it('formats a difference of at least a minute in minutes and seconds', () => {
    expect(calculateTimeDifference(1000, 62500)).toBe('1 minutes 1.500 seconds');
  });
});
