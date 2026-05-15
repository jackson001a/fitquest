import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { savePushToken } from './userService';

// ─── Configuração de como as notificações aparecem quando o app está aberto ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// ─── Solicita permissão e registra o dispositivo ──────────────────────────────
export async function registerForPushNotifications(userId) {
  if (!Device.isDevice) return null; // simulador não suporta push

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android: canal obrigatório
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('capifit', {
      name:       'CapiFit',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (userId && token) {
    await savePushToken(userId, token);
  }

  return token;
}

// ─── Agenda notificação local para meia-noite ─────────────────────────────────
// Avisa que o foguinho vai apagar se não fizer check-in
export async function scheduleFlameNotification(weeklyFrequency, weekCheckinsCount) {
  await cancelFlameNotification();

  // Só agenda se ainda não bateu a meta semanal
  if (weekCheckinsCount >= weeklyFrequency) return;

  const remaining = weeklyFrequency - weekCheckinsCount;
  const body = remaining === 1
    ? '🔥 Falta 1 check-in para manter seu plano aceso esta semana!'
    : `🔥 Faltam ${remaining} check-ins para manter seu plano esta semana!`;

  // Dispara amanhã às 08:00 como lembrete matinal
  const trigger = new Date();
  trigger.setDate(trigger.getDate() + 1);
  trigger.setHours(8, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    identifier: 'flame_daily',
    content: {
      title: 'CapiFit — Não perca seu plano!',
      body,
      data:  { type: 'flame_warning' },
    },
    trigger,
  });
}

// ─── Cancela a notificação do foguinho ───────────────────────────────────────
export async function cancelFlameNotification() {
  await Notifications.cancelScheduledNotificationAsync('flame_daily').catch(() => {});
}

// ─── Notificação de comprometimento baixou ───────────────────────────────────
export async function sendCommitmentAlert(missedDay, newCommitment) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📉 Comprometimento caiu',
      body:  `Você faltou ${missedDay} como havia planejado. Comprometimento agora: ${newCommitment}/100.`,
      data:  { type: 'commitment_drop' },
    },
    trigger: null, // imediata (mostra ao abrir o app)
  });
}

// ─── Notificação de risco de streak ─────────────────────────────────────────
export async function sendStreakRiskAlert(daysLeft, checkinsNeeded) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Seu plano está em risco!',
      body:  `Faltam ${daysLeft} dias na semana e você ainda precisa de ${checkinsNeeded} check-in${checkinsNeeded > 1 ? 's' : ''} para não zerar.`,
      data:  { type: 'streak_risk' },
    },
    trigger: null,
  });
}

// ─── Ouve notificações recebidas (app aberto) ─────────────────────────────────
export function addNotificationListener(callback) {
  const sub = Notifications.addNotificationReceivedListener(callback);
  return () => sub.remove();
}

// ─── Ouve toque em notificações ──────────────────────────────────────────────
export function addNotificationResponseListener(callback) {
  const sub = Notifications.addNotificationResponseReceivedListener(callback);
  return () => sub.remove();
}
