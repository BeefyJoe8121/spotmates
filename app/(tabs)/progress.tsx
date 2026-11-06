import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, SvgXml, Text as SvgText } from 'react-native-svg';
import { Btn, Card, Chip, Field, H, Label, Seg, T } from '@/components/ui';
import { useData } from '@/lib/data';
import { INTENSITY, PACES, SavedPlan, WG, wgCalc, wgFrom } from '@/lib/goalWeight';
import { e1rm, prevBest, prLbs, prReps, prScore, TROPHY } from '@/lib/prs';
import { supabase } from '@/lib/supabase';
import { F, useAppPrefs, useTheme } from '@/lib/theme';
import { addDays, dayLabel, dayStr, fmt, MON, num, parseDay, pctToGrams, shortDay, today, weekStart } from '@/lib/util';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
type Weigh = { id: string; day: string; lbs: number; created_at: string };
const missingTable = (e: any) => !!e && (/does not exist|Could not find the table|schema cache/i.test(e.message ?? '') || e.code === '42P01' || e.code === 'PGRST205');

/** Progress is personal: only your own calendar, workouts, weigh-ins and goal */
export default function ProgressScreen() {
  const c = useTheme();
  const { uid, posts, prs, profile, refresh, loading } = useData();
  const { streak } = useAppPrefs();
  const [days, setDays] = useState<{ day: string; kind: string }[]>([]);
  const [weights, setWeights] = useState<Weigh[]>([]);
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  // A year of my meal/workout days (feed posts only cover 60 days)
  const loadDays = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('posts').select('day,kind').eq('author', uid).in('kind', ['meal', 'workout']).gte('day', addDays(today(), -400)).limit(3000);
    setDays((data as any[]) ?? []);
  }, [uid]);
  const loadWeights = useCallback(async () => {
    if (!uid) return;
    const { data, error } = await supabase.from('weighins').select('id,day,lbs,created_at').eq('user_id', uid).order('day').limit(1000);
    if (missingTable(error)) setNeedsUpdate(true);
    setWeights(((data as any[]) ?? []).map((w) => ({ ...w, lbs: Number(w.lbs) })));
  }, [uid]);
  const loadPlan = useCallback(async () => {
    if (!uid) return;
    const { data, error } = await supabase.from('goal_plans').select('plan').eq('user_id', uid).maybeSingle();
    if (missingTable(error)) setNeedsUpdate(true);
    setPlan((data as any)?.plan ?? null); setPlanLoaded(true);
  }, [uid]);

  useEffect(() => { loadDays(); }, [loadDays, posts.length]);
  useEffect(() => { loadWeights(); loadPlan(); }, [loadWeights, loadPlan]);

  const workoutDays = useMemo(() => {
    const s = new Set(days.filter((d) => d.kind === 'workout').map((d) => d.day));
    posts.forEach((p) => { if (p.author === uid && p.kind === 'workout') s.add(p.day); });
    return s;
  }, [days, posts, uid]);
  const mealDays = useMemo(() => {
    const s = new Set(days.filter((d) => d.kind === 'meal').map((d) => d.day));
    posts.forEach((p) => { if (p.author === uid && p.kind === 'meal') s.add(p.day); });
    return s;
  }, [days, posts, uid]);
  const myPrs = useMemo(() => prs.filter((p) => p.author === uid), [prs, uid]);
  const latest = weights.length ? [...weights].sort((a, b) => (a.day === b.day ? a.created_at.localeCompare(b.created_at) : a.day < b.day ? -1 : 1)).pop()!.lbs : null;

  const t = today(), ws = weekStart(t);
  const goalW = profile?.workout_goal ?? 4;
  const wCount = [...workoutDays].filter((d) => weekStart(d) === ws).length;
  const mCount = days.filter((d) => d.kind === 'meal' && weekStart(d.day) === ws).length;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { refresh(); loadDays(); loadWeights(); loadPlan(); }} tintColor={c.muted} />}>
        {needsUpdate ? (
          <Card style={{ borderColor: c.danger }}>
            <T bold>One-time database update needed</T>
            <T muted size={13}>Weigh-ins, goal weight and PRs need the progress update run in Supabase (SQL Editor → paste the file supabase/2026-11-06-progress.sql → Run). Then pull down to refresh.</T>
          </Card>
        ) : null}

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <H size={22}>This week</H>
            <T mono muted size={12}>Week of {shortDay(ws)} · Mon–Sun</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Stat value={`${wCount}`} sub={`/${goalW}`} label="Workout days">
              <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
                {Array.from({ length: Math.max(goalW, wCount) }, (_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < wCount ? c.protein : c.sunk }} />)}
              </View>
            </Stat>
            <Stat value={`${mCount}`} label="Meals logged" />
            <Stat value={`${streak}`} label="Day streak" />
          </View>
          <MonthCal workoutDays={workoutDays} mealDays={mealDays} prs={myPrs} allPrs={prs} />
        </Card>

        <WeeksChart workoutDays={workoutDays} goal={goalW} />
        <WeightSection weights={weights} reload={loadWeights} onMissing={() => setNeedsUpdate(true)} />
        {planLoaded ? <GoalWeight saved={plan} latest={latest} onSaved={setPlan} onMissing={() => setNeedsUpdate(true)} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stat({ value, sub, label, children }: { value: string; sub?: string; label: string; children?: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.sunk, borderRadius: 12, padding: 10, gap: 2 }}>
      <T style={{ fontFamily: F.displayBlack, fontSize: 30, lineHeight: 32 }}>{value}{sub ? <T muted size={15}>{sub}</T> : null}</T>
      <T muted size={12}>{label}</T>
      {children}
    </View>
  );
}

function Nav({ label, off, setOff }: { label: string; off: number; setOff: (n: number) => void }) {
  const c = useTheme();
  const b = (txt: string, onPress: () => void, a11y: string) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={8}
      style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
      <T bold size={18}>{txt}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {b('‹', () => setOff(off - 1), 'Earlier')}
      <T bold size={14} style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>{label}</T>
      {b('›', () => setOff(off + 1), 'Later')}
      {off ? <Pressable onPress={() => setOff(0)} accessibilityRole="button" hitSlop={6}><T bold size={13} style={{ color: c.accent }}>Now</T></Pressable> : null}
    </View>
  );
}

// ---------- Month calendar ----------
function MonthCal({ workoutDays, mealDays, prs, allPrs }: { workoutDays: Set<string>; mealDays: Set<string>; prs: ReturnType<typeof useData>['prs']; allPrs: ReturnType<typeof useData>['prs'] }) {
  const c = useTheme();
  const [off, setOff] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const y = first.getFullYear(), m = first.getMonth();
  const lead = first.getDay(), count = new Date(y, m + 1, 0).getDate(), rows = Math.ceil((lead + count) / 7);
  const start = addDays(dayStr(first), -lead);
  const t = today();
  const prDays = new Set(prs.map((p) => p.day));
  const picked = pick ? prs.filter((p) => p.day === pick).sort((a, b) => a.created_at.localeCompare(b.created_at)) : [];

  return (
    <View style={{ gap: 8 }}>
      <Nav label={`${MONTHS[m]} ${y}`} off={off} setOff={(n) => { setOff(n); setPick(null); }} />
      <View style={{ flexDirection: 'row' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <T key={i} muted bold size={11} style={{ flex: 1, textAlign: 'center' }}>{d}</T>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: rows * 7 }, (_, i) => {
          const d = addDays(start, i), dt = parseDay(d);
          const out = dt.getMonth() !== m, w = workoutDays.has(d), ml = mealDays.has(d), pr = prDays.has(d), isToday = d === t;
          const cell = (
            <View style={{ flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: w ? c.protein : c.sunk, opacity: out ? 0.35 : d > t ? 0.55 : 1, borderWidth: isToday ? 2 : pick === d ? 2 : 0, borderColor: pick === d ? c.gold : c.ink }}>
              <T size={13} bold={isToday} style={{ color: w ? c.surface : c.ink }}>{dt.getDate()}</T>
              {ml ? <View style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: w ? c.surface : c.meal }} /> : null}
              {pr ? <View style={{ position: 'absolute', top: 2, right: 2 }}><SvgXml xml={TROPHY} width={12} height={12} /></View> : null}
            </View>
          );
          return (
            <View key={d} style={{ width: `${100 / 7}%` as `${number}%`, aspectRatio: 1, padding: 2 }}>
              {pr ? <Pressable style={{ flex: 1 }} onPress={() => setPick(pick === d ? null : d)} accessibilityRole="button" accessibilityLabel={`PR on ${dayLabel(d)}`}>{cell}</Pressable> : cell}
            </View>
          );
        })}
      </View>
      {picked.length ? (
        <View style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: c.gold }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <SvgXml xml={TROPHY} width={18} height={18} />
            <T bold size={14} style={{ flex: 1 }}>Your PR{picked.length > 1 ? 's' : ''} · {shortDay(pick!)}</T>
            <Pressable onPress={() => setPick(null)} hitSlop={8} accessibilityLabel="Close"><T muted>✕</T></Pressable>
          </View>
          {picked.map((p) => {
            const lbs = prLbs(p), reps = prReps(p), pb = prevBest(allPrs, p), dl = pb ? Math.round(prScore(p) - prScore(pb)) : null;
            return (
              <View key={p.id}>
                <T bold size={15}>{p.title}</T>
                <T mono size={13}>{fmt(lbs)} lb × {fmt(reps)}{reps > 1 ? ` · est. 1RM ${fmt(e1rm(lbs, reps))}` : ''}</T>
                {dl != null && dl > 0 ? <T size={12} style={{ color: c.protein }}>+{fmt(dl)} lb over last PR</T> : !pb ? <T muted size={12}>First logged PR for this lift</T> : null}
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Legend color={c.protein} label="Workout day" />
        <Legend color={c.meal} label="Meal logged" round />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><SvgXml xml={TROPHY} width={12} height={12} /><T muted size={12}>PR (tap it)</T></View>
      </View>
    </View>
  );
}

function Legend({ color, label, round, dashed }: { color: string; label: string; round?: boolean; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: round ? 5 : 2, backgroundColor: dashed ? 'transparent' : color, borderWidth: dashed ? 1.5 : 0, borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
      <T muted size={12}>{label}</T>
    </View>
  );
}

function useWidth(): [number, (e: any) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

// ---------- Workout days per week ----------
function WeeksChart({ workoutDays, goal }: { workoutDays: Set<string>; goal: number }) {
  const c = useTheme();
  const [off, setOff] = useState(0);
  const [W, onLayout] = useWidth();
  const cur = weekStart(today()), start = addDays(cur, 56 * off);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(start, 7 * i));
  const data = weeks.map((w) => [...workoutDays].filter((d) => weekStart(d) === w).length);
  const maxV = Math.max(4, goal, ...data);
  const CH = 190, L = 22, R = 4, T0 = 14, B = 26, ih = CH - T0 - B, cw = W ? (W - L - R) / 8 : 0;
  const y = (v: number) => T0 + ih - (v / maxV) * ih;
  return (
    <Card>
      <H size={22}>Workout days per week</H>
      <Nav label={off ? `8 weeks from ${shortDay(start)}` : 'This week and the next 7'} off={off} setOff={setOff} />
      <View onLayout={onLayout} style={{ width: '100%' }}>
        {W ? (
          <Svg width={W} height={CH}>
            {Array.from({ length: maxV + 1 }, (_, v) => v).filter((v) => maxV <= 8 || v % 2 === 0).map((v) => (
              <React.Fragment key={v}>
                <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={c.line} strokeWidth={1} />
                <SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={c.muted} textAnchor="end">{v}</SvgText>
              </React.Fragment>
            ))}
            {weeks.map((w, i) => {
              const x0 = L + i * cw, bw = cw * 0.58, bx = x0 + (cw - bw) / 2, v = data[i], gh = (goal / maxV) * ih;
              return (
                <React.Fragment key={w}>
                  {w === cur ? <Rect x={x0 + 1} y={T0} width={cw - 2} height={ih} rx={6} fill={c.sunk} /> : null}
                  {w >= cur ? <Rect x={bx} y={T0 + ih - gh} width={bw} height={gh} rx={3} fill="none" stroke={c.protein} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} /> : null}
                  {v ? <Rect x={bx} y={y(v)} width={bw} height={(v / maxV) * ih} rx={3} fill={c.protein} /> : null}
                  {v ? <SvgText x={bx + bw / 2} y={y(v) - 4} fontSize={11} fontWeight="600" fill={c.ink} textAnchor="middle">{v}</SvgText> : null}
                  <SvgText x={x0 + cw / 2} y={CH - 8} fontSize={9.5} fill={w === cur ? c.ink : c.muted} fontWeight={w === cur ? '700' : '400'} textAnchor="middle">{w === cur ? 'This wk' : shortDay(w)}</SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        ) : <View style={{ height: CH }} />}
      </View>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Legend color={c.protein} label={`Workout days · goal ${goal}/wk`} />
        <Legend color={c.protein} label="Goal to hit" dashed />
      </View>
    </Card>
  );
}

// ---------- Bodyweight ----------
function WeightSection({ weights, reload, onMissing }: { weights: Weigh[]; reload: () => Promise<void>; onMissing: () => void }) {
  const c = useTheme();
  const { uid } = useData();
  const [off, setOff] = useState(0);
  const [W, onLayout] = useWidth();
  const [lbs, setLbs] = useState('');
  const [dayOff, setDayOff] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = today(), minD = addDays(weekStart(t), 42 * off), maxD = addDays(minD, 41);
  const pts = weights.filter((w) => w.day >= minD && w.day <= maxD).sort((a, b) => (a.day === b.day ? a.created_at.localeCompare(b.created_at) : a.day < b.day ? -1 : 1));
  const recent = [...weights].sort((a, b) => (a.day === b.day ? b.created_at.localeCompare(a.created_at) : a.day < b.day ? 1 : -1)).slice(0, 6);

  async function save() {
    const v = num(lbs);
    if (!v || v < 50 || v > 600) return setErr('Enter your weight in pounds.');
    setBusy(true); setErr(null);
    const { error } = await supabase.from('weighins').insert({ user_id: uid, day: addDays(t, -dayOff), lbs: Math.round(v * 10) / 10 });
    setBusy(false);
    if (error) { if (missingTable(error)) onMissing(); return setErr("Couldn't save. Try again."); }
    setLbs(''); setDayOff(0); reload();
  }
  async function del(id: string) { await supabase.from('weighins').delete().eq('id', id); reload(); }

  const CH = 200, L = 34, R = 10, T0 = 14, B = 26, ih = CH - T0 - B, iw = W - L - R;
  let chart: React.ReactNode = (
    <View style={{ height: 150, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <T bold>{weights.length ? 'No weigh-ins in these weeks' : 'No weigh-ins yet'}</T>
      <T muted size={13} style={{ textAlign: 'center' }}>{weights.length ? 'Log one to add it here, or tap ‹ to look back.' : 'Log your weight below to start a trend line.'}</T>
    </View>
  );
  if (pts.length && W) {
    const vals = pts.map((p) => p.lbs), lo = Math.floor(Math.min(...vals) - 3), hi = Math.ceil(Math.max(...vals) + 3);
    const x = (d: string) => L + ((parseDay(d).getTime() - parseDay(minD).getTime()) / 864e5 / 41) * iw;
    const y = (v: number) => T0 + ih - ((v - lo) / (hi - lo)) * ih;
    const step = Math.max(1, Math.ceil((hi - lo) / 5));
    const ticks: number[] = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    const last = pts[pts.length - 1];
    chart = (
      <Svg width={W} height={CH}>
        {ticks.map((v) => (
          <React.Fragment key={v}>
            <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={c.line} />
            <SvgText x={L - 6} y={y(v) + 4} fontSize={10} fill={c.muted} textAnchor="end">{v}</SvgText>
          </React.Fragment>
        ))}
        {Array.from({ length: 6 }, (_, i) => addDays(minD, 7 * i)).map((d, i) => (
          <SvgText key={d} x={x(d)} y={CH - 8} fontSize={9.5} fill={c.muted} textAnchor={i === 0 ? 'start' : 'middle'}>{d === weekStart(t) ? 'This wk' : shortDay(d)}</SvgText>
        ))}
        {t >= minD && t <= maxD ? <Line x1={x(t)} x2={x(t)} y1={T0} y2={T0 + ih} stroke={c.muted} strokeDasharray="3 3" /> : null}
        {pts.length > 1 ? <Polyline points={pts.map((p) => `${x(p.day).toFixed(1)},${y(p.lbs).toFixed(1)}`).join(' ')} fill="none" stroke={c.protein} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
        {pts.map((p, i) => <Circle key={p.id} cx={x(p.day)} cy={y(p.lbs)} r={i === pts.length - 1 ? 5 : 3} fill={i === pts.length - 1 ? c.protein : c.surface} stroke={c.protein} strokeWidth={2} />)}
        <SvgText x={Math.min(x(last.day) + 8, W - R - 34)} y={y(last.lbs) - 8} fontSize={12} fontWeight="700" fill={c.protein}>{last.lbs}</SvgText>
      </Svg>
    );
  }
  const change = pts.length > 1 ? pts[pts.length - 1].lbs - pts[0].lbs : null;

  return (
    <Card>
      <H size={22}>Bodyweight</H>
      <Nav label={off ? `6 weeks from ${shortDay(minD)}` : 'Pounds · this week and the next 5'} off={off} setOff={setOff} />
      <View onLayout={onLayout} style={{ width: '100%' }}>{chart}</View>
      {change != null ? <T muted size={12}>{change > 0 ? '+' : ''}{change.toFixed(1)} lb since {shortDay(pts[0].day)}</T> : null}
      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
        <Label>Log a weigh-in</Label>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <Field value={lbs} onChangeText={setLbs} keyboardType="decimal-pad" placeholder="175.4" accessibilityLabel="Weight in pounds" />
          <Btn kind="primary" title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={save} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Today', 'Yesterday', '2 days ago'].map((l, i) => <Chip key={l} title={l} on={dayOff === i} onPress={() => setDayOff(i)} />)}
        </View>
        {err ? <T size={13} style={{ color: c.danger }}>{err}</T> : null}
        {recent.map((w) => (
          <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
            <T muted size={14} style={{ flex: 1 }}>{dayLabel(w.day)}</T>
            <T mono bold size={14}>{w.lbs} lb</T>
            <Pressable onPress={() => del(w.id)} hitSlop={8} accessibilityLabel={`Delete weigh-in from ${dayLabel(w.day)}`}><T muted>✕</T></Pressable>
          </View>
        ))}
        <T muted size={12}>Only you can see your weigh-ins.</T>
      </View>
    </Card>
  );
}

// ---------- Goal weight ----------
function GoalWeight({ saved, latest, onSaved, onMissing }: { saved: SavedPlan | null; latest: number | null; onSaved: (p: SavedPlan) => void; onMissing: () => void }) {
  const c = useTheme();
  const { uid, profile, saveProfile } = useData();
  const [w, setW] = useState<WG>(() => wgFrom(saved, latest, profile?.workout_goal ?? 3));
  const [msg, setMsg] = useState<string | null>(null);
  const set = <K extends keyof WG>(k: K, v: WG[K]) => { setW((cur) => ({ ...cur, [k]: v })); setMsg(null); };
  // Weigh-ins may load after the plan: fill in current weight once they do
  useEffect(() => { if (latest != null) setW((cur) => (cur.cur ? cur : { ...cur, cur: String(latest) })); }, [latest]);
  const r = wgCalc(w);
  const dir = num(w.goal) && num(w.cur) && num(w.goal)! > num(w.cur)! ? 'gain' : 'lose';
  const watch = w.mode === 'watch';
  const it = INTENSITY.find((x) => x[0] === w.intensity) ?? INTENSITY[1];
  const pc = PACES[dir].find((x) => x[0] === w.pace) ?? PACES[dir][1];
  const tdee10 = r.tdee ? Math.round(r.tdee / 10) * 10 : null;

  async function save() {
    if (!uid) return;
    const goal = num(w.goal), now = num(w.cur), old = saved ?? {};
    const restart = !old.start || num(old.goal) !== goal;
    const doc: SavedPlan = { goal, cur: now, sex: w.sex, age: num(w.age), ft: num(w.ft), inch: num(w.inch) || 0, freq: num(w.freq) ?? 0, intensity: w.intensity, pace: w.pace, mode: w.mode, maint: num(w.maint), eat: num(w.eat), start: restart ? now ?? undefined : old.start, startDay: restart ? today() : old.startDay };
    const { error } = await supabase.from('goal_plans').upsert({ user_id: uid, plan: doc, updated_at: new Date().toISOString() });
    if (error) { if (missingTable(error)) onMissing(); return setMsg("Couldn't save. Try again."); }
    onSaved(doc); setMsg('Saved');
  }
  async function applyGoal(k: number) {
    const patch: any = { kcal_goal: k };
    if (profile?.macro_mode === 'pct' && profile.pct_p != null) Object.assign(patch, (({ protein, carbs, fat }) => ({ protein_goal: protein, carb_goal: carbs, fat_goal: fat }))(pctToGrams(k, profile.pct_p, profile.pct_c, profile.pct_f)));
    const e = await saveProfile(patch);
    setMsg(e ?? `Daily calorie goal set to ${fmt(k)}.`);
  }

  // Progress toward the saved goal
  const start = num(saved?.start), goalSaved = num(saved?.goal);
  let track: React.ReactNode = null;
  if (start && goalSaved) {
    const now = latest ?? start, total = goalSaved - start;
    const pct = total ? Math.max(0, Math.min(100, ((now - start) / total) * 100)) : 100;
    const left = Math.abs(goalSaved - now);
    track = (
      <View style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T bold style={{ flex: 1 }}>{fmt(start)} → {fmt(goalSaved)} lb · now {now}</T>
          <T mono bold>{Math.round(pct)}%</T>
        </View>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: c.line, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%` as `${number}%`, height: '100%', backgroundColor: c.protein }} />
        </View>
        <T muted size={12}>{left < 0.5 ? 'Goal reached. Nice work.' : `${left.toFixed(1)} lb to go · started ${shortDay(saved?.startDay || today())} · log weigh-ins to update this`}</T>
      </View>
    );
  }

  let out: React.ReactNode;
  if (r.need) out = <T muted>{r.need}</T>;
  else if (r.warn) out = <><T style={{ color: c.danger }}>{r.warn}</T>{tdee10 ? <Big value={fmt(tdee10)} label={`Maintenance kcal/day${r.watch ? ' · your watch' : ''}`} /> : null}</>;
  else if (r.maint) out = (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Big hi value={fmt(r.kcal)} label={`Calories a day to stay at ${fmt(r.goal)} lb`} />
        <Big value={fmt(tdee10)} label="Maintenance kcal/day" />
      </View>
      <Btn title={`Use ${fmt(r.kcal)} as my daily calorie goal`} onPress={() => applyGoal(r.kcal!)} />
    </>
  );
  else {
    const dt = parseDay(r.date!);
    out = (
      <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Big hi value={`${r.lose ? '−' : '+'}${r.rate!.toFixed(1)}`} unit=" lb" label="Per week" />
          <Big hi value={fmt(r.kcal)} label={r.fromEat && !r.floored ? 'Calories you plan to eat' : 'Calories a day'} />
          <Big value={`${r.weeks}`} unit=" wk" label={`About ${MON[dt.getMonth()]} ${dt.getDate()}${dt.getFullYear() !== new Date().getFullYear() ? `, ${dt.getFullYear()}` : ''}`} />
          <Big value={fmt(tdee10)} label={`Maintenance kcal/day${r.watch ? ' · watch' : ''}`} />
        </View>
        <T muted size={13}>
          {r.lose ? `That's a ${fmt(tdee10! - r.kcal!)} kcal daily deficit from your maintenance.` : `That's a ${fmt(r.kcal! - tdee10!)} kcal daily surplus over your maintenance.`}
          {r.note ? ` ${r.note}` : r.floored ? " Capped so you don't eat too little; the pace is a bit slower because of it." : ''} Pair it with plenty of protein to {r.lose ? 'keep' : 'build'} muscle.
        </T>
        <Btn kind="primary" title={`Use ${fmt(r.kcal)} as my daily calorie goal`} onPress={() => applyGoal(r.kcal!)} style={{ alignSelf: 'flex-start' }} />
      </>
    );
  }

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <H size={22}>Goal weight</H>
        <T muted size={12}>Your plan · saved privately, only you see it</T>
      </View>
      {track}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field label="Current weight (lb)" value={w.cur} onChangeText={(v) => set('cur', v)} keyboardType="decimal-pad" placeholder="185" />
        <Field label="Goal weight (lb)" value={w.goal} onChangeText={(v) => set('goal', v)} keyboardType="decimal-pad" placeholder="175" />
      </View>
      <View style={{ gap: 6 }}>
        <Label>Maintenance calories</Label>
        <Seg value={w.mode} options={[['calc', 'Calculate'], ['watch', 'My watch']]} onChange={(v) => set('mode', v)} />
      </View>
      {watch ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field label="Maintenance (kcal/day)" value={w.maint} onChangeText={(v) => set('maint', v)} keyboardType="number-pad" placeholder="2900" />
            <Field label="Plan to eat (optional)" value={w.eat} onChangeText={(v) => set('eat', v)} keyboardType="number-pad" placeholder="2400" />
          </View>
          <T muted size={12}>Use your watch's average total calories burned per day (active plus resting) over the last couple of weeks. Leave "plan to eat" blank and we'll suggest a number from the pace below.</T>
          <View style={{ gap: 6 }}>
            <Label>Sex (optional, sets a safe minimum)</Label>
            <Seg value={w.sex || ('' as any)} options={[['m', 'Male'], ['f', 'Female']]} onChange={(v) => set('sex', v)} />
          </View>
          {num(w.eat) ? null : <PaceSeg w={w} dir={dir} set={set} hint={pc[2]} />}
        </>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Label>Sex (used in the calorie formula)</Label>
            <Seg value={w.sex || ('' as any)} options={[['m', 'Male'], ['f', 'Female']]} onChange={(v) => set('sex', v)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field label="Age" value={w.age} onChangeText={(v) => set('age', v)} keyboardType="number-pad" placeholder="19" />
            <Field label="Height (ft)" value={w.ft} onChangeText={(v) => set('ft', v)} keyboardType="number-pad" placeholder="5" />
            <Field label="(in)" value={w.inch} onChangeText={(v) => set('inch', v)} keyboardType="number-pad" placeholder="11" />
          </View>
          <Field label="How many days a week do you work out?" value={w.freq} onChangeText={(v) => set('freq', v)} keyboardType="number-pad" />
          <View style={{ gap: 6 }}>
            <Label>How hard are your workouts?</Label>
            <Seg value={w.intensity} options={INTENSITY.map((x) => [x[0], x[1]] as [WG['intensity'], string])} onChange={(v) => set('intensity', v)} />
            <T muted size={12}>{it[2]}</T>
          </View>
          <PaceSeg w={w} dir={dir} set={set} hint={pc[2]} />
        </>
      )}
      <View style={{ backgroundColor: c.sunk, borderRadius: 12, padding: 12, gap: 10 }}>
        <Label>Your plan</Label>
        {out}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <T muted size={13} style={{ flex: 1 }}>{msg ?? 'Estimates use the Mifflin-St Jeor formula plus your workouts. Weigh in weekly and adjust.'}</T>
        <Btn title="Save my goal" onPress={save} />
      </View>
    </Card>
  );
}

function PaceSeg({ w, dir, set, hint }: { w: WG; dir: 'lose' | 'gain'; set: <K extends keyof WG>(k: K, v: WG[K]) => void; hint: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>Pace</Label>
      <Seg value={w.pace} options={PACES[dir].map((x) => [x[0], x[1]] as [WG['pace'], string])} onChange={(v) => set('pace', v)} />
      <T muted size={12}>{hint}</T>
    </View>
  );
}

function Big({ value, unit, label, hi }: { value: string; unit?: string; label: string; hi?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: hi ? c.surface : 'transparent', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: c.line }}>
      <T style={{ fontFamily: F.displayBlack, fontSize: 26, lineHeight: 28, color: hi ? c.protein : c.ink }}>{value}{unit ? <T muted size={13}>{unit}</T> : null}</T>
      <T muted size={12}>{label}</T>
    </View>
  );
}
