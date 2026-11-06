import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { isRest, useData } from '@/lib/data';
import { useTheme } from '@/lib/theme';
import { addDays, parseDay, shortDay, today, weekStart } from '@/lib/util';
import { Chip, H, T } from './ui';

/** Weekly crew recap: who's hitting their workout goal, days logged, PRs */
export function CrewRecap() {
  const c = useTheme();
  const { posts, prs, members, uid, nameOf } = useData();
  const [last, setLast] = useState(false);
  const t = today();
  const ws = last ? addDays(weekStart(t), -7) : weekStart(t);
  const we = addDays(ws, 6);
  const daysSoFar = last ? 7 : Math.round((parseDay(t).getTime() - parseDay(ws).getTime()) / 864e5) + 1;

  const rows = useMemo(() => {
    const ids = Object.keys(members);
    if (uid && !ids.includes(uid)) ids.unshift(uid);
    return ids.map((id) => {
      const mine = posts.filter((p) => p.author === id && p.day >= ws && p.day <= we);
      const myPrs = prs.filter((p) => p.author === id && p.day >= ws && p.day <= we);
      const workouts = new Set(mine.filter((p) => p.kind === 'workout' && !isRest(p)).map((p) => p.day)).size;
      const logged = new Set([...mine.map((p) => p.day), ...myPrs.map((p) => p.day)]).size;
      const goal = members[id]?.workout_goal ?? 4;
      return { id, workouts, logged, prs: myPrs.length, goal, hit: workouts >= goal };
    }).sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : nameOf(a.id).localeCompare(nameOf(b.id))));
  }, [posts, prs, members, uid, ws, we, nameOf]);

  if (rows.length < 2) return null; // nothing to compare until a friend joins
  const totalW = rows.reduce((a, r) => a + r.workouts, 0);
  const totalPR = rows.reduce((a, r) => a + r.prs, 0);
  const hit = rows.filter((r) => r.hit).length;

  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <H size={22} style={{ flex: 1 }}>Crew recap</H>
        <Chip title="This week" on={!last} onPress={() => setLast(false)} />
        <Chip title="Last week" on={last} onPress={() => setLast(true)} />
      </View>
      <T muted size={13}>
        {shortDay(ws)}–{shortDay(we)} · {totalW} workout{totalW === 1 ? '' : 's'} · {totalPR} PR{totalPR === 1 ? '' : 's'} · {hit} of {rows.length} {last ? 'hit' : 'have hit'} their workout goal
      </T>
      {rows.map((r) => (
        <View key={r.id} style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <T bold size={15} style={{ flex: 1 }} numberOfLines={1}>{r.id === uid ? `${nameOf(r.id)} (you)` : nameOf(r.id)}{r.hit ? '  ✓' : ''}</T>
            <T mono size={13}><T mono bold size={13}>{r.workouts}</T>/{r.goal} workouts</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: Math.max(r.goal, r.workouts) }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < r.workouts ? c.protein : c.sunk }} />
            ))}
          </View>
          <T muted size={12}>Logged {r.logged} of {daysSoFar} day{daysSoFar === 1 ? '' : 's'}{r.prs ? ` · ${r.prs} PR${r.prs === 1 ? '' : 's'}` : ''}</T>
        </View>
      ))}
    </View>
  );
}
