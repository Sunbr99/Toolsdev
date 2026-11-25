export function getUnixSeconds(d: Date = new Date()): number {
  return Math.floor(d.getTime() / 1000);
}

export function getUnixMillis(d: Date = new Date()): number {
  return d.getTime();
}

export function formatRelativeTimeFromNow(timestampMs: number): string {
  const diffSec = Math.floor((timestampMs - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  }
  const diffMin = Math.floor(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }
  const diffHour = Math.floor(diffMin / 60);
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  }
  const diffDay = Math.floor(diffHour / 24);
  return rtf.format(diffDay, 'day');
}
