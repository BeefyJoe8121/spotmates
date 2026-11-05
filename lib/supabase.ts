import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Public values for the Spot Mates Supabase project. Safe to ship in the app: row level security protects the data.
const DEFAULT_URL = 'https://mevwwhtzottopumzwkay.supabase.co';
const DEFAULT_KEY = 'sb_publishable_LAIHkxGz_upGUeJ0gieDmg_f8Jg6y0y';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
// Written by `eas integrations:supabase:connect` (older setups used the ANON_KEY name)
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const supabaseConfigured = !!url && !!anonKey;

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the session fresh only while the app is open
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const photoUrl = (path?: string | null) =>
  path ? supabase.storage.from('photos').getPublicUrl(path).data.publicUrl : null;
