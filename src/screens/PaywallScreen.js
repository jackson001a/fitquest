import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BellIcon, CameraIcon, CheckCircleIcon, DropIcon, FireIcon, GiftIcon, LockOpenIcon,
  UsersThreeIcon, XIcon,
} from 'phosphor-react-native';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import {
  isPurchasesAvailable, initPurchases, getOfferings, getOfferingByIdentifier,
  purchasePackage, restorePurchases,
} from '../services/purchaseService';

const EXIT_OFFERING_ID = 'exit_offer';
const EXIT_PACKAGE_ID  = 'rc_annual';
const EXIT_PRICE_FALLBACK = 'R$ 99,00';

// Usados só como placeholder enquanto as ofertas reais do RevenueCat carregam,
// ou como fallback no Expo Go (onde o SDK nativo não existe).
const TRIAL_DAYS_FALLBACK  = 3;
const ANNUAL_PRICE_FALLBACK  = 'R$ 149,90/ano';
const MONTHLY_PRICE_FALLBACK = 'R$ 49,90/mês';

// $rc_monthly / $rc_annual não trazem o período no priceString — completamos pelo packageType
function periodSuffix(pkg) {
  switch (pkg?.packageType) {
    case 'MONTHLY': return '/mês';
    case 'ANNUAL':  return '/ano';
    case 'WEEKLY':   return '/sem';
    default:        return '';
  }
}

const MONTHS_PT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

function formatChargeDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatMoney(value, currencyCode) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode || 'BRL' }).format(value);
  } catch {
    return `${currencyCode ?? ''} ${Number(value).toFixed(2)}`;
  }
}

// Dias de teste grátis a partir do introPrice real do produto (só conta se for gratuito)
function getTrialDays(pkg) {
  const intro = pkg?.product?.introPrice;
  if (!intro || Number(intro.price) > 0) return 0;
  const n = intro.periodNumberOfUnits ?? 0;
  switch (intro.periodUnit) {
    case 'DAY':   return n;
    case 'WEEK':  return n * 7;
    case 'MONTH': return n * 30;
    case 'YEAR':  return n * 365;
    default:      return n;
  }
}

const MONTHLY_BENEFITS = [
  { Icon: CameraIcon,     text: 'Check-in na academia e sua sequência de fogo' },
  { Icon: DropIcon,       text: 'Desafios diários de água, treino e caminhada' },
  { Icon: UsersThreeIcon, text: 'Ranking, grupos e duelos com os amigos' },
];

export default function PaywallScreen({ navigation }) {
  const { user, activatePremium } = useUser();
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [offering, setOffering] = useState(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [variantHeight, setVariantHeight] = useState(0);
  const isAnnual = selectedPlan === 'annual';

  // ── Oferta de saída — mostrada quando o usuário tenta fechar o paywall sem assinar ──
  const [exitStage, setExitStage] = useState(null); // null | 'loading' | 'offer'
  const [exitOffering, setExitOffering] = useState(null);
  const [exitPurchasing, setExitPurchasing] = useState(false);

  // Busca a offering atual do RevenueCat (App Store Connect / Google Play já cadastrados lá)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isPurchasesAvailable()) {
        if (mounted) setLoadingOfferings(false);
        return;
      }
      try {
        await initPurchases(user?.id);
        const current = await getOfferings();
        if (mounted) setOffering(current);
      } catch (e) {
        console.warn('[Paywall] falha ao carregar ofertas do RevenueCat:', e.message);
      } finally {
        if (mounted) setLoadingOfferings(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const monthlyPkg = offering?.monthly ?? offering?.availablePackages?.find(p => p.identifier === '$rc_monthly') ?? null;
  const annualPkg  = offering?.annual  ?? offering?.availablePackages?.find(p => p.identifier === '$rc_annual')  ?? null;
  const selectedPackage = isAnnual ? annualPkg : monthlyPkg;

  const annualPriceRaw     = annualPkg?.product?.priceString  ?? 'R$ 149,90';
  const annualPriceString  = annualPkg?.product?.priceString  ? `${annualPkg.product.priceString}${periodSuffix(annualPkg)}`   : ANNUAL_PRICE_FALLBACK;
  const monthlyPriceString = monthlyPkg?.product?.priceString ? `${monthlyPkg.product.priceString}${periodSuffix(monthlyPkg)}` : MONTHLY_PRICE_FALLBACK;
  const annualMonthlyEquivalent = annualPkg?.product
    ? formatMoney(annualPkg.product.price / 12, annualPkg.product.currencyCode)
    : null;

  const trialDays = annualPkg ? getTrialDays(annualPkg) || TRIAL_DAYS_FALLBACK : TRIAL_DAYS_FALLBACK;
  const chargeDate = useMemo(() => formatChargeDate(trialDays), [trialDays]);

  // Medimos a altura real do anual (mais alto que o mensal) fora da tela e travamos
  // o bloco visível nesse tamanho — assim o card de planos e o botão nunca pulam de posição.
  const onMeasureAnnual = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    setVariantHeight(prev => (h > prev ? h : prev));
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      if (isPurchasesAvailable()) {
        if (!selectedPackage) {
          Alert.alert('Plano indisponível', 'Não conseguimos carregar esse plano agora. Tente novamente em instantes.');
          return;
        }
        const entitled = await purchasePackage(selectedPackage);
        if (!entitled) {
          Alert.alert('Compra não confirmada', 'Sua compra foi processada, mas não conseguimos confirmar o acesso Premium. Tente restaurar a compra ou fale com o suporte.');
          return;
        }
        await activatePremium(selectedPlan);
      } else {
        // Ambiente sem o módulo nativo (Expo Go) — ativa localmente só pra testar o fluxo
        await activatePremium(selectedPlan);
      }
    } catch (e) {
      if (!e?.userCancelled) {
        Alert.alert('Não foi possível concluir a assinatura', e?.message || 'Tente novamente em instantes.');
      }
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, selectedPackage, selectedPlan, activatePremium]);

  const handleRestore = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      if (isPurchasesAvailable()) {
        const restored = await restorePurchases();
        if (restored) {
          await activatePremium(selectedPlan);
          return;
        }
        Alert.alert('Nenhuma assinatura encontrada', 'Não localizamos uma assinatura ativa para essa conta.');
      } else {
        Alert.alert('Indisponível', 'A restauração de compras só funciona em um build da loja.');
      }
    } catch (e) {
      Alert.alert('Erro ao restaurar', e?.message || 'Tente novamente.');
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, selectedPlan, activatePremium]);

  // Sai do paywall de vez — só chega aqui se o usuário recusar a oferta de saída também
  const leavePaywall = useCallback(() => {
    navigation.navigate('Main');
  }, [navigation]);

  // X escondido no canto — em vez de fechar direto, tenta reter com a exit_offer
  const handleRequestClose = useCallback(async () => {
    if (exitStage === 'loading') return;
    setExitStage('loading');
    try {
      if (isPurchasesAvailable()) {
        const offer = await getOfferingByIdentifier(EXIT_OFFERING_ID);
        if (offer) {
          setExitOffering(offer);
          setExitStage('offer');
          return;
        }
      }
      // Sem SDK nativo (Expo Go) ou sem a offering configurada — não tem oferta pra mostrar
      setExitStage(null);
      leavePaywall();
    } catch (e) {
      console.warn('[Paywall] falha ao buscar exit_offer:', e.message);
      setExitStage(null);
      leavePaywall();
    }
  }, [exitStage, leavePaywall]);

  const exitPkg = exitOffering?.availablePackages?.find(p => p.identifier === EXIT_PACKAGE_ID)
    ?? exitOffering?.availablePackages?.[0]
    ?? null;
  const exitPriceString = exitPkg?.product?.priceString ?? EXIT_PRICE_FALLBACK;

  const handleAcceptExitOffer = useCallback(async () => {
    if (exitPurchasing) return;
    setExitPurchasing(true);
    try {
      if (isPurchasesAvailable() && exitPkg) {
        const entitled = await purchasePackage(exitPkg);
        if (!entitled) {
          Alert.alert('Compra não confirmada', 'Sua compra foi processada, mas não conseguimos confirmar o acesso Premium. Tente restaurar a compra ou fale com o suporte.');
          return;
        }
        await activatePremium('annual_offer');
      } else {
        // Ambiente sem o módulo nativo (Expo Go) — ativa localmente só pra testar o fluxo
        await activatePremium('annual_offer');
      }
    } catch (e) {
      if (!e?.userCancelled) {
        Alert.alert('Não foi possível concluir a assinatura', e?.message || 'Tente novamente em instantes.');
      }
    } finally {
      setExitPurchasing(false);
    }
  }, [exitPurchasing, exitPkg, activatePremium]);

  const AnnualContent = (
    <>
      <Text style={s.title}>Continue sua evolução{'\n'}com {trialDays} dias grátis</Text>
      <Text style={s.subtitle}>Mantenha seu streak, check-ins e desafios sempre em dia</Text>

      <View style={s.timelineWrap}>
        <View style={s.timelineLine} />

        <View style={s.timelineItem}>
          <View style={[s.timelineIcon, { backgroundColor: COLORS.orange }]}><LockOpenIcon size={17} color={COLORS.white} weight="bold" /></View>
          <View style={s.timelineContent}>
            <Text style={s.timelineTitle}>Hoje</Text>
            <Text style={s.timelineDesc}>Acesso completo aos check-ins, desafios diários e ranking com amigos</Text>
          </View>
        </View>

        <View style={s.timelineItem}>
          <View style={[s.timelineIcon, { backgroundColor: COLORS.orange }]}><BellIcon size={17} color={COLORS.white} weight="fill" /></View>
          <View style={s.timelineContent}>
            <Text style={s.timelineTitle}>Em 2 dias — um lembrete</Text>
            <Text style={s.timelineDesc}>A gente te avisa antes de qualquer cobrança</Text>
          </View>
        </View>

        <View style={s.timelineItem}>
          <View style={[s.timelineIcon, { backgroundColor: '#1E1E30', borderWidth: 2, borderColor: COLORS.orange }]}><FireIcon size={17} color={COLORS.orange} weight="fill" /></View>
          <View style={s.timelineContent}>
            <Text style={s.timelineTitle}>Em {trialDays} dias</Text>
            <Text style={s.timelineDesc}>Só cobramos {annualPriceRaw} em {chargeDate} se você continuar</Text>
          </View>
        </View>
      </View>

      <View style={s.trialBanner}>
        <GiftIcon size={18} color={COLORS.orange} weight="fill" />
        <Text style={s.trialBannerText}>
          <Text style={{ fontWeight: '800', color: COLORS.white }}>{trialDays} dias grátis</Text> no plano anual, depois {annualPriceString}. Cancele quando quiser, sem burocracia.
        </Text>
      </View>
    </>
  );

  const MonthlyContent = (
    <>
      <Text style={s.title}>Continue no{'\n'}CapiFit Premium</Text>
      <Text style={s.subtitle}>Tudo que te ajuda a manter a consistência</Text>

      <View style={s.benefitsCard}>
        {MONTHLY_BENEFITS.map((b, i) => (
          <View key={i} style={[s.benefitRow, i === MONTHLY_BENEFITS.length - 1 && { marginBottom: 0 }]}>
            <View style={s.benefitIconWrap}>
              <b.Icon size={18} color={COLORS.orange} weight="fill" />
            </View>
            <Text style={s.benefitText}>{b.text}</Text>
            <CheckCircleIcon size={18} color={COLORS.green} weight="fill" />
          </View>
        ))}
      </View>
    </>
  );

  // ── Oferta de saída — usuário tentou fechar o paywall sem assinar ──
  if (exitStage === 'offer') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <TouchableOpacity onPress={leavePaywall} style={s.hiddenClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
          <XIcon size={20} color="rgba(255,255,255,0.55)" weight="bold" />
        </TouchableOpacity>

        <ScrollView style={s.body} contentContainerStyle={s.bodyPad} showsVerticalScrollIndicator={false}>
          <View style={s.crownWrap}>
            <LinearGradient colors={['#F97316', '#EA9A4D']} style={s.crownCircle}>
              <GiftIcon size={30} color={COLORS.white} weight="fill" />
            </LinearGradient>
          </View>

          <Text style={s.title}>Espera! Oferta{'\n'}especial pra você</Text>
          <Text style={s.subtitle}>Só dessa vez: acesso Premium anual completo por um preço exclusivo</Text>

          <View style={s.exitOfferCard}>
            <View style={s.planBadge}><Text style={s.planBadgeText}>oferta exclusiva</Text></View>
            <Text style={s.exitOfferLabel}>Anual Promocional</Text>
            <Text style={s.exitOfferPrice}>{exitPriceString}</Text>
            <Text style={s.exitOfferSub}>por ano — acesso completo ao CapiFit</Text>
          </View>

          <View style={s.ctaWrap}>
            <TouchableOpacity activeOpacity={0.85} onPress={handleAcceptExitOffer} disabled={exitPurchasing} style={{ width: '100%' }}>
              <LinearGradient colors={['#F97316', '#EA9A4D']} style={s.ctaBtn}>
                {exitPurchasing
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={s.ctaText}>Quero essa oferta</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={leavePaywall} disabled={exitPurchasing} style={{ marginTop: 16 }}>
              <Text style={s.declineText}>Não, obrigado</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <TouchableOpacity
        onPress={handleRequestClose}
        style={s.hiddenClose}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        disabled={exitStage === 'loading'}
      >
        {exitStage === 'loading'
          ? <ActivityIndicator size="small" color="rgba(255,255,255,0.25)" />
          : <XIcon size={20} color="rgba(255,255,255,0.55)" weight="bold" />}
      </TouchableOpacity>

      <ScrollView style={s.body} contentContainerStyle={s.bodyPad} showsVerticalScrollIndicator={false}>

        <View style={s.crownWrap}>
          <LinearGradient colors={['#F97316', '#EA9A4D']} style={s.crownCircle}>
            <FireIcon size={30} color={COLORS.white} weight="fill" />
          </LinearGradient>
        </View>

        <View style={{ minHeight: variantHeight || undefined }}>
          {isAnnual ? AnnualContent : MonthlyContent}
        </View>

        {/* Medidor invisível — sempre renderiza o conteúdo anual (o mais alto) fora da
            tela pra travar a altura do bloco acima, mesmo quando o mensal está selecionado */}
        <View style={s.measureBox} pointerEvents="none" onLayout={onMeasureAnnual}>
          {AnnualContent}
        </View>

        <View style={s.plansRow}>
          <TouchableOpacity
            onPress={() => setSelectedPlan('monthly')}
            style={[s.planCard, !isAnnual && s.planCardActive]}
            activeOpacity={0.9}
          >
            <View style={[s.radio, !isAnnual && s.radioActive]}>{!isAnnual && <View style={s.radioDot} />}</View>
            <Text style={s.planLabel}>Mensal</Text>
            {loadingOfferings
              ? <ActivityIndicator size="small" color={COLORS.gray} style={{ marginTop: 4 }} />
              : <Text style={s.planPrice}>{monthlyPriceString}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedPlan('annual')}
            style={[s.planCard, isAnnual && s.planCardActive]}
            activeOpacity={0.9}
          >
            <View style={s.planBadge}><Text style={s.planBadgeText}>{trialDays} dias grátis</Text></View>
            <View style={[s.radio, isAnnual && s.radioActive]}>{isAnnual && <View style={s.radioDot} />}</View>
            <Text style={s.planLabel}>Anual</Text>
            {loadingOfferings
              ? <ActivityIndicator size="small" color={COLORS.gray} style={{ marginTop: 4 }} />
              : (
                <>
                  <Text style={s.planPrice}>{annualPriceString}</Text>
                  {annualMonthlyEquivalent && <Text style={s.planPriceSub}>equivale a {annualMonthlyEquivalent}/mês</Text>}
                </>
              )}
          </TouchableOpacity>
        </View>

        <View style={s.ctaWrap}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleSubscribe} disabled={purchasing || loadingOfferings} style={{ width: '100%' }}>
            <LinearGradient colors={['#F97316', '#EA9A4D']} style={s.ctaBtn}>
              {purchasing
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={s.ctaText}>{isAnnual ? `Começar com ${trialDays} dias grátis` : 'Assinar agora'}</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {isAnnual && (
            <View style={s.noChargeRow}>
              <CheckCircleIcon size={15} color={COLORS.green} weight="fill" />
              <Text style={s.noChargeText}>Sem pagamento agora</Text>
            </View>
          )}

          <Text style={s.disclaimer}>
            {isAnnual
              ? `A cobrança começa em ${chargeDate}, a menos que você cancele antes.`
              : 'A cobrança se renova mensalmente até você cancelar.'}
          </Text>
        </View>

        <View style={s.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://jackson001a.github.io/fitquest/termos.html')}>
            <Text style={s.footerLink}>Termos</Text>
          </TouchableOpacity>
          <Text style={s.footerDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://jackson001a.github.io/fitquest/privacidade.html')}>
            <Text style={s.footerLink}>Privacidade</Text>
          </TouchableOpacity>
          <Text style={s.footerDot}>·</Text>
          <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
            <Text style={s.footerLink}>Restaurar</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  body: { flex: 1 },
  bodyPad: { paddingHorizontal: SPACING.lg, paddingBottom: 16 },

  hiddenClose: {
    position: 'absolute', top: 24, right: 16, zIndex: 10,
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  exitOfferCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.orange,
    alignItems: 'center', padding: 24, paddingTop: 28, marginTop: 8, position: 'relative',
  },
  exitOfferLabel: { fontSize: 14, fontWeight: '700', color: COLORS.gray },
  exitOfferPrice: { fontSize: 36, fontWeight: '900', color: COLORS.white, marginTop: 6, letterSpacing: -1 },
  exitOfferSub:   { fontSize: 12.5, color: COLORS.gray, marginTop: 6, fontWeight: '600' },

  declineText: { fontSize: 13.5, color: COLORS.gray, fontWeight: '700', textAlign: 'center' },

  crownWrap:   { alignItems: 'center', marginTop: 4, marginBottom: 18 },
  crownCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },

  title:    { fontSize: 28, fontWeight: '900', color: COLORS.white, textAlign: 'center', letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 14, color: COLORS.gray, textAlign: 'center', fontWeight: '600', marginTop: 10, marginBottom: 22, paddingHorizontal: 12 },

  measureBox: { position: 'absolute', opacity: 0, left: 0, right: 0, top: -9999 },

  timelineWrap: { position: 'relative', marginBottom: 18 },
  timelineLine: { position: 'absolute', left: 17, top: 18, bottom: 22, width: 2, backgroundColor: COLORS.orange, opacity: 0.35 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 14 },
  timelineIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineContent: { flex: 1, paddingTop: 4 },
  timelineTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.white, marginBottom: 3 },
  timelineDesc: { fontSize: 12.5, color: COLORS.gray, lineHeight: 17 },

  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(249,115,22,0.1)',
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: RADIUS.lg, padding: 12, marginBottom: 4,
  },
  trialBannerText: { flex: 1, fontSize: 12.5, color: COLORS.gray, lineHeight: 17 },

  benefitsCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 16, marginBottom: 4 },
  benefitRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  benefitIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center' },
  benefitText:     { flex: 1, color: COLORS.white, fontSize: 13.5, fontWeight: '600' },

  plansRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  planCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border,
    padding: 16, position: 'relative', paddingTop: 20,
  },
  planCardActive: { borderColor: COLORS.orange, backgroundColor: 'rgba(249,115,22,0.07)' },
  planBadge: {
    position: 'absolute', top: -11, left: 14, backgroundColor: COLORS.orange,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  planBadgeText: { fontSize: 9.5, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  radio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.grayDark, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  radioActive: { borderColor: COLORS.orange },
  radioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.orange },
  planLabel:      { fontSize: 14, fontWeight: '700', color: COLORS.gray, marginBottom: 4 },
  planPrice:      { fontSize: 18, fontWeight: '800', color: COLORS.white },
  planPriceUnit:  { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  planPriceSub:   { fontSize: 10.5, color: COLORS.orange, fontWeight: '700', marginTop: 4 },

  ctaWrap: { marginTop: SPACING.lg, alignItems: 'center' },
  ctaBtn:  { width: '100%', borderRadius: RADIUS.full, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  noChargeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  noChargeText: { color: COLORS.green, fontSize: 13, fontWeight: '700' },

  disclaimer: { fontSize: 11.5, color: COLORS.grayDark, textAlign: 'center', marginTop: 10, lineHeight: 16, paddingHorizontal: SPACING.md },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 },
  footerLink:  { fontSize: 12, color: COLORS.grayDark, fontWeight: '600' },
  footerDot:   { color: COLORS.grayDark },
});
