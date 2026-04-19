import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, TouchableOpacity, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { AddEditTransactionModal } from '../../src/components/modals/AddEditTransactionModal';
import { StatementUploadModal } from '../../src/components/modals/StatementUploadModal';
import { useUIStore } from '../../src/stores/uiStore';

// ── Tab navigator ──────────────────────────────────────────────────────────

export default function AppLayout() {
  const { t } = useTranslation();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const showUploadStatement = useUIStore((s) => s.showStatementUpload);
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);
  const closeStatementUpload = useUIStore((s) => s.closeStatementUpload);

  function handleFabLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('navigation.fab.cancel'), t('navigation.fab.newTransaction'), t('navigation.fab.uploadStatement')],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) setShowAddTransaction(true);
          if (idx === 2) openStatementUpload();
        },
      );
    } else {
      Alert.alert(t('navigation.fab.options'), '', [
        { text: t('navigation.fab.newTransaction'), onPress: () => setShowAddTransaction(true) },
        { text: t('navigation.fab.uploadStatement'), onPress: () => openStatementUpload() },
        { text: t('navigation.fab.cancel'), style: 'cancel' },
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
            title: t('navigation.home'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: t('navigation.homeTab'),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        {/* 2. Activity */}
        <Tabs.Screen
          name="transactions"
          options={{
            title: t('navigation.activity'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: t('navigation.activityTab'),
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
                  accessibilityLabel={t('navigation.addTransaction')}
                  accessibilityRole="button"
                  accessibilityHint={t('navigation.addTransactionHint')}
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
            title: t('navigation.accounts'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: t('navigation.accountsTab'),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        {/* 5. Finances */}
        <Tabs.Screen
          name="finances"
          options={{
            title: t('navigation.finances'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'trending-up' : 'trending-up-outline'} size={22} color={color} />
            ),
            tabBarAccessibilityLabel: t('navigation.financesTab'),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        {/* Hide profile from tab bar (kept as dead code) */}
        <Tabs.Screen name="profile" options={{ href: null }} />

        {/* Hide settings from tab bar */}
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>

      <AddEditTransactionModal
        visible={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
      />
      <StatementUploadModal
        visible={showUploadStatement}
        onClose={closeStatementUpload}
      />
    </>
  );
}
