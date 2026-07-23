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

// ─── Retorna email/status da conta (para a tela de Conta e Segurança) ─────────
// pendingEmail = email enviado para confirmação mas que ainda não foi clicado
// (Supabase exige clique no link antes de liberar login com esse email).
export async function getAuthIdentity() {
  const { data: { user } } = await supabase.auth.getUser();
  return {
    email:        user?.email ?? null,
    isAnonymous:  user?.is_anonymous ?? true,
    pendingEmail: user?.new_email ?? null,
  };
}

// ─── Altera a senha da conta já autenticada ────────────────────────────────────
export async function changePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data.user;
}

// ─── Reenvia o email de confirmação de troca/cadastro de email ────────────────
export async function resendEmailConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: 'email_change', email });
  if (error) throw error;
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
