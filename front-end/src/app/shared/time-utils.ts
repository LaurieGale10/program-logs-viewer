export function calculateTimeDifference(timestamp1: number, timestamp2: number): string {
  if (timestamp1 != null && timestamp2 != null) {
    const differenceSeconds = Math.trunc((timestamp2 - timestamp1) / 1000);
    const sign = differenceSeconds < 0 ? '-' : '';
    const absoluteSeconds = Math.abs(differenceSeconds);
    const totalMinutes = Math.floor(absoluteSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = absoluteSeconds % 60;
    const time = hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${sign}${time}`;
  }
  throw new Error("Don't have two timestamps to compare against");
}
