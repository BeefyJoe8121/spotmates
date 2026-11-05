import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { TodayCard, useTodayTotals } from '@/components/TodayCard';
import { Btn, Card, H, T } from '@/components/ui';
import { WaterCard } from '@/components/WaterCard';
import { useData } from '@/lib/data';
import { useTheme } from '@/lib/theme';
import { fmt, macroKcal, num } from '@/lib/util';

export default function MacrosScreen() {
  const c = useTheme();
  const { refresh, loading } = useData();
  const { meals } = useTodayTotals();
  const sorted = [...meals].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.muted} />}>
      <TodayCard />
      <WaterCard />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: c.ink, paddingBottom: 6, marginTop: 6 }}>
        <H>Today's meals</H>
        <T mono muted size={12}>{meals.length} logged</T>
      </View>
      {!sorted.length ? (
        <Card>
          <H size={26}>Nothing eaten yet</H>
          <T muted>Log a meal with its photo and macros, and it counts toward today's totals above.</T>
          <Btn kind="primary" title="Log a meal" onPress={() => router.push({ pathname: '/log', params: { kind: 'meal' } })} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', backgroundColor: c.liftSoft, paddingVertical: 7, paddingHorizontal: 12 }}>
            {['Meal', 'kcal', 'P', 'C', 'F'].map((h, i) => <T key={h} bold muted size={10} style={{ flex: i ? 0.55 : 2, textAlign: i ? 'right' : 'left', letterSpacing: 1, textTransform: 'uppercase' }}>{h}</T>)}
          </View>
          {sorted.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.line }}>
              <T size={14} style={{ flex: 2 }} numberOfLines={2}><T bold size={14}>{m.title || m.meal_type || 'Meal'}</T>{m.title && m.meal_type ? <T muted size={14}> · {m.meal_type}</T> : null}</T>
              {[m.kcal ?? macroKcal(m.protein, m.carbs, m.fat), num(m.protein), num(m.carbs), num(m.fat)].map((v, i) => <T key={i} mono size={14} style={{ flex: 0.55, textAlign: 'right' }}>{fmt(v)}</T>)}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
