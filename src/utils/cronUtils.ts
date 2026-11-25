export interface CronPreset {
  name: string;
  expression: string;
  description: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { name: 'Every minute', expression: '* * * * *', description: 'Executes every single minute' },
  { name: 'Every 5 minutes', expression: '*/5 * * * *', description: 'Executes every 5 minutes' },
  { name: 'Every hour at :00', expression: '0 * * * *', description: 'Executes at minute 0 of every hour' },
  { name: 'Daily at midnight (00:00)', expression: '0 0 * * *', description: 'Executes every day at 00:00' },
  { name: 'Weekdays at 9:00 AM', expression: '0 9 * * 1-5', description: 'Executes at 09:00 AM Monday through Friday' },
  { name: 'Every Sunday at midnight', expression: '0 0 * * 0', description: 'Executes once a week on Sunday midnight' },
  { name: '1st of every month at 00:00', expression: '0 0 1 * *', description: 'Executes at 00:00 on day 1 of every month' },
];

export function explainCron(expression: string): { explanation: string; isValid: boolean; error?: string } {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      isValid: false,
      explanation: 'Standard cron requires 5 fields: [minute] [hour] [day-of-month] [month] [day-of-week]',
      error: `Expected 5 fields, got ${parts.length}`,
    };
  }

  const [min, hour, dom, mon, dow] = parts;

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  let desc = 'Runs ';

  // Minute
  if (min === '*') {
    desc += 'every minute';
  } else if (min.startsWith('*/')) {
    desc += `every ${min.slice(2)} minutes`;
  } else {
    desc += `at minute ${min}`;
  }

  // Hour
  if (hour === '*') {
    desc += ' of every hour';
  } else if (hour.startsWith('*/')) {
    desc += ` every ${hour.slice(2)} hours`;
  } else {
    desc += ` at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }

  // Day of Month
  if (dom !== '*') {
    desc += `, on day ${dom} of the month`;
  }

  // Month
  if (mon !== '*') {
    const monNum = parseInt(mon, 10);
    desc += ` in ${monthNames[monNum] || mon}`;
  }

  // Day of Week
  if (dow !== '*') {
    if (dow.includes('-')) {
      const [start, end] = dow.split('-').map(Number);
      desc += `, ${dayNames[start] || start} through ${dayNames[end] || end}`;
    } else {
      const dowNum = parseInt(dow, 10);
      desc += `, on ${dayNames[dowNum] || dow}`;
    }
  }

  return { explanation: desc, isValid: true };
}

// Compute the next 5 simulated occurrences
export function computeNextOccurrences(expression: string, count: number = 5): Date[] {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return [];

  const [minPart, hourPart, domPart, , dowPart] = parts;

  const results: Date[] = [];
  const current = new Date();
  current.setSeconds(0, 0);

  // Check matching
  function matchField(val: number, expr: string): boolean {
    if (expr === '*') return true;
    if (expr.startsWith('*/')) {
      const step = parseInt(expr.slice(2), 10);
      return step > 0 && val % step === 0;
    }
    if (expr.includes('-')) {
      const [start, end] = expr.split('-').map(Number);
      return val >= start && val <= end;
    }
    if (expr.includes(',')) {
      return expr.split(',').map(Number).includes(val);
    }
    return parseInt(expr, 10) === val;
  }

  const cursor = new Date(current.getTime() + 60000); // start from next minute
  let iterations = 0;

  while (results.length < count && iterations < 50000) {
    iterations++;
    const minute = cursor.getMinutes();
    const hour = cursor.getHours();
    const dom = cursor.getDate();
    const dow = cursor.getDay();

    if (
      matchField(minute, minPart) &&
      matchField(hour, hourPart) &&
      matchField(dom, domPart) &&
      matchField(dow, dowPart)
    ) {
      results.push(new Date(cursor.getTime()));
    }

    cursor.setTime(cursor.getTime() + 60000); // step by 1 minute
  }

  return results;
}
