import type { Post } from './data';
import { num } from './util';

/** Estimated 1-rep max (Epley) */
export const e1rm = (lbs: number, reps: number) => (reps > 1 ? lbs * (1 + reps / 30) : lbs);
export const exKey = (n: string | null | undefined) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
export const prLbs = (p: Post) => num(p.lbs) || 0;
export const prReps = (p: Post) => num(p.reps) || 1;
export const prScore = (p: Post) => e1rm(prLbs(p), prReps(p));

/** The person's best earlier PR on the same lift, or null */
export function prevBest(all: Post[], p: { id: string; author: string; title: string | null; day: string; created_at: string }) {
  const k = exKey(p.title);
  const older = all.filter((x) => x.author === p.author && x.id !== p.id && exKey(x.title) === k && (x.day < p.day || (x.day === p.day && x.created_at < p.created_at)));
  if (!older.length) return null;
  return older.reduce((b, x) => (prScore(x) > prScore(b) ? x : b));
}

export const TROPHY = '<svg viewBox="0 0 24 24"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v3H8v-3h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1.2 1.8A5 5 0 0 1 7 8.7V7zm10 0v1.7c0 .4 0 .8-.2 1.1A2 2 0 0 0 18 8V7h-1z" fill="#E0A526"/></svg>';
