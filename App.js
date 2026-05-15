import React, { useEffect, useRef } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { UserProvider, useUser } from './src/context/UserContext';
import { registerForPushNotifications, addNotificationResponseListener } from './src/services/notificationService';
import AchievementUnlockModal from './src/components/AchievementUnlockModal';
import { parseDeepLink } from './src/services/socialService';

export const navigationRef = createNavigationContainerRef();

// ─── Lida com deep links (capifit://...) ─────────────────────────────────────
function handleDeepLink(url) {
  if (!url) return;
  const { path, queryParams } = parseDeepLink(url);

  if (path === 'adicionar' && queryParams?.code) {
    // Abrir tela de amigos com código pré-preenchido
    if (navigationRef.isReady()) {
      navigationRef.navigate('Friends', { addCode: queryParams.code });
    }
  } else if (path === 'entrar-squad' && queryParams?.code) {
    // Abrir tela de criar/entrar squad com código
    if (navigationRef.isReady()) {
      navigationRef.navigate('JoinClan', { inviteCode: queryParams.code });
    }
  }
}

// ─── Componente interno que inicializa notificações e deep links ──────────────
function AppInit() {
  const { user, alerts, clearAlerts, newAchievements, dismissAchievement } = useUser();

  // Push token
  useEffect(() => {
    if (!user?.id) return;
    registerForPushNotifications(user.id).catch(() => {});
  }, [user?.id]);

  // Alertas de comprometimento (não streak_risk — vai inline no card)
  useEffect(() => {
    if (!alerts?.length) return;
    const important = alerts.filter(a => a.type !== 'streak_risk');
    if (!important.length) { clearAlerts(); return; }

    const timeout = setTimeout(() => {
      const messages = important.map(a => a.message).join('\n\n');
      Alert.alert('CapiFit', messages, [{ text: 'Entendido', onPress: clearAlerts }]);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [alerts, clearAlerts]);

  // Deep links (app já aberto)
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // Toque em notificação push
  useEffect(() => {
    const unsub = addNotificationResponseListener(response => {
      const { type } = response.notification.request.content.data ?? {};
      if (type === 'friend_request') navigationRef.navigate?.('Friends', {});
    });
    return unsub;
  }, []);

  return (
    <AchievementUnlockModal
      achievement={newAchievements[0] ?? null}
      onDismiss={dismissAchievement}
    />
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const linking = {
    prefixes: [Linking.createURL('/'), 'capifit://'],
    config: {
      screens: {
        Main: {
          screens: {
            Profile: 'perfil',
            Leaderboard: 'ranking',
          },
        },
        Friends:  'adicionar',
        JoinClan: 'entrar-squad',
      },
    },
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <UserProvider>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <StatusBar style="light" backgroundColor="transparent" translucent />
            <AppInit />
            <AppNavigator />
          </NavigationContainer>
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
