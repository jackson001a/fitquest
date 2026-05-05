import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const WorkoutsStack = createStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </HomeStack.Navigator>
  );
}

function WorkoutsStackNavigator() {
  return (
    <WorkoutsStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutsStack.Screen name="WorkoutsMain" component={WorkoutsScreen} />
      <WorkoutsStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </WorkoutsStack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'Home',         icon: 'home',    label: 'Início'    },
    { name: 'Workouts',     icon: 'barbell', label: 'Treinos'   },
    { name: 'Leaderboard',  icon: 'trophy',  label: 'Ranking'   },
    { name: 'Achievements', icon: 'medal',   label: 'Conquistas'},
    { name: 'Profile',      icon: 'person',  label: 'Perfil'    },
  ];

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = tabs[index];

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
          >
            {isFocused && <View style={styles.tabIndicator} />}
            <Ionicons
              name={isFocused ? tab.icon : `${tab.icon}-outline`}
              size={22}
              color={isFocused ? COLORS.purple : COLORS.grayDark}
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

export default function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"         component={HomeStackNavigator}    />
      <Tab.Screen name="Workouts"     component={WorkoutsStackNavigator} />
      <Tab.Screen name="Leaderboard"  component={LeaderboardScreen}      />
      <Tab.Screen name="Achievements" component={AchievementsScreen}     />
      <Tab.Screen name="Profile"      component={ProfileScreen}          />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#12122A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A4A',
    paddingBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: -10,
    width: 32,
    height: 3,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#8B5CF6',
  },
});
