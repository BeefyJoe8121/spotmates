import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Btn, Field, H, Label, T } from '@/components/ui';
import { useData } from '@/lib/data';
import { FoodItem, FoodResult, foodBus, fromRecent, macrosFor, searchFoods } from '@/lib/foods';
import { F, useTheme } from '@/lib/theme';
import { fmt, num } from '@/lib/util';

export default function FoodScreen() {
  const c = useTheme();
  const { posts, uid } = useData();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const ctl = useRef<AbortController | null>(null);

  // Foods I've logged before, newest first, like MyFitnessPal's "Recent"
  const recent = useMemo(() => {
    const seen = new Set<string>(); const out: FoodItem[] = [];
    posts.filter((p) => p.author === uid && p.kind === 'meal').forEach((p) => (p.foods ?? []).forEach((f) => {
      const k = `${f.name}|${f.serving}`.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(f); }
    }));
    return out.slice(0, 25);
  }, [posts, uid]);

  async function run(text: string) {
    const t = text.trim();
    if (t.length < 2) return;
    ctl.current?.abort();
    const a = new AbortController(); ctl.current = a;
    setBusy(true); setErr(null); setNote(null); setSearched(true);
    try {
      const r = await searchFoods(t, a.signal);
      if (ctl.current !== a) return;
      setResults(r.results); setNote(r.note ?? null);
      if (!r.results.length) setErr(`No foods match "${t}". Try fewer words, like "greek yogurt".`);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setErr("Couldn't reach the food database. Check your connection and try again.");
    } finally { if (ctl.current === a) setBusy(false); }
  }

  // Search shortly after typing stops
  useEffect(() => {
    if (q.trim().length < 3) return;
    const t = setTimeout(() => run(q), 600);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (picked) return <FoodDetail food={picked} onBack={() => setPicked(null)} />;

  const row = (f: FoodResult, sub?: string) => {
    const s = f.servings[0];
    const m = macrosFor(f, s.grams, 1);
    return (
      <Pressable key={f.id} onPress={() => setPicked(f)} accessibilityRole="button"
        style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: pressed ? c.sunk : c.surface, flexDirection: 'row', alignItems: 'center', gap: 10 })}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T bold size={15} numberOfLines={2}>{f.name}</T>
          <T muted size={13} numberOfLines={1}>{[f.brand, sub ?? s.label].filter(Boolean).join(', ')}</T>
        </View>
        <T mono bold size={15}>{fmt(m.kcal)}<T mono muted size={12}> cal</T></T>
        <T bold size={22} style={{ color: c.accent }}>+</T>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <TextInput
          value={q} onChangeText={setQ} onSubmitEditing={() => run(q)} returnKeyType="search" autoFocus autoCorrect={false}
          placeholder="Search for a food" placeholderTextColor={c.muted} accessibilityLabel="Search for a food"
          style={{ backgroundColor: c.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: c.ink, fontFamily: F.body, borderWidth: 1, borderColor: c.line }}
        />
      </View>
      {busy ? <View style={{ padding: 20 }}><ActivityIndicator color={c.muted} /></View> : null}
      {err ? <T muted style={{ padding: 16 }}>{err}</T> : null}
      {note ? <T muted size={12} style={{ paddingHorizontal: 16, paddingTop: 10 }}>{note}</T> : null}
      {searched && results.length ? (
        <FlatList data={results} keyExtractor={(f) => f.id} renderItem={({ item }) => row(item)} keyboardShouldPersistTaps="handled" />
      ) : !searched ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}><Label>{recent.length ? 'Recent foods' : 'Search tips'}</Label></View>
          {recent.length ? recent.map((f) => row(fromRecent(f), `${f.serving}${f.qty !== 1 ? ` × ${f.qty}` : ''}`)) : (
            <T muted style={{ paddingHorizontal: 16 }}>Type a food like "chicken breast", "banana" or "Chick-fil-A nuggets". Tap a result to pick the serving size.</T>
          )}
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function FoodDetail({ food, onBack }: { food: FoodResult; onBack: () => void }) {
  const c = useTheme();
  const [si, setSi] = useState(0);
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState('1');
  const s = food.servings[si];
  const n = Math.max(0, num(qty) ?? 0);
  const m = macrosFor(food, s.grams, n);
  const calFrom = { carbs: m.carbs * 4, fat: m.fat * 9, protein: m.protein * 4 };
  const tot = calFrom.carbs + calFrom.fat + calFrom.protein || 1;
  const pct = (v: number) => Math.round((v / tot) * 100);

  // Macro ring like MyFitnessPal: carbs / fat / protein share of calories
  const R = 38, C = 2 * Math.PI * R;
  const segs = [
    { v: calFrom.carbs, color: c.lift }, { v: calFrom.fat, color: c.meal }, { v: calFrom.protein, color: c.protein },
  ];
  let offset = 0;

  function add() {
    if (!(n > 0)) return;
    foodBus.emit({ name: food.name, brand: food.brand, serving: s.label, grams: s.grams, qty: n, ...m });
    router.back();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} accessibilityRole="button"><T bold style={{ color: c.accent }}>‹ Back to results</T></Pressable>
      <View style={{ gap: 2 }}>
        <H size={26}>{food.name}</H>
        {food.brand ? <T muted>{food.brand}</T> : null}
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
          <T style={{ flex: 1 }}>Serving size</T>
          <T bold style={{ color: c.accent, flexShrink: 1, textAlign: 'right' }} numberOfLines={2}>{s.label}</T>
          <T bold style={{ color: c.accent }}>{open ? '▴' : '▾'}</T>
        </Pressable>
        {open ? food.servings.map((sv, i) => (
          <Pressable key={sv.label} onPress={() => { setSi(i); setOpen(false); }} accessibilityRole="button"
            style={{ paddingVertical: 12, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: i === si ? c.liftSoft : c.surface }}>
            <T bold={i === si}>{sv.label}</T>
          </Pressable>
        )) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: c.line }}>
          <T style={{ flex: 1 }}>Number of servings</T>
          <View style={{ width: 90 }}>
            <Field value={qty} onChangeText={setQty} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel="Number of servings" style={{ textAlign: 'right', paddingVertical: 7 }} />
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={{ width: 96, height: 96 }}>
          <Svg width={96} height={96} viewBox="0 0 96 96" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={48} cy={48} r={R} fill="none" stroke={c.sunk} strokeWidth={10} />
            {segs.map((g, i) => {
              const len = (g.v / tot) * C;
              const el = len > 0 ? <Circle key={i} cx={48} cy={48} r={R} fill="none" stroke={g.color} strokeWidth={10} strokeDasharray={`${len} ${C}`} strokeDashoffset={-offset} /> : null;
              offset += len;
              return el;
            })}
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: F.displayBlack, fontSize: 26 }}>{fmt(m.kcal)}</T>
            <T muted bold size={10} style={{ letterSpacing: 1 }}>CAL</T>
          </View>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          {[['Carbs', m.carbs, pct(calFrom.carbs), c.lift], ['Fat', m.fat, pct(calFrom.fat), c.meal], ['Protein', m.protein, pct(calFrom.protein), c.protein]].map(([l, g, p, col]) => (
            <View key={l as string} style={{ alignItems: 'center', gap: 2 }}>
              <T bold size={12} style={{ color: col as string }}>{p}%</T>
              <T mono bold size={17}>{g}g</T>
              <T muted size={12}>{l}</T>
            </View>
          ))}
        </View>
      </View>

      <T muted size={12}>
        {food.source === 'off' ? 'Nutrition from Open Food Facts.' : 'Nutrition from the USDA food database.'} Values are estimates; check the label or menu for exact numbers.
      </T>
      <Btn kind="primary" title={`Add to meal · ${fmt(m.kcal)} cal`} disabled={!(n > 0)} onPress={add} />
    </ScrollView>
  );
}
