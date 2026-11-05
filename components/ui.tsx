import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { F, Palette, useTheme } from '@/lib/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 }, style]}>{children}</View>;
}

export function H({ children, size = 24, style }: { children: React.ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  return <Text style={[{ fontFamily: F.display, fontSize: size, color: c.ink, textTransform: 'uppercase', letterSpacing: 0.6 }, style]}>{children}</Text>;
}

export function T({ children, muted, size = 15, bold, mono, style, numberOfLines }: {
  children: React.ReactNode; muted?: boolean; size?: number; bold?: boolean; mono?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  const c = useTheme();
  const family = mono ? (bold ? F.monoSemi : F.mono) : bold ? F.bodyBold : F.body;
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: family, fontSize: size, color: muted ? c.muted : c.ink, fontVariant: ['tabular-nums'] }, style]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return <Text style={{ fontFamily: F.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: c.muted }}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'plain', disabled, small, style }: {
  title: string; onPress?: () => void; kind?: 'plain' | 'primary' | 'danger'; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.accent : 'transparent';
  const fg = kind === 'primary' ? c.accentInk : kind === 'danger' ? c.danger : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        backgroundColor: bg, borderColor: kind === 'primary' ? c.accent : c.line, borderWidth: 1, borderRadius: 999,
        paddingVertical: small ? 6 : 10, paddingHorizontal: small ? 12 : 18, alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      }, style]}
    >
      <Text style={{ fontFamily: F.bodySemi, fontSize: small ? 13 : 15, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...rest }: TextInputProps & { label?: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
      {label ? <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: c.muted }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...rest}
        style={[{ borderWidth: 1, borderColor: c.line, backgroundColor: c.bg, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, color: c.ink, fontFamily: F.body, fontSize: 15 }, style]}
      />
    </View>
  );
}

export function Seg<V extends string>({ value, options, onChange, tint }: {
  value: V; options: [V, string][]; onChange: (v: V) => void; tint?: (v: V, c: Palette) => { bg: string; fg: string } | null;
}) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.line, borderRadius: 10, overflow: 'hidden' }}>
      {options.map(([v, label]) => {
        const on = v === value;
        const t = on ? tint?.(v, c) ?? { bg: c.ink, fg: c.bg } : null;
        return (
          <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(v)}
            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: t ? t.bg : 'transparent' }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, textTransform: 'uppercase', letterSpacing: 0.6, color: t ? t.fg : c.muted }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ title, on, onPress }: { title: string; on?: boolean; onPress?: () => void }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ borderWidth: 1, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: on ? c.bg : c.muted }}>{title}</Text>
    </Pressable>
  );
}

export function Bar({ value, goal, color, height = 14 }: { value: number; goal: number | null; color: string; height?: number }) {
  const c = useTheme();
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  const over = !!goal && value > goal;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.sunk, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%` as `${number}%`, height: '100%', borderRadius: height / 2, backgroundColor: over ? c.danger : color }} />
    </View>
  );
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
