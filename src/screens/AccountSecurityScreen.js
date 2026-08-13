import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ArrowClockwiseIcon, ArrowLeftIcon, CheckCircleIcon, ClockIcon, EnvelopeSimpleIcon, GoogleLogoIcon, LockSimpleIcon, PhoneIcon, ShieldCheckIcon, SignOutIcon, TrashIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { getAuthIdentity, linkEmailToAnonymous, changePassword, resendEmailConfirmation, isAppleSignInAvailable } from '../services/authService';

export default function AccountSecurityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, doSignOut, doDeleteAccount, doLinkGoogle, doLinkApple, setForegroundChecksPaused } = useUser();
  const [identity, setIdentity] = useState(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState(null); // null | 'google' | 'apple'

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refreshIdentity = () => {
    return getAuthIdentity()
      .then(setIdentity)
      .catch(() => setIdentity({ email: null, isAnonymous: true, pendingEmail: null }));
  };

  useEffect(() => {
    // Pré-preenche com o email já informado no onboarding — evita digitar de novo
    if (user?.email) setEmail(user.email);
    refreshIdentity().finally(() => setLoadingIdentity(false));
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const hasLogin = identity && !identity.isAnonymous && identity.email;
  const isPending = identity && !hasLogin && identity.pendingEmail;

  const handleLinkConflict = () => {
    Alert.alert(
      'Conta já existe',
      'Essa conta já está vinculada a outro perfil do CapiFit. Pra usar os dados dela você precisaria entrar com ela, perdendo o progresso deste aparelho.',
    );
  };

  const handleLinkGoogle = async () => {
    if (linkingProvider) return;
    setLinkingProvider('google');
    // O navegador do OAuth manda o app pro background e de volta — sem pausar,
    // as checagens automáticas de foreground corriam com a troca do código
    // PKCE e podiam derrubar a sessão que autorizou o link, quebrando o
    // flow_state ("invalid flow state, no valid flow state found").
    setForegroundChecksPaused(true);
    try {
      await doLinkGoogle();
      await refreshIdentity();
    } catch (e) {
      if (e?.userCancelled) { /* silêncio */ }
      else if (e?.isConflict) handleLinkConflict();
      else Alert.alert('Não foi possível vincular', e?.message || 'Tente novamente em instantes.');
    } finally {
      setLinkingProvider(null);
      setForegroundChecksPaused(false);
    }
  };

  const handleLinkApple = async () => {
    if (linkingProvider) return;
    setLinkingProvider('apple');
    setForegroundChecksPaused(true);
    try {
      await doLinkApple();
      await refreshIdentity();
    } catch (e) {
      if (e?.userCancelled) { /* silêncio */ }
      else if (e?.isConflict) handleLinkConflict();
      else Alert.alert('Não foi possível vincular', e?.message || 'Tente novamente em instantes.');
    } finally {
      setLinkingProvider(null);
      setForegroundChecksPaused(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email inválido', 'Digite um email válido.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Senha curta', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Senhas diferentes', 'A confirmação precisa ser igual à senha.');
      return;
    }
    setSaving(true);
    try {
      await linkEmailToAnonymous(email.trim(), password);
      await refreshIdentity();
      setPassword('');
      setConfirm('');
      Alert.alert('Conta criada com sucesso! ✅');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível criar seu login agora.');
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (!identity?.pendingEmail) return;
    setResending(true);
    try {
      await resendEmailConfirmation(identity.pendingEmail);
      Alert.alert('Email reenviado', 'Verifique sua caixa de entrada (e o spam) novamente.');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível reenviar agora.');
    } finally {
      setResending(false);
    }
  };

  const handleChangePassword = async () => {
    if (password.length < 6) {
      Alert.alert('Senha curta', 'A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Senhas diferentes', 'A confirmação precisa ser igual à nova senha.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(password);
      setPassword('');
      setConfirm('');
      Alert.alert('Senha alterada! ✅', 'Sua senha foi atualizada com sucesso.');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível alterar sua senha agora.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sair da conta',
      hasLogin
        ? 'Você poderá entrar novamente com seu login ou criar uma nova conta. Nada do seu progresso é apagado.'
        : 'Sua conta ainda é anônima (sem Google, Apple ou email vinculado) — se sair agora, não tem como entrar de novo nela, e o progresso deste aparelho fica pra trás.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try { await doSignOut(); } finally { setSigningOut(false); }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir conta',
      'Isso vai apagar permanentemente seu perfil, streak, conquistas e histórico de treinos. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Tem certeza?',
              'Sua conta e todos os seus dados serão excluídos agora, de forma definitiva.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Excluir permanentemente',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await doDeleteAccount();
                    } catch (e) {
                      Alert.alert('Erro', e.message || 'Não foi possível excluir sua conta agora.');
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color={COLORS.white} weight="regular" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conta e Segurança</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {loadingIdentity ? (
          <ActivityIndicator color={COLORS.purpleLight} style={{ marginTop: 40 }} />
        ) : hasLogin ? (
          <>
            <View style={styles.statusCard}>
              <CheckCircleIcon size={20} color={COLORS.green} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Login ativo</Text>
                <Text style={styles.statusSub}>{identity.email}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Alterar senha</Text>
            <View style={styles.inputWrap}>
              <LockSimpleIcon size={18} color={COLORS.gray} weight="regular" />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Nova senha"
                placeholderTextColor={COLORS.grayDark}
                secureTextEntry
              />
            </View>
            <View style={[styles.inputWrap, { marginTop: 10 }]}>
              <LockSimpleIcon size={18} color={COLORS.gray} weight="regular" />
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirmar nova senha"
                placeholderTextColor={COLORS.grayDark}
                secureTextEntry
              />
            </View>

            <TouchableOpacity onPress={handleChangePassword} disabled={saving} activeOpacity={0.9} style={{ marginTop: 20 }}>
              <LinearGradient colors={['#A855F7', '#7E22CE']} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar nova senha</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : isPending ? (
          <>
            <View style={[styles.statusCard, { borderColor: 'rgba(251, 191, 36,0.35)' }]}>
              <ClockIcon size={20} color={COLORS.gold} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Confirmação pendente</Text>
                <Text style={styles.statusSub}>
                  Enviamos um link de confirmação para {identity.pendingEmail}. Clique nele para ativar seu login — depois disso você já consegue entrar com email e senha.
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.85} style={styles.outlineBtn}>
              {resending
                ? <ActivityIndicator color={COLORS.purpleLight} />
                : (
                  <>
                    <EnvelopeSimpleIcon size={16} color={COLORS.purpleLight} weight="regular" />
                    <Text style={styles.outlineBtnText}>Reenviar email de confirmação</Text>
                  </>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setLoadingIdentity(true); refreshIdentity().finally(() => setLoadingIdentity(false)); }} activeOpacity={0.85} style={[styles.outlineBtn, { marginTop: 10 }]}>
              <ArrowClockwiseIcon size={16} color={COLORS.gray} weight="regular" />
              <Text style={[styles.outlineBtnText, { color: COLORS.gray }]}>Já confirmei — atualizar status</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.statusCard}>
              <ShieldCheckIcon size={20} color={COLORS.gold} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Você ainda não tem login</Text>
                <Text style={styles.statusSub}>Sua conta é anônima. Vincule com Google, Apple ou email e senha para não perder seu progresso se trocar de aparelho.</Text>
              </View>
            </View>

            {user?.phone ? (
              <View style={styles.contactRow}>
                <PhoneIcon size={14} color={COLORS.grayDark} weight="regular" />
                <Text style={styles.contactText}>Telefone do cadastro: {user.phone}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Vincular conta</Text>
            <View style={{ gap: 10, marginBottom: SPACING.lg }}>
              <TouchableOpacity activeOpacity={0.88} onPress={handleLinkGoogle} disabled={!!linkingProvider} style={styles.googleBtn}>
                {linkingProvider === 'google'
                  ? <ActivityIndicator color="#1F1F1F" />
                  : (
                    <>
                      <GoogleLogoIcon size={20} color="#1F1F1F" weight="bold" />
                      <Text style={styles.googleBtnText}>Continuar com Google</Text>
                    </>
                  )}
              </TouchableOpacity>

              {appleAvailable && (
                linkingProvider === 'apple' ? (
                  <View style={[styles.googleBtn, { backgroundColor: '#000' }]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={25}
                    style={{ width: '100%', height: 50 }}
                    onPress={handleLinkApple}
                  />
                )
              )}
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.sectionTitle}>Criar login</Text>
            <View style={styles.inputWrap}>
              <EnvelopeSimpleIcon size={18} color={COLORS.gray} weight="regular" />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={COLORS.grayDark}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.inputWrap, { marginTop: 10 }]}>
              <LockSimpleIcon size={18} color={COLORS.gray} weight="regular" />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Crie uma senha"
                placeholderTextColor={COLORS.grayDark}
                secureTextEntry
              />
            </View>
            <View style={[styles.inputWrap, { marginTop: 10 }]}>
              <LockSimpleIcon size={18} color={COLORS.gray} weight="regular" />
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirme a senha"
                placeholderTextColor={COLORS.grayDark}
                secureTextEntry
              />
            </View>

            <TouchableOpacity onPress={handleCreateLogin} disabled={saving} activeOpacity={0.9} style={{ marginTop: 20 }}>
              <LinearGradient colors={['#A855F7', '#7E22CE']} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Criar login e senha</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={handleSignOut} disabled={signingOut} activeOpacity={0.85} style={styles.signOutBtn}>
          {signingOut
            ? <ActivityIndicator color={COLORS.gray} />
            : (
              <>
                <SignOutIcon size={16} color={COLORS.gray} weight="regular" />
                <Text style={styles.signOutBtnText}>Sair da conta</Text>
              </>
            )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.85} style={styles.deleteBtn}>
          {deleting
            ? <ActivityIndicator color={COLORS.red} />
            : (
              <>
                <TrashIcon size={16} color={COLORS.red} weight="regular" />
                <Text style={styles.deleteBtnText}>Excluir conta permanentemente</Text>
              </>
            )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  statusCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  statusTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  statusSub: { color: COLORS.gray, fontSize: 12, marginTop: 3, lineHeight: 17 },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  contactText: { color: COLORS.grayDark, fontSize: 11, fontWeight: '600' },

  sectionTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800', marginBottom: 10 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: RADIUS.full, height: 50,
  },
  googleBtnText: { color: '#1F1F1F', fontSize: 15, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.grayDark, fontSize: 11, fontWeight: '700' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 4 },
  input: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '600', paddingVertical: 12 },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.lg, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(168, 85, 247,0.35)', backgroundColor: 'rgba(168, 85, 247,0.08)' },
  outlineBtnText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },

  saveBtn: { borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.xl, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  signOutBtnText: { color: COLORS.gray, fontSize: 13.5, fontWeight: '700' },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.md, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  deleteBtnText: { color: COLORS.red, fontSize: 13.5, fontWeight: '700' },
});
