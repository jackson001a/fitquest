import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { ArrowLeftIcon, CaretDownIcon, EnvelopeSimpleIcon, LifebuoyIcon, QuestionIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';

const FAQ = [
  {
    q: 'Como eu ganho XP?',
    a: 'Você ganha XP completando treinos, cumprindo desafios diários, fazendo check-in na academia e batendo recordes pessoais. O XP total define seu nível e sua liga no ranking.',
  },
  {
    q: 'Como funciona a sequência (streak)?',
    a: 'Sua sequência sobe a cada dia planejado em que você treina. Se você não cumprir a meta semanal de dias combinada no seu plano, a sequência é zerada na segunda-feira seguinte.',
  },
  {
    q: 'Posso mudar meu objetivo depois do onboarding?',
    a: 'Sim! Vá em Perfil → Configurações → Metas. Você pode trocar objetivo, peso desejado e dias de treino sem perder XP, conquistas ou histórico.',
  },
  {
    q: 'Por que preciso colocar o peso (kg) em cada série?',
    a: 'Registrar o peso usado garante que seus recordes pessoais e o histórico de cada treino fiquem corretos. Sem o peso, a série não pode ser marcada como concluída.',
  },
  {
    q: 'O treino lembra o peso que usei da última vez?',
    a: 'Sim. Ao repetir um treino, as séries já vêm pré-preenchidas com o kg e as reps da sua última execução — só ajuste se for treinar diferente dessa vez.',
  },
  {
    q: 'Como funcionam os recordes pessoais (PRs)?',
    a: 'Toda vez que você registra um peso maior que o seu recorde anterior em um exercício, o app te avisa na hora e salva o novo PR no seu perfil.',
  },
  {
    q: 'O que são Grupos e Rivais?',
    a: 'Grupos são squads onde vocês competem juntos por streak. Rivais são duelos 1x1, semanais ou mensais, comparando XP ou consistência com um amigo.',
  },
  {
    q: 'Perco meu progresso se desinstalar o app?',
    a: 'Se você tiver um login (email e senha) configurado em Conta e Segurança, não. Contas sem login (anônimas) ficam presas ao aparelho — crie um login para não correr esse risco.',
  },
  {
    q: 'Como ativo as notificações?',
    a: 'Vá em Perfil → Configurações → Notificações e toque para permitir. Usamos isso para avisar quando sua sequência está em risco.',
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.q}</Text>
        <CaretDownIcon
          size={16}
          color={COLORS.gray}
          weight="bold"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </View>
      {open && <Text style={styles.faqAnswer}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color={COLORS.white} weight="regular" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajuda</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}>
        <View style={styles.introRow}>
          <QuestionIcon size={17} color={COLORS.white} weight="fill" />
          <Text style={styles.introTitle}>Perguntas frequentes</Text>
        </View>

        {FAQ.map((item, i) => <FaqItem key={i} item={item} />)}

        <TouchableOpacity
          style={styles.contactCard}
          activeOpacity={0.85}
          onPress={() => Linking.openURL('mailto:jacksondeandradee@gmail.com?subject=Ajuda%20CapiFit')}
        >
          <View style={styles.contactIcon}>
            <LifebuoyIcon size={22} color={COLORS.purpleLight} weight="fill" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Ainda precisa de ajuda?</Text>
            <Text style={styles.contactSub}>Fale com o suporte por email</Text>
          </View>
          <EnvelopeSimpleIcon size={18} color={COLORS.grayDark} weight="regular" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  introRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  introTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  faqItem: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQuestion: { flex: 1, color: COLORS.white, fontSize: 14, fontWeight: '700' },
  faqAnswer: { color: COLORS.gray, fontSize: 13, lineHeight: 19, marginTop: 10 },

  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', marginTop: SPACING.md },
  contactIcon: { width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  contactTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  contactSub: { color: COLORS.gray, fontSize: 12, marginTop: 2 },
});
