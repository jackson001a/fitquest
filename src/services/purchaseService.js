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

  // O SDK marca "Purchase was cancelled" e "LogOut was called but the current
  // user is anonymous" como nível ERROR (setLogLevel(ERROR) não filtra isso,
  // já é o nível mais restrito que existe) — mas ambos são esperados e já
  // tratados no JS (`error.userCancelled`, `PURCHASES_ERROR_CODE.LOG_OUT_
  // ANONYMOUS_USER_ERROR`). Um log handler customizado filtra só essas duas
  // mensagens conhecidas, sem silenciar erros de verdade.
  Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
  Purchases.setLogHandler((logLevel, message) => {
    if (/purchase was cancelled/i.test(message) || /current user is anonymous/i.test(message)) return;
    console.warn(`[RevenueCat/${logLevel}]`, message);
  });

  await Purchases.configure({ apiKey, appUserID: userId });
  configured = true;
}

// ─── Troca o usuário do RevenueCat pra outro appUserID na mesma sessão do app ──
// Precisa disso sempre que a pessoa faz login/logout sem reiniciar o app (ex:
// sai da conta e entra em outra) — configure() só roda uma vez; sem chamar
// logIn() explicitamente aqui, o RevenueCat continuaria preso no primeiro
// usuário configurado, atribuindo compras/entitlements à conta errada.
export async function switchPurchaseUser(userId) {
  if (!Purchases || !userId) return;
  if (!configured) {
    await initPurchases(userId);
    return;
  }
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('[purchaseService] logIn falhou:', e.message);
  }
}

// ─── Desfaz a identidade atual ao sair da conta — sem isso, entrar depois numa
// conta anônima nova ainda apareceria vinculado ao usuário anterior até o
// próximo switchPurchaseUser (que corrige, mas fica um instante inconsistente).
export async function resetPurchaseUser() {
  if (!Purchases || !configured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    // Esperado quando o usuário atual já é anônimo no RevenueCat (isAnonymous()
    // não é confiável o suficiente pra checar antes — o próprio SDK ainda
    // lançava esse erro mesmo depois de checar) — não é uma falha de verdade,
    // só não tinha identidade nenhuma pra desfazer.
    if (e?.code !== Purchases.PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR) {
      console.warn('[purchaseService] logOut falhou:', e.message);
    }
  }
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

// Checa se o Apple ID / Google atual já tem o entitlement ativo — usado logo
// no boot pra pular o paywall de gente que reinstalou o app ou está testando
// numa conta sandbox que já tinha assinatura, sem precisar tocar em nada.
export async function hasActiveEntitlement() {
  if (!Purchases) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return hasEntitlement(customerInfo);
  } catch (e) {
    console.warn('[purchaseService] falha ao checar entitlement:', e.message);
    return false;
  }
}
