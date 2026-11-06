import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { isRest, REST, useData } from '@/lib/data';
import { useTheme } from '@/lib/theme';
import { today } from '@/lib/util';
import { Btn, Card, H, T } from './ui';

/** Top of the Workouts tab: one tap to log today as a rest day (or undo it) */
export function RestDayCard() {
  const c = useTheme();
  const { posts, uid, addPost, deletePost } = useData();
  const [busy, setBusy] = useState(false);
  const t = today();
  const mineToday = posts.filter((p) => p.author === uid && p.kind === 'workout' && p.day === t);
  const rest = mineToday.find(isRest);

  // Already trained today: no rest day to log
  if (!rest && mineToday.length) return null;

  if (rest) {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.sunk, borderStyle: 'dashed', borderColor: c.muted }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T bold>Rest day logged for today</T>
          <T muted size={13}>Your crew can see it, and your streak is safe.</T>
        </View>
        <Btn small title={busy ? 'Undoing…' : 'Undo'} disabled={busy} onPress={async () => {
          setBusy(true); await deletePost(rest); setBusy(false);
        }} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <H size={22}>Taking a rest day?</H>
      <T muted size={13}>Log it so your crew knows you're recovering, not slacking. Rest days keep your streak going but don't count toward your weekly workout goal.</T>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn small kind="primary" title={busy ? 'Logging…' : 'Log rest day'} disabled={busy} onPress={async () => {
          setBusy(true);
          const e = await addPost({ kind: 'workout', day: t, title: null, notes: null, wtype: REST, minutes: null, exercises: [] });
          setBusy(false);
          if (e) Alert.alert("Couldn't log it", e);
        }} />
        <Btn small title="Other day or add a note" onPress={() => router.push({ pathname: '/log', params: { kind: 'workout', rest: '1' } })} />
      </View>
    </Card>
  );
}
