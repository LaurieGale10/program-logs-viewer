export function calculateTimeDifference(timestamp1: number, timestamp2: number): string {
  if (timestamp1 != null && timestamp2 != null) {
    const difference = (timestamp2 - timestamp1) / 1000;
    const minutes = Math.floor(difference / 60);
    if (minutes === 0) {
      return difference.toFixed(3) + " seconds";
    }
    const seconds = difference - minutes * 60;
    return minutes + " minutes " + seconds.toFixed(3) + " seconds";
  }
  throw new Error("Don't have two timestamps to compare against");
}
