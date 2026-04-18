import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, TouchableOpacity, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AddEditTransactionModal } from '../../src/components/modals/AddEditTransactionModal';
import { StatementUploadModal } from '../../src/components/modals/StatementUploadModal';

// ── Tab navigator ──────────────────────────────────────────────────────────

export default function AppLayout() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showUploadStatement, setShowUploadStatement] = useState(false);

  function handleFabLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Nueva transacción', 'Subir estado de cuenta'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) setShowAddTransaction(true);
          if (idx === 2) setShowUploadStatement(true);
        },
      );
    } else {
      Alert.alert('Opciones', '', [
        { text: 'Nueva transacción', onPress: () => setShowAddTransaction(true) },
        { text: 'Subir estado de cuenta', onPress: () => setShowUploadStatement(true) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: '#4f46e5',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
            height: 64,
            paddingBottom: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            marginTop: 2,
          },
        }}
      >
        {/* 1. Home */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: 'Home tab',
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        {/* 2. Activity */}
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Activity',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: 'Activity tab',
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        {/* 3. FAB — center raised button */}
        <Tabs.Screen
          name="add"
          options={{
            tabBarButton: () => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowAddTransaction(true);
                  }}
                  onLongPress={handleFabLongPress}
                  style={{
                    top: -16,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#4f46e5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#4f46e5',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                  accessibilityLabel="Add transaction"
                  accessibilityRole="button"
                  accessibilityHint="Tap to add a transaction. Long press for more options."
                >
                  <Ionicons name="add" size={28} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        {/* 4. Accounts */}
        <Tabs.Screen
          name="accounts"
          options={{
            title: 'Accounts',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: 'Accounts tab',
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        {/* 5. More */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'More',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: 'More tab',
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        {/* Hide settings from tab bar */}
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>

      <AddEditTransactionModal
        visible={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
      />
      <StatementUploadModal
        visible={showUploadStatement}
        onClose={() => setShowUploadStatement(false)}
      />
    </>
  );
}
