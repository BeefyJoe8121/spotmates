import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Post, useData } from '@/lib/data';
import { useTheme } from '@/lib/theme';
import { ageMs, dayLabel, POST_TTL_MS } from '@/lib/util';
import { PostCard } from './PostCard';
import { Btn, Card, Chip, H, T } from './ui';

/** A feed of meals or workouts, either mine or my friends' */
export function Feed({ kind, scope, header }: { kind: 'meal' | 'workout'; scope: 'mine' | 'friends'; header?: React.ReactNode }) {
  const c = useTheme();
  const { posts, uid, nameOf, members, refresh, loading } = useData();
  const [who, setWho] = useState<string>('all');

  const friends = useMemo(() => Object.keys(members).filter((id) => id !== uid), [members, uid]);
  const list = useMemo(() => posts
    .filter((p) => p.kind === kind && (scope === 'mine' ? p.author === uid : p.author !== uid))
    .filter((p) => !(p.kind === 'meal' && ageMs(p.created_at) > POST_TTL_MS))
    .filter((p) => who === 'all' || p.author === who)
    .sort((a, b) => (a.day === b.day ? b.created_at.localeCompare(a.created_at) : a.day < b.day ? 1 : -1)), [posts, kind, scope, uid, who]);

  const groups: { day: string; items: Post[] }[] = [];
  list.forEach((p) => { const g = groups[groups.length - 1]; if (g && g.day === p.day) g.items.push(p); else groups.push({ day: p.day, items: [p] }); });
  const word = kind === 'meal' ? 'meal' : 'workout';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.muted} />}>
      {header}
      {scope === 'friends' && friends.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip title="All friends" on={who === 'all'} onPress={() => setWho('all')} />
          {friends.map((id) => <Chip key={id} title={nameOf(id)} on={who === id} onPress={() => setWho(id)} />)}
        </View>
      ) : null}
      {!list.length ? (
        <Card>
          <H size={26}>{scope === 'friends' ? `No friends' ${word}s yet` : `No ${word}s yet`}</H>
          <T muted>{scope === 'friends'
            ? `When your crew posts ${word}s, they show up here with their name on each one, and you can leave comments. Share your crew code from Settings to add friends.`
            : kind === 'meal' ? 'Snap your next meal and log it with its macros. Meal posts stay up for 3 days.' : 'Log your next session with a photo and your exercises so your crew can check your work.'}</T>
          {scope === 'mine' ? <Btn kind="primary" title={`Log a ${word}`} onPress={() => router.push({ pathname: '/log', params: { kind } })} style={{ alignSelf: 'flex-start' }} /> : null}
        </Card>
      ) : groups.map((g) => (
        <View key={g.day} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: c.ink, paddingBottom: 6, marginTop: 6 }}>
            <H>{dayLabel(g.day)}</H>
            <T mono muted size={12}>{g.items.length} {word}{g.items.length === 1 ? '' : 's'}</T>
          </View>
          {g.items.map((p) => <PostCard key={p.id} post={p} />)}
        </View>
      ))}
    </ScrollView>
  );
}
