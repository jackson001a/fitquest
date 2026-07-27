import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase, SUPABASE_URL } from './supabase';

// react-native-google-signin exige um dev build (EAS) — não existe no Expo Go.
// O require fica protegido para o app continuar funcionando em dev sem o módulo nativo.
let GoogleSignin = null;
try {
  ({ GoogleSignin } = require('@react-native-google-signin/google-signin'));
} catch (e) {
  GoogleSignin = null;
}

// ─── Preencher com os Client IDs do Google Cloud Console ─────────────────────
// APIs & Services → Credentials:
//   GOOGLE_WEB_CLIENT_ID = OAuth client tipo "Web application" — precisa ser
//     o MESMO client ID cadastrado no Supabase Dashboard → Authentication →
//     Providers → Google → Client ID (o Supabase valida o token contra ele).
//   GOOGLE_IOS_CLIENT_ID = OAuth client tipo "iOS" (bundle id com.capifit.app).
const GOOGLE_WEB_CLIENT_ID = '901094200793-otpj6nt2fenbf666oq9v42fsv2rd8v4u.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '901094200793-hnrvd4v6qo0ma5fh40glce3qim5rulvu.apps.googleusercontent.com';

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (!GoogleSignin || googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
}

// ─── Abre a tela nativa de contas do Google e retorna o idToken ───────────────
// Sem navegador, sem passar pelo domínio do Supabase — mostra "Continuar com
// accounts.google.com" na folha nativa, igual outros apps fazem.
async function getGoogleIdToken() {
  if (!GoogleSignin) throw new Error('Login com Google indisponível neste ambiente — use um build EAS (dev/prod)');
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error('Google Sign-In não configurado (falta GOOGLE_WEB_CLIENT_ID).');
  ensureGoogleConfigured();

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = await GoogleSignin.signIn();
  if (result.type === 'cancelled') {
    const e = new Error('Login cancelado.');
    e.userCancelled = true;
    throw e;
  }

  const idToken = result.data?.idToken;
  if (!idToken) throw new Error('O Google não retornou um token válido.');
  return idToken;
}

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

// ─── Erro "essa conta Google/Apple já pertence a outro usuário CapiFit" ───────
// linkIdentity mantém o mesmo auth_id (e por tabela, todo o progresso do
// usuário) — só falha com esse código quando a identidade já está presa a
// OUTRO usuário, caso em que não tentamos mesclar dados automaticamente.
function mapLinkError(error) {
  if (!error) return error;
  if (error.code === 'identity_already_exists') {
    const e = new Error('Essa conta já está vinculada a outro perfil do CapiFit.');
    e.isConflict = true;
    return e;
  }
  return error;
}

// ─── Vincula uma conta Google à sessão atual (anônima ou não) ─────────────────
// SDK nativo (idToken) direto pro linkIdentity — sem navegador, sem depender
// do PKCE/flow_state do Supabase (que dava "invalid flow state" no fluxo OAuth).
export async function linkGoogleAccount() {
  const idToken = await getGoogleIdToken();
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', token: idToken });
  if (error) throw mapLinkError(error);
}

// ─── Sign in with Apple está disponível neste aparelho? ───────────────────────
export async function isAppleSignInAvailable() {
  if (Platform.OS !== 'ios') return false;
  try { return await AppleAuthentication.isAvailableAsync(); } catch { return false; }
}

// ─── Vincula uma conta Apple à sessão atual (anônima ou não) ──────────────────
// Usa o botão nativo (expo-apple-authentication) e passa o identityToken
// direto pro linkIdentity — sem navegador, sem trocar o auth_id do usuário.
export async function linkAppleAccount() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if (e.code === 'ERR_REQUEST_CANCELED') {
      const err = new Error('Login cancelado.');
      err.userCancelled = true;
      throw err;
    }
    throw e;
  }

  if (!credential.identityToken) throw new Error('A Apple não retornou um token válido.');

  const { error } = await supabase.auth.linkIdentity({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw mapLinkError(error);
}

// ─── Login com Google (sem sessão anônima prévia pra vincular) ────────────────
// Usado na tela "Já tenho conta" — diferente de linkGoogleAccount, aqui não há
// sessão ativa: entra na conta que já tem esse Google vinculado, ou cria uma
// nova se for a primeira vez que esse Google aparece.
export async function signInWithGoogle() {
  const idToken = await getGoogleIdToken();
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
  return data.user;
}

// ─── Login com Apple (sem sessão anônima prévia pra vincular) ─────────────────
export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if (e.code === 'ERR_REQUEST_CANCELED') {
      const err = new Error('Login cancelado.');
      err.userCancelled = true;
      throw err;
    }
    throw e;
  }

  if (!credential.identityToken) throw new Error('A Apple não retornou um token válido.');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  return data.user;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function signOut() {
  await supabase.auth.signOut();
}

// ─── Exclui a conta permanentemente (exigido pela Apple, guideline 5.1.1(v)) ──
// Chama a Edge Function `delete-account`, que apaga o usuário em auth.users —
// todas as tabelas relacionadas caem em cascata (ver migrations).
export async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente antes de excluir sua conta.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Não foi possível excluir sua conta agora.');
  }
}

// ─── Ouve mudanças de autenticação ────────────────────────────────────────────
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session?.user ?? null)
  );
  return () => subscription.unsubscribe();
}
