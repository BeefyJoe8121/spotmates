import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { CrewRecap } from '@/components/CrewRecap';
import { Feed } from '@/components/Feed';
import { PRFeed } from '@/components/PRFeed';
import { Seg } from '@/components/ui';
import { useData } from '@/lib/data';

type Tab = 'meal' | 'workout' | 'pr';
type Watched = 'meal' | 'workout';

// When you last looked at each feed (saved on this phone)
const readSeen = (k: Watched): string | null => { try { return (globalThis as any).localStorage?.getItem(`spotmates-seen-${k}`) ?? null; } catch { return null; } };
const writeSeen = (k: Watched, v: string) => { try { (globalThis as any).localStorage?.setItem(`spotmates-seen-${k}`, v); } catch {} };

export default function FriendsScreen() {
  const { posts, uid } = useData();
  const [kind, setKind] = useState<Tab>('meal');
  const [focused, setFocused] = useState(true);
  const [seen, setSeen] = useState<Record<Watched, string | null>>(() => ({ meal: readSeen('meal'), workout: readSeen('workout') }));
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));

  // Newest post from a friend in each feed
  const latest = useMemo(() => {
    const out: Record<Watched, string> = { meal: '', workout: '' };
    posts.forEach((p) => { if (p.author !== uid && (p.kind === 'meal' || p.kind === 'workout') && p.created_at > out[p.kind]) out[p.kind] = p.created_at; });
    return out;
  }, [posts, uid]);

  const markSeen = useCallback((k: Watched) => {
    if (!latest[k]) return;
    setSeen((cur) => (cur[k] && cur[k]! >= latest[k] ? cur : (writeSeen(k, latest[k]), { ...cur, [k]: latest[k] })));
  }, [latest]);

  useEffect(() => {
    // First time on this phone: start from what's there now instead of lighting up old posts
    (['meal', 'workout'] as Watched[]).forEach((k) => { if (seen[k] == null) markSeen(k); });
    // Whatever you're looking at right now counts as seen
    if (focused && (kind === 'meal' || kind === 'workout')) markSeen(kind);
  }, [kind, focused, latest, seen, markSeen]);

  const dots = {
    meal: !!seen.meal && latest.meal > seen.meal && !(focused && kind === 'meal'),
    workout: !!seen.workout && latest.workout > seen.workout && !(focused && kind === 'workout'),
  };

  const header = (
    <View style={{ gap: 14 }}>
      <CrewRecap />
      <Seg value={kind} options={[['meal', 'Meals'], ['workout', 'Workouts'], ['pr', 'PRs']]} onChange={setKind} dots={dots} />
    </View>
  );
  if (kind === 'pr') return <PRFeed header={header} />;
  return <Feed key={kind} kind={kind} scope="friends" header={header} />;
}
