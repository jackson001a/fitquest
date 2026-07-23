import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftIcon, EnvelopeSimpleIcon, LockSimpleIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { supabase } from '../services/supabase';
import { resendEmailConfirmation } from '../services/authService';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { loginWithEmail } = useUser();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

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
      if (/email.*not.*confirmed/i.test(msg)) {
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color={COLORS.white} weight="regular" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entrar</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={{ paddingHorizontal: SPACING.lg, marginTop: 12 }}>
        <Text style={styles.label}>Email</Text>
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

        <Text style={styles.label}>Senha</Text>
        <View style={styles.inputWrap}>
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

        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.9} style={{ marginTop: 24 }}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.loginBtn}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Entrar</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  label: { color: COLORS.gray, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 4 },
  input: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '600', paddingVertical: 12 },
  forgotText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  loginBtn: { borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
