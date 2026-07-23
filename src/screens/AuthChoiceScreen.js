import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { RocketIcon, SignInIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';

export default function AuthChoiceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { startNewAccount } = useUser();
  const [creating, setCreating] = useState(false);

  const handleNewAccount = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await startNewAccount();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar uma nova conta agora. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.logo}>CapiFit</Text>
        <Text style={styles.sub}>Você saiu da sua conta. Entre novamente ou comece do zero.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.9}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.primaryBtn}>
            <SignInIcon size={18} color="#fff" weight="fill" />
            <Text style={styles.primaryBtnText}>Já tenho conta</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNewAccount} disabled={creating} activeOpacity={0.8} style={styles.secondaryBtn}>
          {creating
            ? <ActivityIndicator color={COLORS.purpleLight} />
            : (
              <>
                <RocketIcon size={18} color={COLORS.purpleLight} weight="regular" />
                <Text style={styles.secondaryBtnText}>Criar nova conta</Text>
              </>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.lg, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: 60, gap: 8 },
  emoji: { fontSize: 56 },
  logo: { color: COLORS.purple, fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  sub: { color: COLORS.gray, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 4, paddingHorizontal: 12 },
  actions: { gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.lg, paddingVertical: 16 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.lg, paddingVertical: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  secondaryBtnText: { color: COLORS.purpleLight, fontSize: 15, fontWeight: '700' },
});
