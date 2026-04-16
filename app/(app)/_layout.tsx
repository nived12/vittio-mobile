import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import { colors, components } from '../../src/theme';

// ── FAB center button ──────────────────────────────────────────────────────

function FabIcon() {
  return (
    <View
      style={{
        width:           components.fab.size,
        height:          components.fab.size,
        borderRadius:    components.fab.borderRadius,
        backgroundColor: components.fab.backgroundColor,
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    components.fab.marginBottom,
        // iOS shadow
        shadowColor:     colors.fab.shadow,
        shadowOffset:    { width: 0, height: 4 },
        shadowOpacity:   0.35,
        shadowRadius:    8,
        // Android elevation
        elevation:       8,
      }}
    >
      <Feather name="plus" size={components.fab.iconSize} color={components.fab.iconColor} />
    </View>
  );
}

// ── Tab navigator ──────────────────────────────────────────────────────────

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:          false,
        tabBarActiveTintColor: components.tabBar.activeTint,
        tabBarInactiveTintColor: components.tabBar.inactiveTint,
        tabBarStyle: {
          backgroundColor: components.tabBar.backgroundColor,
          borderTopWidth:  components.tabBar.borderTopWidth,
          borderTopColor:  components.tabBar.borderTopColor,
          height:          components.tabBar.totalHeight,
          paddingTop:      8,
          paddingBottom:   34, // safe area — will be overridden by useSafeAreaInsets in a real impl
        },
        tabBarLabelStyle: {
          fontFamily: components.tabBar.labelFontFamily,
          fontSize:   components.tabBar.labelFontSize,
          marginTop:  2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={components.tabBar.iconSize} color={color} />
          ),
          tabBarAccessibilityLabel: 'Home tab',
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={components.tabBar.iconSize} color={color} />
          ),
          tabBarAccessibilityLabel: 'Transactions tab',
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />

      {/* Center FAB — tab press is intercepted to open a modal */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: () => <FabIcon />,
          tabBarAccessibilityLabel: 'Add transaction',
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('transactions', { screen: 'new' });
          },
        })}
      />

      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => (
            <Feather name="credit-card" size={components.tabBar.iconSize} color={color} />
          ),
          tabBarAccessibilityLabel: 'Accounts tab',
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={components.tabBar.iconSize} color={color} />
          ),
          tabBarAccessibilityLabel: 'Profile tab',
        }}
        listeners={{
          tabPress: () => Haptics.selectionAsync(),
        }}
      />
    </Tabs>
  );
}
