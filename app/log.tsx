import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Btn, Chip, Field, Label, Seg, T } from '@/components/ui';
import { Exercise, useData } from '@/lib/data';
import { FoodItem, foodBus } from '@/lib/foods';
import { useTheme } from '@/lib/theme';
import { addDays, macroKcal, num, today } from '@/lib/util';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const WTYPES = ['Strength', 'Cardio', 'Sport', 'Mobility', 'Other'];

function guessMeal(): (typeof MEAL_TYPES)[number] {
  const h = new Date().getHours();
  return h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snack';
}

export default function LogScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ kind?: string; meal?: string; search?: string }>();
  const { addPost, saveMeal } = useData();
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<'meal' | 'workout'>(params.kind === 'workout' ? 'workout' : 'meal');
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [title, setTitle] = useState('');
  const [dayOff, setDayOff] = useState(0);
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>((MEAL_TYPES as readonly string[]).includes(params.meal ?? '') ? (params.meal as (typeof MEAL_TYPES)[number]) : guessMeal());
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const titleTouched = useRef(false);
  const [p, setP] = useState(''); const [cb, setCb] = useState(''); const [f, setF] = useState(''); const [k, setK] = useState('');
  const [wtype, setWtype] = useState('Strength');
  const [minutes, setMinutes] = useState('');
  const [ex, setEx] = useState<Exercise[]>([{ name: '', sets: '', reps: '', lbs: '' }]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const meal = kind === 'meal';

  // Opened from the diary's "+ Add food": jump straight to food search
  const searched = useRef(false);
  useEffect(() => {
    if (params.search === '1' && !searched.current) { searched.current = true; setTimeout(() => router.push('/food'), 350); }
  }, [params.search]);
  // Foods picked on the search screen land here
  useEffect(() => foodBus.listen((item) => setFoods((cur) => [...cur, item])), []);
  // Totals fill the macro boxes, MyFitnessPal style
  useEffect(() => {
    if (!foods.length) return;
    const sum = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => foods.reduce((a, x) => a + (x[k] || 0), 0);
    const r = (n: number) => String(Math.round(n * 10) / 10);
    setP(r(sum('protein'))); setCb(r(sum('carbs'))); setF(r(sum('fat'))); setK(String(Math.round(sum('kcal'))));
    if (!titleTouched.current) setTitle(foods.map((x) => x.name).join(', ').slice(0, 80));
  }, [foods]);

  const kcalHint = useMemo(() => {
    const mk = macroKcal(num(p), num(cb), num(f));
    return mk ? `≈ ${Math.round(mk)} kcal from macros (4 / 4 / 9 per gram)` : 'Leave Calories blank to calculate it from macros.';
  }, [p, cb, f]);

  async function pick(source: 'camera' | 'library') {
    setErr(null);
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setErr(source === 'camera' ? 'Allow camera access in your phone settings to take a photo.' : 'Allow photo access in your phone settings to pick a photo.'); return; }
    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
      setBusy('Preparing photo…');
      const ctx = ImageManipulator.manipulate(a.uri);
      const big = Math.max(a.width ?? 0, a.height ?? 0);
      if (big > 1600) ctx.resize((a.width ?? 0) >= (a.height ?? 0) ? { width: 1600 } : { height: 1600 });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
      if (!out.base64) throw new Error('no data');
      setPhoto({ uri: out.uri, base64: out.base64 });
    } catch {
      setErr("Couldn't read that photo. Try a different one.");
    } finally { setBusy(null); }
  }

  async function submit() {
    setErr(null);
    const day = addDays(today(), -dayOff);
    if (meal) {
      if (!title.trim() && !photo && !foods.length) return setErr('Add a food, a photo, or say what you ate.');
      const post = { kind, day, title: title.trim() || null, notes: notes.trim() || null, meal_type: mealType, place: null,
        protein: num(p), carbs: num(cb), fat: num(f), kcal: num(k) != null ? Math.round(num(k)!) : null, foods };
      setBusy(photo ? 'Uploading photo…' : 'Posting…');
      const e = await addPost(post, photo?.base64);
      setBusy(null);
      if (e) return setErr(e);
    } else {
      const exercises = ex.filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim().slice(0, 60), sets: e.sets.trim(), reps: e.reps.trim(), lbs: e.lbs.trim() }));
      if (!title.trim() && !photo && !exercises.length) return setErr('Add a photo, a name, or at least one exercise.');
      const post = { kind, day, title: title.trim() || null, notes: notes.trim() || null, wtype, minutes: num(minutes) != null ? Math.round(num(minutes)!) : null, exercises };
      setBusy(photo ? 'Uploading photo…' : 'Posting…');
      const e = await addPost(post, photo?.base64);
      setBusy(null);
      if (e) return setErr(e);
    }
    router.back();
  }

  const setExField = (i: number, key: keyof Exercise, v: string) => setEx((cur) => cur.map((e, j) => (j === i ? { ...e, [key]: v } : e)));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Seg value={kind} options={[['meal', 'Meal'], ['workout', 'Workout']]} onChange={setKind}
          tint={(v, pal) => (v === 'meal' ? { bg: pal.mealSoft, fg: pal.meal } : { bg: pal.liftSoft, fg: pal.lift })} />

        {photo ? (
          <Pressable onPress={() => setPhoto(null)} accessibilityLabel="Remove photo">
            <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 12 }} />
            <T muted size={12} style={{ marginTop: 6 }}>Tap the photo to remove it</T>
          </Pressable>
        ) : (
          <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line, borderRadius: 12, backgroundColor: c.bg, padding: 16, gap: 10, alignItems: 'center' }}>
            <T bold>Add a photo</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small title="Take photo" onPress={() => pick('camera')} />
              <Btn small title="Choose from library" onPress={() => pick('library')} />
            </View>
          </View>
        )}

        <Field label={meal ? 'What did you eat?' : 'Workout name'} value={title} onChangeText={(t) => { titleTouched.current = true; setTitle(t); }} placeholder={meal ? 'Chicken rice bowl' : 'Push day'} maxLength={80} />
        {meal ? (
        <View style={{ gap: 8 }}>
          {foods.length ? (
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, overflow: 'hidden' }}>
              {foods.map((x, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T bold size={14} numberOfLines={1}>{x.name}</T>
                    <T muted size={12} numberOfLines={1}>{[x.brand, `${x.serving}${x.qty !== 1 ? ` × ${x.qty}` : ''}`].filter(Boolean).join(', ')}</T>
                    <T mono muted size={11}>P {x.protein}g · C {x.carbs}g · F {x.fat}g</T>
                  </View>
                  <T mono bold size={14}>{x.kcal}</T>
                  <Pressable onPress={() => setFoods((cur) => cur.filter((_, j) => j !== i))} accessibilityLabel={`Remove ${x.name}`} style={{ padding: 4 }}>
                    <T muted size={18}>×</T>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : <T muted size={13}>Search a food database and pick serving sizes, like MyFitnessPal. Or just type the macros below.</T>}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Btn small kind="primary" title="+ Add food" onPress={() => router.push('/food')} />
            {foods.length ? <Btn small title={saveOpen ? 'Cancel' : 'Save as a meal'} onPress={() => { setSaveOpen(!saveOpen); setSaveName(title); setSaveMsg(null); }} /> : null}
          </View>
          {saveOpen && foods.length ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Field value={saveName} onChangeText={setSaveName} placeholder="Name it, like Usual breakfast" maxLength={60} accessibilityLabel="Saved meal name" />
              <Btn small kind="primary" title="Save" onPress={async () => {
                const e = await saveMeal(saveName, foods);
                if (e) setSaveMsg(e); else { setSaveOpen(false); setSaveMsg(`Saved. Find "${saveName.trim()}" under Saved meals when you add food.`); }
              }} />
            </View>
          ) : null}
          {saveMsg ? <T muted size={12}>{saveMsg}</T> : null}
        </View>
        ) : null}
        <View style={{ gap: 6 }}>
          <Label>When</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['Today', 'Yesterday', '2 days ago'].map((l, i) => <Chip key={l} title={l} on={dayOff === i} onPress={() => setDayOff(i)} />)}
          </View>
        </View>

        {meal ? (
          <>
            <View style={{ gap: 6 }}>
              <Label>Meal</Label>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {MEAL_TYPES.map((m) => <Chip key={m} title={m} on={mealType === m} onPress={() => setMealType(m)} />)}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Label>Macros{foods.length ? ' (totals from your foods)' : ''}</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Field label="Protein (g)" value={p} onChangeText={setP} keyboardType="decimal-pad" />
                <Field label="Carbs (g)" value={cb} onChangeText={setCb} keyboardType="decimal-pad" />
                <Field label="Fat (g)" value={f} onChangeText={setF} keyboardType="decimal-pad" />
                <Field label="Calories" value={k} onChangeText={setK} keyboardType="number-pad" placeholder="auto" />
              </View>
              <T mono muted size={12}>{kcalHint}</T>
            </View>
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Label>Type</Label>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {WTYPES.map((w) => <Chip key={w} title={w} on={wtype === w} onPress={() => setWtype(w)} />)}
              </View>
            </View>
            <Field label="Duration (min)" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
            <View style={{ gap: 6 }}>
              <Label>Exercises</Label>
              {ex.map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <View style={{ flex: 2.4 }}><Field value={e.name} onChangeText={(v) => setExField(i, 'name', v)} placeholder={i === 0 ? 'Bench press' : 'Exercise'} accessibilityLabel={`Exercise ${i + 1} name`} /></View>
                  <View style={{ flex: 1 }}><Field value={e.sets} onChangeText={(v) => setExField(i, 'sets', v)} placeholder="Sets" keyboardType="number-pad" accessibilityLabel="Sets" /></View>
                  <View style={{ flex: 1 }}><Field value={e.reps} onChangeText={(v) => setExField(i, 'reps', v)} placeholder="Reps" accessibilityLabel="Reps" /></View>
                  <View style={{ flex: 1 }}><Field value={e.lbs} onChangeText={(v) => setExField(i, 'lbs', v)} placeholder="Lbs" keyboardType="decimal-pad" accessibilityLabel="Weight in pounds" /></View>
                  <Pressable disabled={ex.length < 2} onPress={() => setEx((cur) => cur.filter((_, j) => j !== i))} accessibilityLabel={`Remove exercise ${i + 1}`} style={{ padding: 4, opacity: ex.length < 2 ? 0.3 : 1 }}>
                    <T muted size={18}>×</T>
                  </Pressable>
                </View>
              ))}
              <Btn small title="+ Add exercise" onPress={() => setEx((cur) => [...cur, { name: '', sets: '', reps: '', lbs: '' }])} style={{ alignSelf: 'flex-start' }} />
            </View>
          </>
        )}

        <Field label="Notes" value={notes} onChangeText={setNotes} multiline maxLength={600} style={{ minHeight: 70, textAlignVertical: 'top' }}
          placeholder={meal ? 'How it tasted, how it fit the plan…' : 'PRs, how it felt, what to push next time…'} />
        <T muted size={12}>{meal ? 'Meal posts disappear after 3 days to save space. Their macros still count.' : 'Workout photos disappear after 3 days to save space. The workout stays.'}</T>
        {err ? <T size={13} style={{ color: c.danger }}>{err}</T> : null}
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
          <Btn title="Cancel" onPress={() => router.back()} />
          <Btn kind="primary" title={busy ?? `Post ${kind}`} disabled={!!busy} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
