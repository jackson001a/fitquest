import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── COLE AQUI AS CREDENCIAIS DO SEU PROJETO SUPABASE ────────────────────────
// Supabase Dashboard → Project Settings → API
export const SUPABASE_URL      = 'https://kqlgycnpsruxrjhkcgnt.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbGd5Y25wc3J1eHJqaGtjZ250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDQ1MDMsImV4cCI6MjA5MzgyMDUwM30.H_C4UElyYpZlXODYG7gunrwPOJZYThkVjsLPWvdepk8';
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:          AsyncStorage,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});
