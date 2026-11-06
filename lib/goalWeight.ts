/** Goal weight planner: maintenance calories (Mifflin-St Jeor + workouts, or your watch) and a daily calorie target */
import { addDays, fmt, num, today } from './util';

export type WG = {
  cur: string; goal: string; sex: '' | 'm' | 'f'; age: string; ft: string; inch: string; freq: string;
  intensity: 'light' | 'moderate' | 'hard' | 'max'; pace: 'slow' | 'rec' | 'fast'; mode: 'calc' | 'watch'; maint: string; eat: string;
};
export type SavedPlan = Partial<Record<keyof WG, any>> & { start?: number; startDay?: string };

export const INTENSITY: [WG['intensity'], string, string][] = [
  ['light', 'Light', 'Walking, easy cardio, stretching'],
  ['moderate', 'Moderate', 'Regular lifting, jogging, pickup games'],
  ['hard', 'Hard', 'Heavy lifting with short rests, running, practice'],
  ['max', 'All-out', 'Two-a-days, HIIT, training for a sport'],
];
export const PACES: Record<'lose' | 'gain', [WG['pace'], string, string][]> = {
  lose: [['slow', 'Slower', '0.5% of bodyweight a week'], ['rec', 'Recommended', '0.75% of bodyweight a week'], ['fast', 'Faster', '1% of bodyweight a week']],
  gain: [['slow', 'Slower', '0.25 lb a week, least fat gain'], ['rec', 'Recommended', '0.5 lb a week, lean bulk'], ['fast', 'Faster', '0.75 lb a week, more fat gain']],
};

export type WGResult = {
  need?: string; warn?: string; maint?: boolean; tdee?: number; kcal?: number; watch?: boolean;
  lose?: boolean; rate?: number; weeks?: number; date?: string; floored?: boolean; note?: string; fromEat?: boolean; goal?: number;
};

export function wgCalc(w: WG): WGResult {
  const cur = num(w.cur), goal = num(w.goal), age = num(w.age), ft = num(w.ft), inch = num(w.inch) || 0;
  const freq = Math.min(7, Math.max(0, num(w.freq) ?? 0));
  const watch = w.mode === 'watch';
  if (!cur || !goal) return { need: 'Enter your current weight and your goal weight.' };
  if (cur < 60 || cur > 700 || goal < 60 || goal > 700) return { need: 'Check your weights. Enter them in pounds.' };
  const hIn = ft ? ft * 12 + inch : null;
  let bmr: number | null = null, tdee: number;
  if (watch) {
    const m = num(w.maint);
    if (!m) return { need: 'Enter the calories your watch says you burn on an average day.' };
    if (m < 1000 || m > 7000) return { need: "Check your maintenance calories. Use your watch's daily average (total calories, not just active)." };
    if (hIn && (hIn < 48 || hIn > 96)) return { need: 'Check your height.' };
    tdee = m;
  } else {
    if (!w.sex || !age || !ft) return { need: 'Add sex, age and height so the calorie math fits you.' };
    if (age < 13 || age > 100) return { need: 'Enter an age between 13 and 100.' };
    if (!hIn || hIn < 48 || hIn > 96) return { need: 'Check your height.' };
    const kg = cur * 0.45359, cm = hIn * 2.54;
    bmr = 10 * kg + 6.25 * cm - 5 * age + (w.sex === 'm' ? 5 : -161);
    const k = { light: 0.03, moderate: 0.045, hard: 0.06, max: 0.075 }[w.intensity] ?? 0.045;
    tdee = bmr * Math.min(1.9, 1.2 + freq * k);
  }
  const bmiGoal = hIn ? (703 * goal) / (hIn * hIn) : null;
  const diff = goal - cur;
  const base = { tdee, watch, goal };
  if (Math.abs(diff) < 1) return { ...base, maint: true, kcal: Math.round(tdee / 10) * 10 };
  if (diff < 0 && bmiGoal != null && bmiGoal < 18.5) return { ...base, warn: `A goal of ${fmt(goal)} lb is below the healthy weight range for your height. Talk with a doctor or dietitian before aiming that low.` };
  const lose = diff < 0;
  const floor = Math.max(w.sex === 'm' ? 1500 : 1200, bmr ? bmr * 0.9 : 0);
  const maxLose = Math.min(2, Math.max(0.5, cur * 0.01)), maxGain = 1;
  let rate: number, kcal: number, floored = false, note = '';
  const eat = watch ? num(w.eat) : null;
  if (eat) {
    if (eat < 800 || eat > 8000) return { ...base, need: 'Check the calories you plan to eat.' };
    const delta = tdee - eat;
    if (lose && delta <= 0) return { ...base, warn: `Eating ${fmt(eat)} a day is at or above your ${fmt(tdee)} maintenance, so you wouldn't lose weight. Try a number below maintenance.` };
    if (!lose && delta >= 0) return { ...base, warn: `Eating ${fmt(eat)} a day is at or below your ${fmt(tdee)} maintenance, so you wouldn't gain weight. Try a number above maintenance.` };
    kcal = eat; rate = (Math.abs(delta) * 7) / 3500;
    const safe = Math.round(Math.max(floor, tdee - maxLose * 500) / 10) * 10;
    if (lose && kcal < floor) { kcal = safe; rate = (tdee - safe) / 500; floored = true; note = `${fmt(eat)} a day is below a safe minimum, so this plan uses ${fmt(safe)} instead.`; }
    else if (lose && rate > maxLose) note = `That's faster than the ${maxLose.toFixed(1)} lb a week that's usually sustainable without losing muscle. Around ${fmt(safe)} a day would be safer.`;
    else if (!lose && rate > maxGain) note = 'Gaining over 1 lb a week usually adds more fat than muscle.';
  } else {
    rate = lose ? Math.min(2, Math.max(0.5, cur * ({ slow: 0.005, rec: 0.0075, fast: 0.01 }[w.pace] ?? 0.0075))) : ({ slow: 0.25, rec: 0.5, fast: 0.75 }[w.pace] ?? 0.5);
    kcal = tdee + (lose ? -1 : 1) * rate * 500;
    if (lose && kcal < floor) { kcal = floor; rate = (tdee - floor) / 500; floored = true; }
  }
  if (lose && rate < 0.2) return { ...base, warn: `Your maintenance is about ${fmt(tdee)} kcal a day, so there isn't room for a safe deficit right now. Adding workouts or more activity would make room.` };
  const weeks = Math.ceil(Math.abs(diff) / rate);
  return { ...base, lose, rate, kcal: Math.round(kcal / 10) * 10, weeks, date: addDays(today(), weeks * 7), floored, note, fromEat: !!eat };
}

export function wgFrom(saved: SavedPlan | null, latest: number | null, workoutGoal: number): WG {
  const s = saved ?? {};
  const str = (v: any) => (v == null ? '' : String(v));
  return {
    cur: str(latest ?? s.cur), goal: str(s.goal), sex: s.sex ?? '', age: str(s.age), ft: str(s.ft), inch: str(s.inch),
    freq: str(s.freq ?? workoutGoal), intensity: s.intensity ?? 'moderate', pace: s.pace ?? 'rec', mode: s.mode ?? 'calc', maint: str(s.maint), eat: str(s.eat),
  };
}
