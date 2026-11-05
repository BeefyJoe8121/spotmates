import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useData } from '@/lib/data';
import { F, useTheme } from '@/lib/theme';
import { fmt } from '@/lib/util';
import { Bar, Btn, Card, Chip, Field, H, T } from './ui';

export function WaterCard() {
  const c = useTheme();
  const { water, profile, addWater, undoWater } = useData();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const goal = profile?.water_goal ?? 100;
  const left = goal - water.oz;
  const last = water.entries[water.entries.length - 1];

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <H>Water</H>
          <T mono muted size={14}><T mono bold size={20}>{fmt(water.oz)}</T> / {fmt(goal)} oz</T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Close water options' : 'Add water'} onPress={() => setOpen(!open)}
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.water, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: open ? '45deg' : '0deg' }] }}>
          <Text style={{ color: c.surface, fontSize: 28, lineHeight: 30, fontFamily: F.bodySemi }}>+</Text>
        </Pressable>
      </View>
      <Bar value={water.oz} goal={goal} color={c.water} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <T muted size={12}>{left <= 0 ? <T bold size={12} style={{ color: c.water }}>Goal hit</T> : <><T bold size={12} style={{ color: c.water }}>{fmt(left)} oz to go</T> · about {Math.round((water.oz / 8) * 10) / 10} cups so far</>}</T>
        {last ? <Pressable onPress={undoWater} accessibilityRole="button"><T muted size={12} style={{ textDecorationLine: 'underline' }}>Undo last ({fmt(last.oz)} oz)</T></Pressable> : null}
      </View>
      {open ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
          {[8, 12, 16, 20, 32].map((o) => <Chip key={o} title={`+${o} oz`} onPress={() => addWater(o)} />)}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', width: 150 }}>
            <Field value={custom} onChangeText={setCustom} keyboardType="number-pad" placeholder="oz" style={{ paddingVertical: 6 }} accessibilityLabel="Custom amount in ounces" />
            <Btn small title="Add" onPress={() => { const v = parseInt(custom, 10); if (v > 0 && v <= 128) { addWater(v); setCustom(''); } }} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
