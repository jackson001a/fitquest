import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { BarbellIcon, HouseIcon, MedalIcon, PersonIcon, TrophyIcon } from 'phosphor-react-native';
import { COLORS } from '../theme';
import { useUser } from '../context/UserContext';

import HomeScreen         from '../screens/HomeScreen';
import WorkoutsScreen     from '../screens/WorkoutsScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import LeaderboardScreen  from '../screens/LeaderboardScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import OnboardingScreen   from '../screens/OnboardingScreen';
import FriendsScreen           from '../screens/FriendsScreen';
import CreateClanScreen        from '../screens/CreateClanScreen';
import ExerciseDetailScreen    from '../screens/ExerciseDetailScreen';
import EditGoalScreen          from '../screens/EditGoalScreen';
import HelpScreen              from '../screens/HelpScreen';
import AccountSecurityScreen   from '../screens/AccountSecurityScreen';
import AuthChoiceScreen        from '../screens/AuthChoiceScreen';
import LoginScreen             from '../screens/LoginScreen';
import PaywallScreen           from '../screens/PaywallScreen';
import XPToast                 from '../components/XPToast';
import LevelUpModal             from '../components/LevelUpModal';

const Tab         = createBottomTabNavigator();
const HomeStack   = createStackNavigator();
const WorkoutsStack = createStackNavigator();
const RootStack   = createStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain"      component={HomeScreen} />
      <HomeStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </HomeStack.Navigator>
  );
}

function WorkoutsStackNavigator() {
  return (
    <WorkoutsStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutsStack.Screen name="WorkoutsMain"  component={WorkoutsScreen} />
      <WorkoutsStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </WorkoutsStack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'Home',         icon: HouseIcon,  label: 'Início'    },
    { name: 'Workouts',     icon: BarbellIcon, label: 'Treinos'   },
    { name: 'Leaderboard',  icon: TrophyIcon,  label: 'Ranking'   },
    { name: 'Achievements', icon: MedalIcon,   label: 'Conquistas'},
    { name: 'Profile',      icon: PersonIcon,  label: 'Perfil'    },
  ];

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = tabs[index];
        return (
          <TouchableOpacity key={route.key} style={styles.tabItem}
            onPress={() => navigation.navigate(route.name)} activeOpacity={0.7}>
            {isFocused && <View style={styles.tabIndicator} />}
            <tab.icon
              size={22}
              color={isFocused ? COLORS.purple : COLORS.grayDark}
              weight={isFocused ? 'fill' : 'regular'}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home"         component={HomeStackNavigator}     />
      <Tab.Screen name="Workouts"     component={WorkoutsStackNavigator} />
      <Tab.Screen name="Leaderboard"  component={LeaderboardScreen}      />
      <Tab.Screen name="Achievements" component={AchievementsScreen}     />
      <Tab.Screen name="Profile"      component={ProfileScreen}          />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { onboardingDone, loading, loggedOut, isPremium } = useUser();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A18', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 48 }}>🔥</Text>
        <Text style={{ color: '#8B5CF6', fontSize: 28, fontWeight: '900', marginTop: 12, letterSpacing: -1 }}>CapiFit</Text>
        <Text style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>Carregando seu plano...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {loggedOut ? (
          <>
            <RootStack.Screen name="AuthChoice" component={AuthChoiceScreen} options={{ animationEnabled: false }} />
            <RootStack.Screen name="Login"       component={LoginScreen}       options={{ animationEnabled: true, gestureEnabled: true }} />
          </>
        ) : onboardingDone ? (
          <>
            {!isPremium && <RootStack.Screen name="Paywall" component={PaywallScreen} options={{ animationEnabled: false, gestureEnabled: false }} />}
            <RootStack.Screen name="Main"       component={MainTabs}          options={{ animationEnabled: false }} />
            <RootStack.Screen name="Friends"        component={FriendsScreen}        options={{ animationEnabled: true, gestureEnabled: true }} />
            <RootStack.Screen name="CreateClan"    component={CreateClanScreen}     options={{ animationEnabled: true, gestureEnabled: true }} />
            <RootStack.Screen name="JoinClan"      component={CreateClanScreen}     options={{ animationEnabled: true, gestureEnabled: true }} />
            <RootStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ animationEnabled: true, gestureEnabled: true }} />
            <RootStack.Screen name="EditGoal"       component={EditGoalScreen}       options={{ animationEnabled: true, gestureEnabled: true }} />
            <RootStack.Screen name="Help"            component={HelpScreen}            options={{ animationEnabled: true, gestureEnabled: true }} />
            <RootStack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ animationEnabled: true, gestureEnabled: true }} />
          </>
        ) : (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} options={{ animationEnabled: false }} />
        )}
      </RootStack.Navigator>
      <XPToast />
      <LevelUpModal />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar:         { flexDirection: 'row', backgroundColor: '#12122A', borderTopWidth: 1, borderTopColor: '#2A2A4A', paddingBottom: 20, paddingTop: 10, paddingHorizontal: 8 },
  tabItem:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' },
  tabIndicator:   { position: 'absolute', top: -10, width: 32, height: 3, backgroundColor: '#8B5CF6', borderRadius: 2 },
  tabLabel:       { fontSize: 10, color: '#475569', fontWeight: '600' },
  tabLabelActive: { color: '#8B5CF6' },
});
