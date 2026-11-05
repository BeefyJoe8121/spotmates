import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from '@/components/AuthScreen';
import { CrewScreen } from '@/components/CrewScreen';
import { T } from '@/components/ui';
import { DataProvider, useData } from '@/lib/data';
import { supabaseConfigured } from '@/lib/supabase';
import { F, useTheme } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <Gate />
      </DataProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const c = useTheme();
  const { ready, session, profile, loading } = useData();
  if (!supabaseConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 8 }}>
        <T bold size={18}>Spot Mates isn't connected yet</T>
        <T muted>Run `eas integrations:supabase:connect` in the project folder, then restart the app.</T>
      </View>
    );
  }
  if (!ready || (session && !profile && loading)) {
    return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.muted} /></View>;
  }
  if (!session) return <AuthScreen />;
  if (!profile?.crew_id) return <CrewScreen />;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: c.surface }, headerTintColor: c.ink, headerTitleStyle: { fontFamily: F.display, fontSize: 22 }, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="log" options={{ presentation: 'modal', title: 'Log it' }} />
        <Stack.Screen name="food" options={{ presentation: 'modal', title: 'Add food' }} />
      </Stack>
    </>
  );
}
