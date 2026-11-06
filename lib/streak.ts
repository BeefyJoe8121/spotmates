import { addDays, today, weekStart } from './util';

export type StreakInfo = {
  /** Days in a row you've been on track (logged something, or a rest day) */
  n: number;
  /** Days that were covered by a rest day */
  rest: Set<string>;
  loggedToday: boolean;
  /** You still have this week's rest day */
  restLeft: boolean;
};

/**
 * Streak = days in a row you logged a meal, workout or PR.
 * You get one rest day per week (Mon–Sun): a single missed day doesn't break the streak.
 * Two missed days in a row, or two in one week, do. Today doesn't count against you until it's over.
 */
export function computeStreak(logged: Set<string>, t = today()): StreakInfo {
  const loggedToday = logged.has(t);
  let d = loggedToday ? t : addDays(t, -1);
  const counted: { day: string; rest: boolean }[] = [];
  const usedWeeks = new Set<string>();
  for (let i = 0; i < 1200; i++) {
    if (logged.has(d)) counted.push({ day: d, rest: false });
    else {
      const wk = weekStart(d);
      const prevWasRest = counted.length > 0 && counted[counted.length - 1].rest;
      if (usedWeeks.has(wk) || prevWasRest) break;
      usedWeeks.add(wk);
      counted.push({ day: d, rest: true });
    }
    d = addDays(d, -1);
  }
  // A streak can't start with a rest day
  while (counted.length && counted[counted.length - 1].rest) counted.pop();
  const rest = new Set(counted.filter((x) => x.rest).map((x) => x.day));
  const restLeft = ![...rest].some((x) => weekStart(x) === weekStart(t));
  return { n: counted.length, rest, loggedToday, restLeft };
}
