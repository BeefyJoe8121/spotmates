import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { F, useTheme } from '@/lib/theme';
import { Btn, Card, Field, Seg, T } from './ui';

export function AuthScreen() {
  const c = useTheme();
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  async function go() {
    const e = email.trim().toLowerCase();
    if (!e.includes('@')) return setMsg({ text: 'Enter your email address.', bad: true });
    if (password.length < 6) return setMsg({ text: 'Passwords need at least 6 characters.', bad: true });
    setBusy(true); setMsg(null);
    if (mode === 'up') {
      const { data, error } = await supabase.auth.signUp({ email: e, password });
      if (error) setMsg({ text: error.message, bad: true });
      else {
        if (data.session && name.trim()) await supabase.from('profiles').update({ display_name: name.trim().slice(0, 30) }).eq('id', data.session.user.id);
        if (!data.session) setMsg({ text: 'Check your email to confirm your account, then sign in.' });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) setMsg({ text: error.message === 'Invalid login credentials' ? "That email and password don't match. Try again." : error.message, bad: true });
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: F.displayBlack, fontSize: 52, color: c.ink, textTransform: 'uppercase' }}>Spot Mates</Text>
          <T muted>Post your meals and workouts. Keep your crew honest.</T>
        </View>
        <Card>
          <Seg value={mode} options={[['up', 'Create account'], ['in', 'Sign in']]} onChange={(v) => { setMode(v); setMsg(null); }} />
          {mode === 'up' ? <Field label="Your name" value={name} onChangeText={setName} placeholder="Declan" maxLength={30} autoCapitalize="words" /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
          {msg ? <T size={13} style={{ color: msg.bad ? c.danger : c.muted }}>{msg.text}</T> : null}
          <Btn kind="primary" title={busy ? 'One sec…' : mode === 'up' ? 'Create account' : 'Sign in'} disabled={busy} onPress={go} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
