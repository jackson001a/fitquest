import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Animated, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ShieldCheckIcon, GoogleLogoIcon } from 'phosphor-react-native';
import { COLORS, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { isAppleSignInAvailable } from '../services/authService';

// Convite pra vincular Google/Apple, mostrado uma única vez (orquestrado pelo
// CelebrationOverlay a partir da fila do UserContext) — logo depois do
// primeiro check-in, quando a pessoa já tem streak e progresso pra proteger.
// Dispensável a qualquer momento; nunca bloqueia o uso do app.
export default function LinkAccountModal({ visible, onDismiss }) {
  const { doLinkGoogle, doLinkApple, setForegroundChecksPaused } = useUser();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null); // null | 'google' | 'apple'
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale    = React.useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  useEffect(() => {
    if (!visible) { opacity.setValue(0); scale.setValue(0.92); return; }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  const handleConflict = () => {
    Alert.alert(
      'Conta já existe',
      'Essa conta já está vinculada a outro perfil do CapiFit. Continue usando este aparelho normalmente, ou entre com essa conta em Conta e Segurança (você perderá o progresso deste aparelho).',
      [{ text: 'Entendi', onPress: onDismiss }],
    );
  };

  const handleGoogle = async () => {
    if (loadingProvider) return;
    setLoadingProvider('google');
    // O navegador do OAuth manda o app pro background e de volta — sem pausar,
    // as checagens automáticas de foreground corriam com a troca do código
    // PKCE e podiam derrubar a sessão que autorizou o link, quebrando o
    // flow_state ("invalid flow state, no valid flow state found").
    setForegroundChecksPaused(true);
    try {
      await doLinkGoogle();
      onDismiss();
    } catch (e) {
      if (e?.userCancelled) { /* silêncio — usuário só fechou o navegador */ }
      else if (e?.isConflict) handleConflict();
      else Alert.alert('Não foi possível vincular', e?.message || 'Tente novamente em instantes.');
    } finally {
      setLoadingProvider(null);
      setForegroundChecksPaused(false);
    }
  };

  const handleApple = async () => {
    if (loadingProvider) return;
    setLoadingProvider('apple');
    setForegroundChecksPaused(true);
    try {
      await doLinkApple();
      onDismiss();
    } catch (e) {
      if (e?.userCancelled) { /* silêncio — usuário cancelou o prompt nativo */ }
      else if (e?.isConflict) handleConflict();
      else Alert.alert('Não foi possível vincular', e?.message || 'Tente novamente em instantes.');
    } finally {
      setLoadingProvider(null);
      setForegroundChecksPaused(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Animated.View style={{ opacity, transform: [{ scale }], width: '88%' }}>
          <LinearGradient colors={['#241B4A', '#160F30', '#0A0A18']} style={styles.card}>
            <View style={styles.iconWrap}>
              <ShieldCheckIcon size={30} color={COLORS.purpleLight} weight="fill" />
            </View>

            <Text style={styles.title}>Não perca seu progresso!</Text>
            <Text style={styles.subtitle}>
              Vincule sua conta pra proteger seu streak e histórico caso troque de celular ou reinstale o app.
            </Text>

            <View style={styles.buttons}>
              <TouchableOpacity activeOpacity={0.88} onPress={handleGoogle} disabled={!!loadingProvider} style={styles.googleBtn}>
                {loadingProvider === 'google'
                  ? <ActivityIndicator color="#1F1F1F" />
                  : (
                    <>
                      <GoogleLogoIcon size={20} color="#1F1F1F" weight="bold" />
                      <Text style={styles.googleBtnText}>Continuar com Google</Text>
                    </>
                  )}
              </TouchableOpacity>

              {appleAvailable && (
                loadingProvider === 'apple' ? (
                  <View style={[styles.appleBtn, styles.appleBtnLoading]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={25}
                    style={styles.appleBtn}
                    onPress={handleApple}
                  />
                )
              )}
            </View>

            <TouchableOpacity onPress={onDismiss} disabled={!!loadingProvider} style={styles.laterBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.laterText}>Agora não</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: RADIUS.xl, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { color: COLORS.white, fontSize: 20, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { color: COLORS.gray, fontSize: 13.5, lineHeight: 19, textAlign: 'center', marginTop: 10, marginBottom: 22, fontWeight: '500' },

  buttons: { width: '100%', gap: 10 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: RADIUS.full, height: 50,
  },
  googleBtnText: { color: '#1F1F1F', fontSize: 15, fontWeight: '700' },
  appleBtn: { width: '100%', height: 50 },
  appleBtnLoading: { backgroundColor: '#000', borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },

  laterBtn: { marginTop: 18 },
  laterText: { color: COLORS.grayDark, fontSize: 13, fontWeight: '700' },
});
