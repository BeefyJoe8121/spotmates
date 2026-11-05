export const pad = (n: number) => String(n).padStart(2, '0');
export const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dayStr(new Date());
export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return dayStr(d);
};
export const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};
export const fmt = (n: number | null | undefined) => (n == null ? '–' : Math.round(n).toLocaleString());

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function dayLabel(s: string) {
  const t = today();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  const d = parseDay(s);
  return `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`;
}
export function timeOf(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())} ${ap}`;
}
export function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60e3) return 'now';
  if (ms < 3600e3) return `${Math.floor(ms / 60e3)}m`;
  if (ms < 864e5) return `${Math.floor(ms / 3600e3)}h`;
  return `${Math.floor(ms / 864e5)}d`;
}

/** Meal posts and workout photos stay up for 3 days */
export const POST_TTL_MS = 72 * 3600e3;
export const ageMs = (iso: string) => Date.now() - new Date(iso).getTime();
export function ttlText(iso: string) {
  const left = POST_TTL_MS - ageMs(iso);
  if (left <= 0) return 'Expiring';
  const h = Math.ceil(left / 3600e3);
  return h > 24 ? `Gone in ${Math.ceil(h / 24)} days` : `Gone in ${h}h`;
}

/** Calories from macros: protein and carbs 4 kcal/g, fat 9 kcal/g */
export const macroKcal = (p?: number | null, c?: number | null, f?: number | null) =>
  (p || 0) * 4 + (c || 0) * 4 + (f || 0) * 9;

export function pctToGrams(kcal: number | null, pp: number | null, pc: number | null, pf: number | null) {
  return {
    protein: pp != null && kcal ? Math.round((kcal * pp) / 100 / 4) : null,
    carbs: pc != null && kcal ? Math.round((kcal * pc) / 100 / 4) : null,
    fat: pf != null && kcal ? Math.round((kcal * pf) / 100 / 9) : null,
  };
}

export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
