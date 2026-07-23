import { Platform } from 'react-native';

// react-native-purchases exige um dev build (EAS) — não existe no Expo Go.
// O require fica protegido para o app continuar funcionando em dev sem o módulo nativo.
let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  Purchases = null;
}

export const ENTITLEMENT_ID = 'premium';

// Preencher com as chaves públicas do RevenueCat (Project Settings → API keys)
const REVENUECAT_API_KEYS = {
  ios:     'appl_fhQDmmaLKPyuwrbMtrEIhxwxKsy',
  android: null,
};

let configured = false;

export function isPurchasesAvailable() {
  return !!Purchases;
}

export async function initPurchases(userId) {
  if (!Purchases) return;
  if (configured) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
  if (!apiKey) {
    console.warn('[purchaseService] chave do RevenueCat não configurada');
    return;
  }

  await Purchases.configure({ apiKey, appUserID: userId });
  configured = true;
}

// Offering atual configurada no dashboard do RevenueCat — traz os pacotes reais
// ($rc_monthly, $rc_annual, ...) com preço/duração vindos direto da App Store / Play Store
export async function getOfferings() {
  if (!Purchases) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

// Busca uma offering específica pelo identifier (ex: "exit_offer"), fora da
// offering "current" — usada pra ofertas pontuais como a de saída do paywall
export async function getOfferingByIdentifier(identifier) {
  if (!Purchases) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.all?.[identifier] ?? null;
}

function hasEntitlement(customerInfo) {
  return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
}

export async function purchasePackage(pkg) {
  if (!Purchases) throw new Error('Compras indisponíveis neste ambiente — use um build EAS (dev/prod)');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return hasEntitlement(customerInfo);
}

export async function restorePurchases() {
  if (!Purchases) throw new Error('Compras indisponíveis neste ambiente — use um build EAS (dev/prod)');
  const customerInfo = await Purchases.restorePurchases();
  return hasEntitlement(customerInfo);
}

export async function getCustomerInfo() {
  if (!Purchases) return null;
  return Purchases.getCustomerInfo();
}
