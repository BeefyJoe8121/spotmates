import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useData } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { F, useTheme } from '@/lib/theme';
import { Btn, Card, Field, H, T } from './ui';

export function CrewScreen() {
  const c = useTheme();
  const { createCrew, joinCrew } = useData();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>) => { setBusy(true); setErr(null); const e = await fn(); setBusy(false); if (e) setErr(e); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: F.displayBlack, fontSize: 40, color: c.ink, textTransform: 'uppercase' }}>Find your crew</Text>
          <T muted>Your crew is the group of friends who see your posts. Join one with a code from a friend, or start your own.</T>
        </View>
        <Card>
          <H size={22}>Join with a code</H>
          <Field value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="6-letter code" autoCapitalize="characters" maxLength={6} accessibilityLabel="Crew code" />
          <Btn kind="primary" title="Join crew" disabled={busy || code.trim().length < 6} onPress={() => run(() => joinCrew(code))} />
        </Card>
        <Card>
          <H size={22}>Start a crew</H>
          <Field value={name} onChangeText={setName} placeholder="Crew name, like Smash Crew" maxLength={40} accessibilityLabel="Crew name" />
          <Btn title="Create crew" disabled={busy || !name.trim()} onPress={() => run(() => createCrew(name))} />
          <T muted size={13}>You'll get a code to send your friends.</T>
        </Card>
        {err ? <T size={13} style={{ color: c.danger }}>{err}</T> : null}
        <Btn small title="Sign out" onPress={() => supabase.auth.signOut()} style={{ alignSelf: 'center' }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
