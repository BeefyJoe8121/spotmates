import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useData } from '@/lib/data';
import { F, useTheme } from '@/lib/theme';
import { fmt, macroKcal, today } from '@/lib/util';
import { Bar, Btn, Card, H, T } from './ui';

export function useTodayTotals() {
  const { posts, uid } = useData();
  const t = today();
  const meals = posts.filter((p) => p.author === uid && p.kind === 'meal' && p.day === t);
  const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0, n: meals.length };
  meals.forEach((m) => {
    tot.kcal += m.kcal ?? macroKcal(m.protein, m.carbs, m.fat);
    tot.protein += Number(m.protein) || 0;
    tot.carbs += Number(m.carbs) || 0;
    tot.fat += Number(m.fat) || 0;
  });
  return { meals, tot };
}

export function TodayCard() {
  const c = useTheme();
  const { profile } = useData();
  const { tot } = useTodayTotals();
  const goal = profile?.kcal_goal ?? null;
  const rem = goal ? goal - tot.kcal : 0;
  const over = !!goal && rem < 0;
  const R = 54, C = 2 * Math.PI * R, frac = goal ? Math.min(1, tot.kcal / goal) : 0;

  const macro = (label: string, v: number, g: number | null, color: string) => {
    const left = g ? g - v : 0, o = !!g && left < 0;
    return (
      <View style={{ gap: 6 }} key={label}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <T bold size={12} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</T>
          <T mono muted size={14}><T mono bold size={14}>{fmt(v)}</T>{g ? ` / ${fmt(g)} g` : ' g eaten'}</T>
          <T mono bold size={14} style={{ marginLeft: 'auto', color: o ? c.danger : g ? color : c.muted }}>{g ? `${Math.round((v / g) * 100)}%` : 'no goal'}</T>
        </View>
        <Bar value={v} goal={g} color={color} />
        {g ? <T muted size={12}><T bold size={12} style={{ color: o ? c.danger : color }}>{o ? `${fmt(-left)} g over` : `${fmt(left)} g left`}</T>{o ? " today's goal" : " to hit today's goal"}</T> : null}
      </View>
    );
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <H>Today</H>
        <T muted size={13}>{tot.n} meal{tot.n === 1 ? '' : 's'} logged</T>
        <Btn small title="Edit goals" onPress={() => router.push('/settings')} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <View style={{ width: 128, height: 128 }} accessibilityLabel={goal ? `${fmt(tot.kcal)} of ${fmt(goal)} calories eaten` : `${fmt(tot.kcal)} calories eaten`}>
          <Svg width={128} height={128} viewBox="0 0 128 128" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={64} cy={64} r={R} fill="none" stroke={c.sunk} strokeWidth={12} />
            {frac > 0 ? <Circle cx={64} cy={64} r={R} fill="none" stroke={over ? c.danger : c.meal} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} /> : null}
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <T style={{ fontFamily: F.displayBlack, fontSize: 32, color: over ? c.danger : c.ink }}>{fmt(goal ? Math.abs(rem) : tot.kcal)}</T>
            <T bold muted size={11} style={{ letterSpacing: 1.1, textTransform: 'uppercase', color: over ? c.danger : c.muted }}>{goal ? (over ? 'Over' : 'Left') : 'Eaten'}</T>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 160, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Stat v={goal ? fmt(goal) : '–'} l="Goal" />
            <T mono muted size={18} style={{ paddingBottom: 14 }}>−</T>
            <Stat v={fmt(tot.kcal)} l="Food" />
            <T mono muted size={18} style={{ paddingBottom: 14 }}>=</T>
            <Stat v={goal ? `${over ? '−' : ''}${fmt(Math.abs(rem))}` : '–'} l={over ? 'Over' : 'Remaining'} color={over ? c.danger : c.meal} />
          </View>
          {!goal ? <Btn small kind="primary" title="Set calorie goal" onPress={() => router.push('/settings')} style={{ alignSelf: 'flex-start' }} /> : null}
        </View>
      </View>
      <View style={{ gap: 14, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 14 }}>
        {macro('Protein', tot.protein, profile?.protein_goal ?? null, c.protein)}
        {macro('Carbs', tot.carbs, profile?.carb_goal ?? null, c.lift)}
        {macro('Fat', tot.fat, profile?.fat_goal ?? null, c.meal)}
      </View>
    </Card>
  );
}

function Stat({ v, l, color }: { v: string; l: string; color?: string }) {
  return (
    <View>
      <T mono bold size={18} style={color ? { color } : undefined}>{v}</T>
      <T bold muted size={10} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>{l}</T>
    </View>
  );
}
