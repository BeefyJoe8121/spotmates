import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

// ---------- Palettes ----------
const light = {
  bg: '#EEF1EE', surface: '#FFFFFF', sunk: '#E3E8E4', ink: '#16201C', muted: '#5B6862', line: '#D3DAD5',
  accent: '#2445C9', accentInk: '#FFFFFF',
  meal: '#B9501A', mealSoft: '#F7E4D8', lift: '#2445C9', liftSoft: '#DFE5FA',
  protein: '#0E7A6A', water: '#2F86D0', gold: '#E0A526', danger: '#B42318',
};
const dark: typeof light = {
  bg: '#0F1412', surface: '#182019', sunk: '#121915', ink: '#E6ECE8', muted: '#93A099', line: '#29332E',
  accent: '#8099FF', accentInk: '#0B1020',
  meal: '#F08C52', mealSoft: '#3A2418', lift: '#8099FF', liftSoft: '#1C2444',
  protein: '#3CC4AF', water: '#6CB8F2', gold: '#E6C05A', danger: '#FF7A6E',
};
export type Palette = typeof light;

/** Color schemes: p = protein and your color, c = carbs, f = fat and meal tags, a = buttons. L = light mode, D = dark mode */
type Sw = { p: string; c: string; f: string; a: string };
export const SCHEMES: { id: string; name: string; sub?: string; tint?: string; L?: Sw; D?: Sw }[] = [
  { id: 'auto', name: 'Classic', sub: 'The original Spot Mates colors' },
  { id: 'halloween', name: 'Halloween', L: { p: '#D86A12', c: '#7B3FB5', f: '#2E8B57', a: '#C25E0E' }, D: { p: '#F29A3A', c: '#A97BE0', f: '#5CC98A', a: '#F29A3A' } },
  { id: 'thanksgiving', name: 'Thanksgiving', L: { p: '#9C3D1D', c: '#B87A1E', f: '#6E7A2E', a: '#9C3D1D' }, D: { p: '#E07A52', c: '#E6B35A', f: '#A8B860', a: '#E07A52' } },
  { id: 'christmas', name: 'Christmas', L: { p: '#B3262E', c: '#1F7A4A', f: '#B8862A', a: '#B3262E' }, D: { p: '#F0626A', c: '#4CC488', f: '#E8C15A', a: '#F0626A' } },
  { id: 'newyear', name: "New Year's", L: { p: '#A8841F', c: '#3D4BB8', f: '#6E7888', a: '#3D4BB8' }, D: { p: '#E6C05A', c: '#8C98FF', f: '#C0C8D4', a: '#8C98FF' } },
  { id: 'valentine', name: "Valentine's Day", L: { p: '#C9344F', c: '#D9578E', f: '#8E3B6B', a: '#C9344F' }, D: { p: '#F06A84', c: '#F59AC2', f: '#D07BB0', a: '#F06A84' } },
  { id: 'stpatricks', name: "Paddy's Day", L: { p: '#1E7A47', c: '#36A363', f: '#B8862A', a: '#1E7A47' }, D: { p: '#4CC488', c: '#8BE0A8', f: '#E8C15A', a: '#4CC488' } },
  { id: 'easter', name: 'Easter', L: { p: '#7E5BC9', c: '#2E93AE', f: '#D9668A', a: '#7E5BC9' }, D: { p: '#B79CF2', c: '#7FD3E8', f: '#F5A9C0', a: '#B79CF2' } },
  { id: 'laborday', name: 'Labor Day', L: { p: '#B3262E', c: '#2747A8', f: '#6B7280', a: '#2747A8' }, D: { p: '#F0626A', c: '#7FA0FF', f: '#B4BCC8', a: '#7FA0FF' } },
  { id: 'summer', name: 'Summer Break', L: { p: '#D9831C', c: '#1A86A0', f: '#D9456E', a: '#1A86A0' }, D: { p: '#F5B35A', c: '#5CCDE3', f: '#F58AA6', a: '#5CCDE3' } },
  { id: 'bears', name: 'Chicago Bears', tint: '#0B162A', L: { p: '#C83803', c: '#1C2F55', f: '#7C8AA3', a: '#0B162A' }, D: { p: '#F0743E', c: '#7F98C9', f: '#B9C3D3', a: '#F0743E' } },
  { id: 'vols', name: 'Tennessee Volunteers', tint: '#FF8200', L: { p: '#E07000', c: '#58595B', f: '#517C96', a: '#E07000' }, D: { p: '#FF9A33', c: '#A3A5A8', f: '#8FB6CC', a: '#FF9A33' } },
  { id: 'camo', name: 'Camo', tint: '#556B2F', L: { p: '#4E6B2E', c: '#8C6D45', f: '#2F3B26', a: '#4E6B2E' }, D: { p: '#8FB35A', c: '#C9A878', f: '#6E8A5A', a: '#8FB35A' } },
];

/** Blend two #RRGGBB colors; t = share of the first */
function mix(a: string, b: string, t: number) {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [r1, g1, b1] = h(a), [r2, g2, b2] = h(b);
  const c = (x: number, y: number) => Math.round(x * t + y * (1 - t)).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

function buildPalette(isDark: boolean, schemeId: string): Palette {
  const base = isDark ? dark : light;
  const sc = SCHEMES.find((x) => x.id === schemeId);
  if (!sc?.L || !sc.D) return base;
  const v = isDark ? sc.D : sc.L;
  return {
    ...base,
    accent: v.a, protein: v.p, lift: v.c, meal: v.f,
    liftSoft: mix(v.c, base.surface, 0.16), mealSoft: mix(v.f, base.surface, 0.16),
    bg: sc.tint ? mix(sc.tint, base.bg, isDark ? 0.12 : 0.08) : base.bg,
  };
}

// ---------- Streak flame colors (the streak itself is in lib/streak.ts) ----------
export type Tier = { at: number; name: string; c: string[]; core: string };
/** Flame color by streak milestone. To add a milestone, add a row (at = days in a row). */
export const TIERS: Tier[] = [
  { at: 0, name: 'Getting started', c: ['#E8461E', '#F2862B', '#F7C33B'], core: '#FFE08A' },
  { at: 7, name: '1 week', c: ['#A3111C', '#E5332A', '#FF7A45'], core: '#FFC2A1' },
  { at: 30, name: '1 month', c: ['#A8105F', '#E0408F', '#FF8CC6'], core: '#FFD3EA' },
  { at: 50, name: '50 days', c: ['#5B1FA6', '#8B47E0', '#C39BFF'], core: '#EBDDFF' },
  { at: 100, name: '100 days', c: ['#1740B8', '#2F6BEB', '#7FB0FF'], core: '#D6E6FF' },
  { at: 150, name: '150 days', c: ['#06707A', '#14A7B3', '#6FE3E8'], core: '#D2FAFB' },
  { at: 182, name: '6 months', c: ['#137A35', '#25A84E', '#7FE08F'], core: '#DDFBE2' },
  { at: 200, name: '200 days', c: ['#9C6A00', '#D9A21B', '#FFE07A'], core: '#FFF6CC' },
  { at: 250, name: '250 days', c: ['#5F6875', '#A8B0BC', '#F1F4F8'], core: '#FFFFFF' },
  { at: 300, name: '300 days', c: ['#3A1660', '#7A2E9E', '#E0567A'], core: '#FFB38A' },
  { at: 365, name: '1 year', c: ['#E5332A', '#F2862B', '#E6C05A', '#25A84E', '#2F6BEB', '#8B47E0'], core: '#FFFFFF' },
];
export const tierFor = (n: number) => TIERS.reduce((best, t, i) => (n >= t.at ? i : best), 0);

// ---------- Saved preferences (per phone) ----------
type Mode = 'system' | 'light' | 'dark';
type Prefs = { mode: Mode; scheme: string; streakIcon: 'holiday' | 'fire' };
const store = {
  get(k: string, d: string) { try { return (globalThis as any).localStorage?.getItem(`spotmates-${k}`) ?? d; } catch { return d; } },
  set(k: string, v: string) { try { (globalThis as any).localStorage?.setItem(`spotmates-${k}`, v); } catch {} },
};

type Ctx = {
  palette: Palette; isDark: boolean; prefs: Prefs; setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
};
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    mode: store.get('mode', 'system') as Mode,
    scheme: store.get('scheme', 'auto'),
    streakIcon: store.get('streakicon', 'holiday') as Prefs['streakIcon'],
  }));
  const setPref = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    store.set(k === 'streakIcon' ? 'streakicon' : k, String(v));
    setPrefs((p) => ({ ...p, [k]: v }));
  }, []);

  const isDark = prefs.mode === 'system' ? system === 'dark' : prefs.mode === 'dark';
  const palette = useMemo(() => buildPalette(isDark, prefs.scheme), [isDark, prefs.scheme]);
  const value = useMemo(() => ({ palette, isDark, prefs, setPref }), [palette, isDark, prefs, setPref]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Palette {
  const ctx = useContext(ThemeCtx);
  const system = useColorScheme();
  return ctx?.palette ?? (system === 'dark' ? dark : light);
}
export function useAppPrefs() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useAppPrefs outside ThemeProvider');
  return ctx;
}

/** Fonts built into the phone, so nothing needs downloading */
const ios = Platform.OS === 'ios';
export const F = {
  display: ios ? 'AvenirNextCondensed-Heavy' : 'sans-serif-condensed',
  displayBlack: ios ? 'AvenirNextCondensed-Heavy' : 'sans-serif-condensed',
  body: ios ? 'AvenirNext-Regular' : 'sans-serif',
  bodySemi: ios ? 'AvenirNext-DemiBold' : 'sans-serif-medium',
  bodyBold: ios ? 'AvenirNext-Bold' : 'sans-serif-medium',
  mono: ios ? 'Menlo-Regular' : 'monospace',
  monoSemi: ios ? 'Menlo-Bold' : 'monospace',
};
