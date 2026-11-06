import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useData } from '@/lib/data';
import { exKey, prLbs, prReps, prScore } from '@/lib/prs';
import { useTheme } from '@/lib/theme';
import { fmt } from '@/lib/util';
import { PostCard } from './PostCard';
import { Btn, Card, Chip, H, Label, T } from './ui';

/** Everyone's PRs (yours included), with the crew's top lifts on top */
export function PRFeed({ header }: { header?: React.ReactNode }) {
  const c = useTheme();
  const { prs, members, nameOf, refresh, loading } = useData();
  const [who, setWho] = useState('all');
  const people = Object.keys(members);
  const list = useMemo(() => prs.filter((p) => who === 'all' || p.author === who)
    .sort((a, b) => (a.day === b.day ? b.created_at.localeCompare(a.created_at) : a.day < b.day ? 1 : -1)), [prs, who]);

  // Best per lift (per person when filtered, otherwise whoever holds it)
  const tops = useMemo(() => {
    const best: Record<string, (typeof list)[number]> = {};
    list.forEach((p) => { const k = exKey(p.title); if (!best[k] || prScore(p) > prScore(best[k])) best[k] = p; });
    return Object.values(best).sort((a, b) => prScore(b) - prScore(a)).slice(0, 6);
  }, [list]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.muted} />}>
      {header}
      <Btn kind="primary" title="+ Log a PR" onPress={() => router.push('/pr')} style={{ alignSelf: 'flex-start' }} />
      {people.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip title="Everyone" on={who === 'all'} onPress={() => setWho('all')} />
          {people.map((id) => <Chip key={id} title={nameOf(id)} on={who === id} onPress={() => setWho(id)} />)}
        </View>
      ) : null}
      {!list.length ? (
        <Card>
          <H size={26}>No PRs yet</H>
          <T muted>Hit a new best on a lift? Log it here so your friends can see it. It also gets a trophy on your Progress calendar.</T>
        </Card>
      ) : (
        <>
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', backgroundColor: c.sunk, paddingVertical: 8, paddingHorizontal: 12, gap: 8 }}>
              <View style={{ flex: 2 }}><Label>Top lifts</Label></View>
              <View style={{ flex: 1.3 }}><Label>Who</Label></View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}><Label>Best</Label></View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}><Label>Est. 1RM</Label></View>
            </View>
            {tops.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, gap: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                <T size={14} style={{ flex: 2 }} numberOfLines={1}>{p.title}</T>
                <T muted size={14} style={{ flex: 1.3 }} numberOfLines={1}>{nameOf(p.author)}</T>
                <T mono size={14} style={{ flex: 1, textAlign: 'right' }}>{fmt(prLbs(p))}×{fmt(prReps(p))}</T>
                <T mono bold size={14} style={{ flex: 1, textAlign: 'right' }}>{fmt(prScore(p))}</T>
              </View>
            ))}
          </View>
          {list.map((p) => <PostCard key={p.id} post={p} />)}
        </>
      )}
    </ScrollView>
  );
}
