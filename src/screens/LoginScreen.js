import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { EnvelopeSimpleIcon, GoogleLogoIcon, LockSimpleIcon, XIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { supabase } from '../services/supabase';
import { resendEmailConfirmation, isAppleSignInAvailable } from '../services/authService';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { loginWithEmail, loginWithGoogle, loginWithApple } = useUser();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [providerLoading, setProviderLoading] = useState(null); // null | 'google' | 'apple'
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Preencha os campos', 'Informe email e senha para entrar.');
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (e) {
      const msg = e?.message ?? '';
      if (/network.*request.*failed/i.test(msg)) {
        Alert.alert('Falha de conexão', 'Não foi possível conectar agora. Verifique sua internet e tente novamente.');
      } else if (/email.*not.*confirmed/i.test(msg)) {
        Alert.alert(
          'Email ainda não confirmado',
          'Você criou esse login mas ainda não clicou no link de confirmação que enviamos. Verifique sua caixa de entrada (e o spam), ou toque em "Reenviar" abaixo.',
          [
            { text: 'Fechar', style: 'cancel' },
            {
              text: 'Reenviar email',
              onPress: async () => {
                try {
                  await resendEmailConfirmation(email.trim());
                  Alert.alert('Email reenviado', 'Verifique sua caixa de entrada.');
                } catch (_) {
                  Alert.alert('Erro', 'Não foi possível reenviar agora.');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Não foi possível entrar', 'Confira seu email e senha e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Digite seu email', 'Informe o email da sua conta para receber o link de redefinição.');
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      Alert.alert('Email enviado', 'Verifique sua caixa de entrada para redefinir sua senha.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar o email de redefinição.');
    }
  };

  const handleGoogle = async () => {
    if (providerLoading) return;
    setProviderLoading('google');
    try {
      await loginWithGoogle();
    } catch (e) {
      if (!e?.userCancelled) Alert.alert('Não foi possível entrar', e?.message || 'Tente novamente em instantes.');
    } finally {
      setProviderLoading(null);
    }
  };

  const handleApple = async () => {
    if (providerLoading) return;
    setProviderLoading('apple');
    try {
      await loginWithApple();
    } catch (e) {
      if (!e?.userCancelled) Alert.alert('Não foi possível entrar', e?.message || 'Tente novamente em instantes.');
    } finally {
      setProviderLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ width: 38 }} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <XIcon size={18} color={COLORS.gray} weight="bold" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>🔥</Text>
          </LinearGradient>
          <Text style={styles.title}>Bem-vindo de volta</Text>
          <Text style={styles.subtitle}>Entre pra continuar sua sequência e todo o seu progresso</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity activeOpacity={0.88} onPress={handleGoogle} disabled={!!providerLoading} style={styles.googleBtn}>
            {providerLoading === 'google'
              ? <ActivityIndicator color="#1F1F1F" />
              : (
                <>
                  <GoogleLogoIcon size={20} color="#1F1F1F" weight="bold" />
                  <Text style={styles.googleBtnText}>Continuar com Google</Text>
                </>
              )}
          </TouchableOpacity>

          {appleAvailable && (
            providerLoading === 'apple' ? (
              <View style={[styles.googleBtn, { backgroundColor: '#000' }]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={25}
                style={{ width: '100%', height: 50 }}
                onPress={handleApple}
              />
            )
          )}
        </View>

        {!showEmailForm ? (
          <TouchableOpacity onPress={() => setShowEmailForm(true)} style={styles.emailToggle} activeOpacity={0.8}>
            <EnvelopeSimpleIcon size={16} color={COLORS.gray} weight="regular" />
            <Text style={styles.emailToggleText}>Continuar com email</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emailForm}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>email e senha</Text>
              <View style={styles.dividerLine} />
            </View>

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
                placeholder="Sua senha"
                placeholderTextColor={COLORS.grayDark}
                secureTextEntry
              />
            </View>

            <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.9} style={{ marginTop: 20 }}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.loginBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Entrar</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 4 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },

  hero: { alignItems: 'center', marginTop: 12, marginBottom: 28 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroEmoji: { fontSize: 30 },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: COLORS.gray, fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 19, paddingHorizontal: 16, fontWeight: '500' },

  buttons: { gap: 10 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: RADIUS.full, height: 50,
  },
  googleBtnText: { color: '#1F1F1F', fontSize: 15, fontWeight: '700' },

  emailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 12 },
  emailToggleText: { color: COLORS.gray, fontSize: 13.5, fontWeight: '700' },

  emailForm: { marginTop: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.grayDark, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 4 },
  input: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '600', paddingVertical: 12 },
  forgotText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  loginBtn: { borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
