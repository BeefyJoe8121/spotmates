import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, View } from 'react-native';
import { Btn, Card, Field, H, Label, Seg, T } from '@/components/ui';
import { useData } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
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
