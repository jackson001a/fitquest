// ═══════════════════════════════════════════════════════════════════════════
// CapiFit — Edge Function: revenuecat-webhook
// Recebe eventos do RevenueCat e mantém `users.is_premium` sincronizado com o
// status real da assinatura na loja (a compra em si só ativa o Premium na hora
// da compra — cancelamento/expiração/estorno só chegam aqui, via webhook).
//
// Como configurar no RevenueCat:
//   Dashboard → Project Settings → Integrations → Webhooks → Add
//   URL: https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header: mesmo valor salvo no secret REVENUECAT_WEBHOOK_SECRET
//
// Como configurar o secret no Supabase:
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<valor-aleatorio-forte>
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service role para bypassar RLS
);

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
const ENTITLEMENT_ID = 'premium';

// Eventos que confirmam acesso Premium ativo
const ACTIVATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

// Eventos que confirmam que o Premium de fato acabou
const DEACTIVATE_EVENTS = new Set([
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED',
]);

// CANCELLATION só marca que o usuário desligou a renovação automática — o
// acesso continua válido até a data de expiração, que dispara EXPIRATION
// separadamente. BILLING_ISSUE entra em período de graça definido pela loja,
// tratado da mesma forma (só desativa quando a EXPIRATION chegar).

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (WEBHOOK_SECRET) {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader !== WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = body?.event;
  if (!event) {
    return new Response('Missing event', { status: 400 });
  }

  const { type, app_user_id: appUserId, entitlement_ids: entitlementIds, product_id: productId } = event;

  // Evento de teste disparado pelo botão "Send Test Event" do dashboard
  if (type === 'TEST') {
    return new Response(JSON.stringify({ ok: true, test: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const affectsPremium = Array.isArray(entitlementIds) && entitlementIds.includes(ENTITLEMENT_ID);

  if (!appUserId || !affectsPremium || (!ACTIVATE_EVENTS.has(type) && !DEACTIVATE_EVENTS.has(type))) {
    // Evento válido mas que não muda o status de Premium (ex: CANCELLATION, BILLING_ISSUE, TRANSFER)
    return new Response(JSON.stringify({ ok: true, ignored: true, type }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isActivating = ACTIVATE_EVENTS.has(type);
  const updates: Record<string, unknown> = { is_premium: isActivating };
  if (isActivating) {
    updates.premium_plan  = productId ?? null;
    updates.premium_since = new Date().toISOString();
  }

  // appUserId é o mesmo users.id passado em Purchases.configure({ appUserID })
  const { error, count } = await supabase
    .from('users')
    .update(updates, { count: 'exact' })
    .eq('id', appUserId);

  if (error) {
    console.error('[revenuecat-webhook] falha ao atualizar usuário:', error.message, '| app_user_id:', appUserId);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!count) {
    console.warn('[revenuecat-webhook] nenhum usuário encontrado para app_user_id:', appUserId);
  }

  return new Response(
    JSON.stringify({ ok: true, type, app_user_id: appUserId, is_premium: isActivating, matched: count ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
