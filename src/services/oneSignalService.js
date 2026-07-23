import { OneSignal, LogLevel } from 'react-native-onesignal';

// Módulo central que isola TODAS as chamadas diretas ao SDK do OneSignal —
// nenhuma outra parte do app deve importar `react-native-onesignal`.
const ONESIGNAL_APP_ID = '49b409c3-0097-4e38-ac5e-d7fd7f2091b3';

let initialized = false;

// ─── Inicialização ────────────────────────────────────────────────────────────
export function initialize() {
  if (initialized) return;
  initialized = true;
  OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.None);
  OneSignal.initialize(ONESIGNAL_APP_ID);
}

// ─── Identidade do usuário ────────────────────────────────────────────────────
export function login(externalId) {
  if (!externalId) return;
  OneSignal.login(String(externalId));
}

export function logout() {
  OneSignal.logout();
}

// ─── Email / SMS ──────────────────────────────────────────────────────────────
export function addEmail(email) {
  if (!email) return;
  OneSignal.User.addEmail(email);
}

export function removeEmail(email) {
  if (!email) return;
  OneSignal.User.removeEmail(email);
}

export function addSms(phoneNumber) {
  if (!phoneNumber) return;
  OneSignal.User.addSms(phoneNumber);
}

export function removeSms(phoneNumber) {
  if (!phoneNumber) return;
  OneSignal.User.removeSms(phoneNumber);
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
export function addTag(key, value) {
  if (!key) return;
  OneSignal.User.addTag(key, value);
}

export function addTags(tags) {
  if (!tags) return;
  OneSignal.User.addTags(tags);
}

export function removeTag(key) {
  if (!key) return;
  OneSignal.User.removeTag(key);
}

// ─── Permissão / push subscription ────────────────────────────────────────────
export function requestPermission() {
  return OneSignal.Notifications.requestPermission(true);
}

export function getPushSubscriptionId() {
  return OneSignal.User.pushSubscription.getIdAsync();
}

export function addPushSubscriptionListener(callback) {
  OneSignal.User.pushSubscription.addEventListener('change', callback);
  return () => OneSignal.User.pushSubscription.removeEventListener('change', callback);
}

// ─── Notificações ─────────────────────────────────────────────────────────────
export function addNotificationClickListener(callback) {
  OneSignal.Notifications.addEventListener('click', callback);
  return () => OneSignal.Notifications.removeEventListener('click', callback);
}

export function addForegroundWillDisplayListener(callback) {
  OneSignal.Notifications.addEventListener('foregroundWillDisplay', callback);
  return () => OneSignal.Notifications.removeEventListener('foregroundWillDisplay', callback);
}

// ─── Diálogo de verificação da integração ────────────────────────────────────
// Mostra 1x, assim que o dispositivo recebe um subscription ID real (atribuído
// pelo servidor do OneSignal) — o placeholder "local-..." não conta como
// registrado, é só o valor temporário usado antes do registro terminar.
let verificationCallbackFired = false;

function isRegistered(subscriptionId) {
  return !!subscriptionId && !subscriptionId.startsWith('local-');
}

export function setupPushSubscriptionVerification(onReady) {
  const notify = (subscriptionId) => {
    if (isRegistered(subscriptionId) && !verificationCallbackFired) {
      verificationCallbackFired = true;
      onReady?.();
    }
  };

  const unsubscribe = addPushSubscriptionListener((subscription) => {
    notify(subscription?.current?.id);
  });

  // O ID pode já estar atribuído antes do listener ser registrado — por isso
  // também avaliamos o valor atual imediatamente, sem depender só do evento.
  getPushSubscriptionId().then(notify).catch(() => {});

  return unsubscribe;
}
