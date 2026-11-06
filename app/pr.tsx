import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Btn, Chip, Field, Label, T } from '@/components/ui';
import { useData } from '@/lib/data';
import { e1rm, exKey, prevBest, prLbs, prReps, prScore } from '@/lib/prs';
import { useTheme } from '@/lib/theme';
import { addDays, fmt, num, today } from '@/lib/util';

const STAPLES = ['Bench press', 'Squat', 'Deadlift', 'Overhead press', 'Pull-up'];

export default function LogPR() {
  const c = useTheme();
  const { prs, posts, uid, addPost } = useData();
  const [ex, setEx] = useState('');
  const [lbs, setLbs] = useState('');
  const [reps, setReps] = useState('1');
  const [dayOff, setDayOff] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Lifts you've done before, so you can tap instead of typing
  const names = useMemo(() => {
    const seen = new Set<string>(); const out: string[] = [];
    [...prs.filter((p) => p.author === uid).map((p) => p.title ?? ''), ...posts.filter((p) => p.author === uid && p.kind === 'workout').flatMap((p) => (p.exercises ?? []).map((e) => e.name)), ...STAPLES]
      .forEach((n) => { const k = exKey(n); if (n && !seen.has(k)) { seen.add(k); out.push(n.trim()); } });
    return out.slice(0, 12);
  }, [prs, posts, uid]);

  const w = num(lbs), r = Math.max(1, Math.round(num(reps) ?? 1));
  const day = addDays(today(), -dayOff);
  let hint = '';
  if (w) {
    const est = e1rm(w, r);
    hint = r > 1 ? `Est. 1-rep max ${fmt(est)} lb.` : '';
    const pb = ex.trim() ? prevBest(prs, { id: '_new', author: uid ?? '', title: ex, day: '9999-12-31', created_at: '9999' }) : null;
    if (pb) {
      const d = Math.round(est - prScore(pb));
      hint += d > 0 ? ` That's +${fmt(d)} lb over your last ${ex.trim()} PR.` : ` Your last ${ex.trim()} PR was ${fmt(prLbs(pb))}×${fmt(prReps(pb))}.`;
    }
  }

  async function save() {
    if (!ex.trim()) return setErr('Name the lift.');
    if (!w || w <= 0 || w > 2000) return setErr('Enter the weight in pounds.');
    setBusy(true); setErr(null);
    const e = await addPost({ kind: 'pr', day, title: ex.trim().slice(0, 60), lbs: w, reps: r, notes: notes.trim() || null, exercises: [] });
    setBusy(false);
    if (e) setErr(e); else router.back();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Field label="Lift" value={ex} onChangeText={setEx} placeholder="Bench press" maxLength={60} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {names.map((n) => <Chip key={n} title={n} on={exKey(ex) === exKey(n)} onPress={() => setEx(n)} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field label="Weight (lb)" value={lbs} onChangeText={setLbs} keyboardType="decimal-pad" placeholder="225" />
          <Field label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" />
        </View>
        {hint ? <T mono muted size={12}>{hint.trim()}</T> : null}
        <View style={{ gap: 6 }}>
          <Label>When</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['Today', 'Yesterday', '2 days ago'].map((l, i) => <Chip key={l} title={l} on={dayOff === i} onPress={() => setDayOff(i)} />)}
          </View>
        </View>
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline maxLength={600} placeholder="How it moved, belt or no belt, what's next…" style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <T muted size={12}>PRs show in Friends → PRs and get a trophy on your Progress calendar.</T>
        {err ? <T size={13} style={{ color: c.danger }}>{err}</T> : null}
        <Btn kind="primary" title={busy ? 'Posting…' : 'Post PR'} disabled={busy} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
