import React, { useEffect, useRef } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { UserProvider, useUser } from './src/context/UserContext';
import { registerForPushNotifications, addNotificationResponseListener } from './src/services/notificationService';
import * as OneSignalService from './src/services/oneSignalService';
import { parseDeepLink } from './src/services/socialService';

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
  const { user, alerts, clearAlerts } = useUser();

  // Push token
  useEffect(() => {
    if (!user?.id) return;
    registerForPushNotifications(user.id).catch(() => {});
  }, [user?.id]);

  // OneSignal — identidade do usuário (login/logout) segue o mesmo ciclo do
  // usuário do Supabase, pra segmentar/enviar push pro usuário certo
  useEffect(() => {
    if (user?.id) OneSignalService.login(user.id);
    else OneSignalService.logout();
  }, [user?.id]);

  // OneSignal — inicialização + diálogo de verificação da integração (mostra
  // só quando o dispositivo recebe um subscription ID real do servidor; a
  // permissão de notificação só é pedida se o usuário tocar em "Got it")
  useEffect(() => {
    OneSignalService.initialize();
    const unsubscribe = OneSignalService.setupPushSubscriptionVerification(() => {
      Alert.alert(
        'Your OneSignal SDK integration is complete!',
        'You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.',
        [{ text: 'Got it', onPress: () => OneSignalService.requestPermission() }],
        { cancelable: false }
      );
    });
    return unsubscribe;
  }, []);

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

  // O popup de conquista desbloqueada é renderizado pelo CelebrationOverlay
  // (montado no AppNavigator), que orquestra ele junto com o de level up numa
  // fila única — não duplicar o render aqui.
  return null;
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
