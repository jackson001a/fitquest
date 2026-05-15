import { supabase } from './supabase';

// ─── Login anônimo (primeiro acesso sem cadastro) ─────────────────────────────
export async function signInAnonymous() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

// ─── Retorna o usuário autenticado atual ──────────────────────────────────────
export async function getCurrentAuthUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Cadastro com email + senha ───────────────────────────────────────────────
export async function signUpWithEmail(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data.user;
}

// ─── Login com email + senha ──────────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

// ─── Converte conta anônima em conta com email (após onboarding) ──────────────
export async function linkEmailToAnonymous(email, password) {
  const { data, error } = await supabase.auth.updateUser({ email, password });
  if (error) throw error;
  return data.user;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function signOut() {
  await supabase.auth.signOut();
}

// ─── Ouve mudanças de autenticação ────────────────────────────────────────────
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session?.user ?? null)
  );
  return () => subscription.unsubscribe();
}
