import { router, Tabs } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { F, useTheme } from '@/lib/theme';

function LogButton({ kind }: { kind: 'meal' | 'workout' }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/log', params: { kind } })}
      style={{ backgroundColor: c.accent, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, marginRight: 12 }}>
      <Text style={{ color: c.accentInk, fontFamily: F.bodySemi, fontSize: 14 }}>+ Log {kind}</Text>
    </Pressable>
  );
}

const icon = (name: string) => ({ color, size }: { color: string; size: number }) => {
  const p = { stroke: color, strokeWidth: 2, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'macros' ? <><Circle cx={12} cy={12} r={8} {...p} /><Path d="M12 4a8 8 0 0 1 8 8h-8z" fill={color} /></> : null}
      {name === 'meals' ? <><Circle cx={12} cy={13} r={7} {...p} /><Circle cx={12} cy={13} r={3.5} {...p} /><Path d="M4 3v5M2.5 3v3.5a1.5 1.5 0 0 0 3 0V3" {...p} /></> : null}
      {name === 'workouts' ? <><Rect x={2} y={9} width={3} height={6} rx={1} {...p} /><Rect x={19} y={9} width={3} height={6} rx={1} {...p} /><Rect x={5} y={7} width={3} height={10} rx={1} {...p} /><Rect x={16} y={7} width={3} height={10} rx={1} {...p} /><Path d="M8 12h8" {...p} /></> : null}
      {name === 'friends' ? <><Circle cx={9} cy={8} r={3.5} {...p} /><Path d="M2.5 20a6.5 6.5 0 0 1 13 0" {...p} /><Circle cx={17} cy={9} r={2.8} {...p} /><Path d="M17 14.5a5 5 0 0 1 4.5 5" {...p} /></> : null}
      {name === 'settings' ? <><Circle cx={12} cy={12} r={3} {...p} /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" {...p} /></> : null}
    </Svg>
  );
};

export default function TabsLayout() {
  const c = useTheme();
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: c.surface }, headerTintColor: c.ink, headerShadowVisible: false,
      headerTitleStyle: { fontFamily: F.display, fontSize: 26, textTransform: 'uppercase' } as any,
      tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
      tabBarActiveTintColor: c.ink, tabBarInactiveTintColor: c.muted,
      tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: 11 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Macros', tabBarIcon: icon('macros'), headerRight: () => <LogButton kind="meal" /> }} />
      <Tabs.Screen name="meals" options={{ title: 'Meals', tabBarIcon: icon('meals'), headerRight: () => <LogButton kind="meal" /> }} />
      <Tabs.Screen name="workouts" options={{ title: 'Workouts', tabBarIcon: icon('workouts'), headerRight: () => <LogButton kind="workout" /> }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: icon('friends') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
