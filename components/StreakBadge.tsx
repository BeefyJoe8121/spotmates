import React, { useEffect } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useData } from '@/lib/data';
import { HOLI, holidayKey } from '@/lib/holidays';
import { F, TIERS, tierFor, useAppPrefs, useTheme } from '@/lib/theme';

export function flameXml(tier: number) {
  const t = TIERS[tier];
  const stops = t.c.map((col, i) => `<stop offset="${(i / (t.c.length - 1)).toFixed(2)}" stop-color="${col}"/>`).join('');
  return `<svg viewBox="0 0 16 20"><defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0">${stops}</linearGradient></defs>` +
    `<path d="M8 0c.6 3.2 4.2 5.4 5.6 9 1.6 4.2-.9 9.4-5.6 9.9C3.6 19.4.6 15.6 1.6 11.4c.5-2 1.7-3.2 2.4-4.6.3 1.6 1 2.6 2 3C5.5 6.2 6.6 2.8 8 0z" fill="url(#g)"/>` +
    `<path d="M8.2 10.4c1.6 1.6 2.6 3 2.3 4.9-.3 1.7-1.6 2.7-3 2.7-1.6-.1-2.7-1.4-2.5-3 .2-1.6 1.6-2.5 2.2-4.1.4.7.7 1 1 .5z" fill="${t.core}"/></svg>`;
}

/** The icon for a streak: a holiday icon around holidays (unless turned off), otherwise the milestone-colored flame */
export function StreakIcon({ n, size = 18, forceFire }: { n: number; size?: number; forceFire?: boolean }) {
  const { prefs } = useAppPrefs();
  const k = !forceFire && prefs.streakIcon === 'holiday' ? holidayKey(new Date()) : null;
  const xml = k ? HOLI[k].svg : flameXml(tierFor(n));
  return <SvgXml xml={xml} width={k ? size * 1.1 : size * 0.8} height={k ? size * 1.1 : size} />;
}

/** Pill in the header: icon + days in a row. Tap for details. */
export function StreakBadge() {
  const c = useTheme();
  const { prefs } = useAppPrefs();
  const { streak: st } = useData();
  const streak = st.n;
  const tier = TIERS[tierFor(streak)];
  const next = TIERS.find((t) => t.at > streak);
  const k = prefs.streakIcon === 'holiday' ? holidayKey(new Date()) : null;
  const ring = tier.c[Math.floor(tier.c.length / 2)];
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={`${streak} day streak`}
      onPress={() => Alert.alert(
        `${streak} day${streak === 1 ? '' : 's'} in a row`,
        `${st.loggedToday ? "You've logged today. Nice." : streak ? 'Log a meal, workout or PR today to keep it going.' : 'Log a meal, workout or PR to start a streak.'}\n\nYou get one rest day a week, so one missed day won't break it.${st.restLeft ? " This week's rest day is still available." : " You've used this week's rest day."}${next ? `\n\nNext flame color at ${next.name} (${next.at - streak} more day${next.at - streak === 1 ? '' : 's'}).` : "\n\nYou've hit every milestone. Legend."}${k ? `\n\nHappy ${HOLI[k].name}! Turn holiday icons off in Settings.` : ''}`,
      )}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 12, paddingVertical: 5, paddingLeft: 8, paddingRight: 10, borderRadius: 999, backgroundColor: c.sunk, borderWidth: 1.5, borderColor: ring }}>
      <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
        <StreakIcon n={streak} size={18} />
      </View>
      <Text style={{ color: c.ink, fontFamily: F.monoSemi, fontSize: 15 }}>{streak}</Text>
    </Pressable>
  );
}

/** Pops a message the day you hit a new flame color */
export function StreakWatcher() {
  const { streak } = useData();
  useEffect(() => {
    const n = streak.n;
    const tier = TIERS.find((t) => t.at === n && n > 1);
    if (!tier) return;
    let last = '';
    try { last = (globalThis as any).localStorage?.getItem('spotmates-milestone') ?? ''; } catch {}
    if (last === String(n)) return;
    try { (globalThis as any).localStorage?.setItem('spotmates-milestone', String(n)); } catch {}
    const t = setTimeout(() => Alert.alert(`${tier.name} streak!`, `${n} days in a row of logging. Your flame just changed color.`), 900);
    return () => clearTimeout(t);
  }, [streak.n]);
  return null;
}
