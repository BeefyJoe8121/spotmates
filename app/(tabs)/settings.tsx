import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { flameXml, StreakIcon } from '@/components/StreakBadge';
import { SvgXml } from 'react-native-svg';
import { HOLI } from '@/lib/holidays';
import { Btn, Card, Field, H, Label, Seg, T } from '@/components/ui';
import { useData } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { SCHEMES, TIERS, tierFor, useAppPrefs, useTheme } from '@/lib/theme';
import { macroKcal, num, pctToGrams } from '@/lib/util';

const str = (v: number | null | undefined) => (v == null ? '' : String(v));

export default function SettingsScreen() {
  const c = useTheme();
  const { profile, crew, saveProfile, session } = useData();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [mode, setMode] = useState<'pct' | 'g'>('pct');
  const [pp, setPp] = useState(''); const [pc, setPc] = useState(''); const [pf, setPf] = useState('');
  const [gp, setGp] = useState(''); const [gc, setGc] = useState(''); const [gf, setGf] = useState('');
  const [waterGoal, setWaterGoal] = useState('100');
  const [wk, setWk] = useState('4');
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? ''); setKcal(str(profile.kcal_goal)); setMode(profile.macro_mode ?? 'pct');
    setPp(str(profile.pct_p)); setPc(str(profile.pct_c)); setPf(str(profile.pct_f));
    setGp(str(profile.protein_goal)); setGc(str(profile.carb_goal)); setGf(str(profile.fat_goal));
    setWaterGoal(str(profile.water_goal ?? 100)); setWk(str(profile.workout_goal ?? 4));
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const k = num(kcal);
  let hint = '';
  let hintBad = false;
  if (mode === 'pct') {
    const a = num(pp), b = num(pc), d = num(pf);
    if (a != null || b != null || d != null) {
      const tot = (a ?? 0) + (b ?? 0) + (d ?? 0), g = pctToGrams(k, a, b, d);
      hintBad = Math.round(tot) !== 100;
      hint = `Total ${Math.round(tot)}%${hintBad ? ' · needs to add up to 100%' : ' ✓'}` + (k ? ` · ${g.protein ?? '–'}g protein, ${g.carbs ?? '–'}g carbs, ${g.fat ?? '–'}g fat a day` : ' · set a calorie goal to see grams');
    } else hint = 'Example: 35 / 40 / 25. The three need to add up to 100%.';
  } else {
    const mk = macroKcal(num(gp), num(gc), num(gf));
    hint = mk ? `Your macros add up to ${Math.round(mk).toLocaleString()} kcal${k ? (Math.abs(mk - k) <= k * 0.05 ? ' · matches your calorie goal' : ` · ${Math.round(Math.abs(mk - k)).toLocaleString()} ${mk > k ? 'over' : 'under'} your calorie goal`) : ''}` : 'Macros are optional. Leave any blank to just track it.';
  }

  function switchMode(m: 'pct' | 'g') {
    if (m === 'g' && mode === 'pct') { const g = pctToGrams(k, num(pp), num(pc), num(pf)); if (g.protein != null) setGp(String(g.protein)); if (g.carbs != null) setGc(String(g.carbs)); if (g.fat != null) setGf(String(g.fat)); }
    if (m === 'pct' && mode === 'g' && k) { const a = num(gp), b = num(gc), d = num(gf); if (a != null) setPp(String(Math.round((a * 4) / k * 100))); if (b != null) setPc(String(Math.round((b * 4) / k * 100))); if (d != null) setPf(String(Math.round((d * 9) / k * 100))); }
    setMode(m);
  }

  async function save() {
    const patch: any = {
      display_name: name.trim().slice(0, 30) || null, kcal_goal: k ? Math.round(k) : null, macro_mode: mode,
      water_goal: Math.min(400, Math.max(8, Math.round(num(waterGoal) ?? 100))), workout_goal: Math.min(7, Math.max(1, Math.round(num(wk) ?? 4))),
    };
    if (mode === 'pct') {
      const a = num(pp), b = num(pc), d = num(pf);
      if (a != null || b != null || d != null) {
        if (Math.round((a ?? 0) + (b ?? 0) + (d ?? 0)) !== 100) return setMsg({ text: 'Percents need to add up to 100%.', bad: true });
        if (!k) return setMsg({ text: 'Set a calorie goal so the percents can turn into grams.', bad: true });
        const g = pctToGrams(k, a ?? 0, b ?? 0, d ?? 0);
        Object.assign(patch, { pct_p: a ?? 0, pct_c: b ?? 0, pct_f: d ?? 0, protein_goal: g.protein, carb_goal: g.carbs, fat_goal: g.fat });
      } else Object.assign(patch, { pct_p: null, pct_c: null, pct_f: null, protein_goal: null, carb_goal: null, fat_goal: null });
    } else {
      Object.assign(patch, { protein_goal: num(gp), carb_goal: num(gc), fat_goal: num(gf) });
    }
    setBusy(true); const e = await saveProfile(patch); setBusy(false);
    setMsg(e ? { text: e, bad: true } : { text: 'Saved' });
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Card>
          <H size={22}>Profile & daily goals</H>
          <Field label="Name shown in the app" value={name} onChangeText={setName} placeholder="Your name" maxLength={30} />
          <Field label="Calories per day" value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="2800" />
          <View style={{ gap: 6 }}>
            <Label>Macro targets</Label>
            <Seg value={mode} options={[['pct', 'Percent'], ['g', 'Grams']]} onChange={switchMode} />
          </View>
          {mode === 'pct' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field label="Protein (%)" value={pp} onChangeText={setPp} keyboardType="number-pad" placeholder="35" />
              <Field label="Carbs (%)" value={pc} onChangeText={setPc} keyboardType="number-pad" placeholder="40" />
              <Field label="Fat (%)" value={pf} onChangeText={setPf} keyboardType="number-pad" placeholder="25" />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field label="Protein (g)" value={gp} onChangeText={setGp} keyboardType="number-pad" placeholder="180" />
              <Field label="Carbs (g)" value={gc} onChangeText={setGc} keyboardType="number-pad" placeholder="320" />
              <Field label="Fat (g)" value={gf} onChangeText={setGf} keyboardType="number-pad" placeholder="85" />
            </View>
          )}
          <T mono size={12} style={{ color: hintBad ? c.danger : c.muted }}>{hint}</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field label="Workout days per week" value={wk} onChangeText={setWk} keyboardType="number-pad" />
            <Field label="Water per day (oz)" value={waterGoal} onChangeText={setWaterGoal} keyboardType="number-pad" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {msg ? <T size={13} style={{ flex: 1, color: msg.bad ? c.danger : c.muted }}>{msg.text}</T> : <View style={{ flex: 1 }} />}
            <Btn kind="primary" title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={save} />
          </View>
        </Card>

        <AppearanceCard />
        <StreakCard />

        <Card>
          <H size={22}>Your crew</H>
          <T>{crew?.name}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label>Invite code</Label>
              <T mono bold size={28} style={{ letterSpacing: 4 }}>{crew?.code}</T>
            </View>
            <Btn title="Share code" onPress={() => Share.share({ message: `Join my crew on Spot Mates! Code: ${crew?.code}` })} />
          </View>
          <T muted size={13}>Friends enter this code after creating an account to see your posts and share theirs.</T>
        </Card>

        <Card>
          <H size={22}>Account</H>
          <T muted size={13}>Signed in as {session?.user.email}</T>
          <Btn title="Sign out" onPress={() => supabase.auth.signOut()} style={{ alignSelf: 'flex-start' }} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AppearanceCard() {
  const c = useTheme();
  const { prefs, setPref, isDark } = useAppPrefs();
  return (
    <Card>
      <H size={22}>Appearance</H>
      <View style={{ gap: 6 }}>
        <Label>Theme</Label>
        <Seg value={prefs.mode} options={[['system', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']]} onChange={(v) => setPref('mode', v)} />
      </View>
      <View style={{ gap: 6 }}>
        <Label>Color scheme</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SCHEMES.map((sc) => {
            const on = prefs.scheme === sc.id;
            const v = isDark ? sc.D : sc.L;
            const dots = v ? [v.p, v.c, v.f] : [c.protein, c.lift, c.meal];
            return (
              <Pressable key={sc.id} onPress={() => setPref('scheme', sc.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={sc.name}
                style={{ width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.sunk : c.surface }}>
                <View style={{ flexDirection: 'row' }}>
                  {dots.map((d, i) => <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: d, marginLeft: i ? -5 : 0, borderWidth: 1.5, borderColor: c.surface }} />)}
                </View>
                <T size={13} bold={on} numberOfLines={2} style={{ flex: 1 }}>{sc.name}</T>
              </Pressable>
            );
          })}
        </View>
        <T muted size={12}>Colors apply to this phone only. Your friends keep their own.</T>
      </View>
    </Card>
  );
}

function StreakCard() {
  const c = useTheme();
  const { prefs, setPref } = useAppPrefs();
  const { streak: st } = useData();
  const streak = st.n;
  const cur = tierFor(streak);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <StreakIcon n={streak} size={30} />
        <View style={{ flex: 1 }}>
          <H size={22}>Streak: {streak} day{streak === 1 ? '' : 's'}</H>
          <T muted size={13}>Days in a row you've logged a meal, workout or PR. You get one rest day a week{st.restLeft ? ' (still available this week)' : ' (used this week)'}.</T>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Label>Holiday streak icons</Label>
        <Seg value={prefs.streakIcon} options={[['holiday', 'Holiday icons'], ['fire', 'Always fire']]} onChange={(v) => setPref('streakIcon', v)} />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {Object.values(HOLI).map((h) => <SvgXml key={h.name} xml={h.svg} width={22} height={22} />)}
        </View>
        <T muted size={12}>Turkey, tree, heart, shamrock, egg and firework around those holidays.</T>
      </View>
      <View style={{ gap: 2 }}>
        <Label>Flame milestones</Label>
        {TIERS.map((t, i) => (
          <View key={t.at} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, opacity: i <= cur ? 1 : 0.55 }}>
            <SvgXml xml={flameXml(i)} width={14} height={18} />
            <T size={14} bold={i === cur} style={{ flex: 1 }}>{t.at === 0 ? 'Day 1' : t.name}</T>
            <T mono muted size={12}>{i < cur ? 'Done' : i === cur ? 'Now' : `${t.at - streak} to go`}</T>
          </View>
        ))}
      </View>
    </Card>
  );
}
