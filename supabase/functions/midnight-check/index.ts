// ═══════════════════════════════════════════════════════════════════════════
// CapiFit — Edge Function: midnight-check
// Roda todo dia às 03:00 UTC (= meia-noite em Brasília, UTC-3)
//
// Como agendar no Supabase:
//   Dashboard → Edge Functions → midnight-check → Schedule
//   Cron: "0 3 * * *"
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service role para bypassar RLS
);

// ─── Envia push via Expo Push API ─────────────────────────────────────────────
async function sendExpoPush(token: string, title: string, body: string, data = {}) {
  if (!token || !token.startsWith('ExponentPushToken')) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDayId(date: Date): string {
  return ['dom','seg','ter','qua','qui','sex','sab'][date.getDay()];
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async () => {
  const now       = new Date();
  const today     = toDateString(now);
  const yesterday = toDateString(new Date(now.getTime() - 86400000));
  const isMonday  = now.getDay() === 1;
  const mondayStr = toDateString(getMondayOf(now));

  // Busca todos os usuários ativos (onboarding concluído)
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, expo_push_token, planned_days, weekly_frequency, week_checkins_count, week_start_date, streak_count, commitment, last_gym_checkin_date, is_flame_active')
    .eq('onboarding_done', true);

  if (error) {
    console.error('Fetch users error:', error);
    return new Response('Error', { status: 500 });
  }

  const COMMITMENT_MISSED  = -15;
  const COMMITMENT_BONUS   =  +5;
  const COMMITMENT_MAX     = 100;
  const COMMITMENT_MIN     =   0;
  const clamp = (v: number) => Math.max(COMMITMENT_MIN, Math.min(COMMITMENT_MAX, v));

  let processed = 0;

  for (const user of users ?? []) {
    const updates: Record<string, unknown> = {};
    const dayId = getDayId(now);
    const isNewWeek = isMonday && user.week_start_date !== mondayStr;

    // ── 1. Reset semanal (toda segunda-feira) ────────────────────────────────
    if (isNewWeek) {
      const metGoal = (user.week_checkins_count ?? 0) >= (user.weekly_frequency ?? 1);

      updates.week_checkins_count  = 0;
      updates.week_start_date      = mondayStr;
      updates.week_training_days   = [false,false,false,false,false,false,false];
      updates.week_workouts        = 0;
      updates.today_xp             = 0;

      if (metGoal) {
        // Cumpriu → bônus de comprometimento
        updates.commitment = clamp((user.commitment ?? 70) + COMMITMENT_BONUS);

        await sendExpoPush(
          user.expo_push_token,
          '🏆 Meta semanal cumprida!',
          `Parabéns ${user.name}! Você cumpriu o plano da semana. Comprometimento +${COMMITMENT_BONUS} pontos!`,
          { type: 'weekly_goal_met' }
        );
      } else {
        // Não cumpriu → streak zera
        updates.streak_count = 0;

        await sendExpoPush(
          user.expo_push_token,
          '😔 Plano zerado',
          `${user.name}, você não cumpriu a meta da semana. Seu plano voltou a zero. Recomece hoje!`,
          { type: 'streak_reset' }
        );
      }
    }

    // ── 2. Foguinho — apaga à meia-noite se não bateu a meta semanal ─────────
    const weekCheckins = isNewWeek ? 0 : (user.week_checkins_count ?? 0);
    const weekFreq     = user.weekly_frequency ?? 1;
    const metGoalAlready = weekCheckins >= weekFreq;
    const didCheckinYesterday = user.last_gym_checkin_date === yesterday;

    let newFlameActive = user.is_flame_active;

    if (!metGoalAlready) {
      // Ainda não bateu a meta → foguinho apaga à meia-noite
      newFlameActive = false;
      updates.is_flame_active = false;

      await sendExpoPush(
        user.expo_push_token,
        '🔥 Seu foguinho apagou!',
        `${user.name}, faça check-in hoje para reacender o plano!`,
        { type: 'flame_out' }
      );
    }

    // ── 3. Comprometimento por dia prometido perdido (ontem) ──────────────────
    const plannedDays: string[] = user.planned_days ?? [];
    const dayIdYesterday = getDayId(new Date(now.getTime() - 86400000));
    const wasPlanned = plannedDays.includes(dayIdYesterday);

    if (wasPlanned && !didCheckinYesterday) {
      const dayLabels: Record<string, string> = {
        seg:'segunda', ter:'terça', qua:'quarta',
        qui:'quinta',  sex:'sexta', sab:'sábado', dom:'domingo',
      };
      const currentCommitment = (updates.commitment as number) ?? (user.commitment ?? 70);
      updates.commitment = clamp(currentCommitment + COMMITMENT_MISSED);

      await sendExpoPush(
        user.expo_push_token,
        '📉 Comprometimento caiu',
        `${user.name}, você não treinou ${dayLabels[dayIdYesterday]} como havia planejado. Comprometimento: ${updates.commitment}/100.`,
        { type: 'commitment_drop' }
      );
    }

    // ── 4. Alerta de risco de streak ──────────────────────────────────────────
    const dayOfWeek    = now.getDay(); // 0=Dom
    const daysLeftWeek = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const checkinsLeft = Math.max(0, weekFreq - weekCheckins);

    if (!metGoalAlready && checkinsLeft > 0 && daysLeftWeek <= checkinsLeft && !isNewWeek) {
      await sendExpoPush(
        user.expo_push_token,
        '⚠️ Plano em risco!',
        `${user.name}, faltam ${daysLeftWeek} dias e você precisa de ${checkinsLeft} check-in${checkinsLeft > 1 ? 's' : ''} para não zerar!`,
        { type: 'streak_risk' }
      );
    }

    // ── 5. Aplica todas as atualizações se houver ─────────────────────────────
    if (Object.keys(updates).length > 0) {
      await supabase.from('users').update(updates).eq('id', user.id);
    }

    processed++;
  }

  return new Response(
    JSON.stringify({ ok: true, processed, timestamp: now.toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
