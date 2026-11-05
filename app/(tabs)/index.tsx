import { router } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { TodayCard, useTodayTotals } from '@/components/TodayCard';
import { H, T } from '@/components/ui';
import { WaterCard } from '@/components/WaterCard';
import { Post, useData } from '@/lib/data';
import { useTheme } from '@/lib/theme';
import { fmt, macroKcal } from '@/lib/util';

const MEALS = [['Breakfast', 'Breakfast'], ['Lunch', 'Lunch'], ['Dinner', 'Dinner'], ['Snack', 'Snacks']] as const;
const postKcal = (m: Post) => m.kcal ?? macroKcal(m.protein, m.carbs, m.fat);

export default function MacrosScreen() {
  const c = useTheme();
  const { refresh, loading } = useData();
  const { meals } = useTodayTotals();
  const sorted = [...meals].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const addFood = (meal: string) => router.push({ pathname: '/log', params: { kind: 'meal', meal, search: '1' } });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.muted} />}>
      <TodayCard />
      <WaterCard />

      {/* Food diary, MyFitnessPal style: one section per meal */}
      <View style={{ borderBottomWidth: 2, borderBottomColor: c.ink, paddingBottom: 6, marginTop: 6 }}>
        <H>Food diary</H>
      </View>
      {MEALS.map(([type, label]) => {
        const list = sorted.filter((m) => (m.meal_type ?? 'Snack') === type);
        const total = list.reduce((a, m) => a + postKcal(m), 0);
        return (
          <View key={type} style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
              <T bold size={17} style={{ flex: 1 }}>{label}</T>
              <T mono bold size={15}>{fmt(total)}</T>
            </View>
            {list.flatMap((m) => m.foods?.length
              ? m.foods.map((x, i) => (
                  <View key={`${m.id}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T size={15} numberOfLines={1}>{x.name}</T>
                      <T muted size={12} numberOfLines={1}>{[x.brand, `${x.serving}${x.qty !== 1 ? ` × ${x.qty}` : ''}`].filter(Boolean).join(', ')}</T>
                    </View>
                    <T mono size={15}>{fmt(x.kcal)}</T>
                  </View>
                ))
              : [(
                  <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T size={15} numberOfLines={1}>{m.title || label}</T>
                      <T muted size={12} numberOfLines={1}>{[m.place, `P ${fmt(Number(m.protein) || 0)}g · C ${fmt(Number(m.carbs) || 0)}g · F ${fmt(Number(m.fat) || 0)}g`].filter(Boolean).join(' · ')}</T>
                    </View>
                    <T mono size={15}>{fmt(postKcal(m))}</T>
                  </View>
                )])}
            <Pressable onPress={() => addFood(type)} accessibilityRole="button"
              style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: pressed ? c.sunk : 'transparent' })}>
              <T bold size={14} style={{ color: c.accent }}>+ Add food</T>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}
