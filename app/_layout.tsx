import { BigShouldersDisplay_800ExtraBold, BigShouldersDisplay_900Black } from '@expo-google-fonts/big-shoulders-display';
import { InstrumentSans_400Regular, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { JetBrainsMono_400Regular, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
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
  const [fontsLoaded, fontError] = useFonts({
    BigShouldersDisplay_800ExtraBold, BigShouldersDisplay_900Black,
    InstrumentSans_400Regular, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
    JetBrainsMono_400Regular, JetBrainsMono_600SemiBold,
  });
  if (!fontsLoaded && !fontError) return null;
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
        <T muted>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the .env file, then restart.</T>
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
      </Stack>
    </>
  );
}
