// ═══════════════════════════════════════════════════════════════════════════
// CapiFit — Edge Function: delete-account
// Apaga permanentemente a conta do usuário autenticado (obrigatório pela
// App Store, guideline 5.1.1(v) — apps com criação de conta precisam permitir
// exclusão dentro do próprio app).
//
// Deleta auth.users com o client de service role — o restante das tabelas
// (public.users e tudo que referencia ela) já cai em cascata via
// ON DELETE CASCADE (ver supabase/migrations/001_schema.sql).
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Token ausente' }), { status: 401, headers: CORS });
  }

  // Valida o token do usuário chamador com o client "anon" — garante que só
  // é possível apagar a própria conta, nunca a de outra pessoa.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401, headers: CORS });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('[delete-account] falha ao apagar usuário:', deleteError.message, '| id:', user.id);
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: CORS });
});
