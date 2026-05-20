import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { AddEditTransactionModal } from '../../src/components/modals/AddEditTransactionModal';
import { StatementUploadModal } from '../../src/components/modals/StatementUploadModal';
import { ConfirmationBanner } from '../../src/components/ui/ConfirmationBanner';
import { FabActionSheet, FabAction } from '../../src/components/ui/FabActionSheet';
import { Toast } from '../../src/components/ui/Toast';
import { useUIStore } from '../../src/stores/uiStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useRequireConfirmed } from '../../src/hooks/useRequireConfirmed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';

// ── Tab navigator ──────────────────────────────────────────────────────────

export default function AppLayout() {
  const { t } = useTranslation();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showFabSheet, setShowFabSheet] = useState(false);
  const showUploadStatement = useUIStore((s) => s.showStatementUpload);
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);
  const closeStatementUpload = useUIStore((s) => s.closeStatementUpload);
  const hideConfirmationBanner = useUIStore((s) => s.hideConfirmationBanner);
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);
  const user = useAuthStore((s) => s.user);
  const requireConfirmed = useRequireConfirmed();
  const insets = useSafeAreaInsets();

  const showBanner = user != null && !user.confirmed && !hideConfirmationBanner;
  const { theme } = useTheme();
  const tabBarBg = theme.tabBarBg;
  const tabBarBorder = theme.tabBarBorder;
  const tabBarActive = theme.tabBarActive;
  const tabBarInactive = theme.tabBarInactive;

  function handleFabLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowFabSheet(true);
  }

  const fabActions: FabAction[] = [
    {
      key: 'newTransaction',
      icon: 'plus',
      tint: 'indigo',
      title: t('navigation.fab.newTransaction'),
      subtitle: t('navigation.fab.newTransactionSubtitle'),
      onPress: () => requireConfirmed(() => setShowAddTransaction(true)),
    },
    {
      key: 'uploadStatement',
      icon: 'upload',
      tint: 'cyan',
      title: t('navigation.fab.uploadStatement'),
      subtitle: t('navigation.fab.uploadStatementSubtitle'),
      onPress: () => requireConfirmed(() => openStatementUpload()),
    },
    {
      key: 'aiAssistant',
      icon: 'bot',
      tint: 'indigo',
      title: t('navigation.fab.aiAssistant'),
      subtitle: t('navigation.fab.aiAssistantSubtitle'),
      onPress: () => router.push('/(app)/assistant'),
    },
  ];

  return (
    <>
      {showBanner && <ConfirmationBanner />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: tabBarActive,
          tabBarInactiveTintColor: tabBarInactive,
          tabBarStyle: {
            backgroundColor: tabBarBg,
            borderTopWidth: 1,
            borderTopColor: tabBarBorder,
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
                    requireConfirmed(() => setShowAddTransaction(true));
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

        {/* Hide categories from tab bar */}
        <Tabs.Screen name="categories" options={{ href: null }} />

        {/* Hide notification-preferences from tab bar */}
        <Tabs.Screen name="notification-preferences" options={{ href: null }} />

        {/* Hide premium from tab bar — accessible via profile */}
        <Tabs.Screen name="premium" options={{ href: null }} />

        {/* Hide assistant from tab bar — accessible via profile / FAB long-press */}
        <Tabs.Screen name="assistant" options={{ href: null }} />
      </Tabs>

      <AddEditTransactionModal
        visible={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
      />
      <StatementUploadModal
        visible={showUploadStatement}
        onClose={closeStatementUpload}
      />
      <FabActionSheet
        visible={showFabSheet}
        onClose={() => setShowFabSheet(false)}
        actions={fabActions}
      />
      <View
        style={{ position: 'absolute', bottom: insets.bottom + 74, left: 16, right: 16, gap: 8 }}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            variant={t.variant}
            action={t.action}
            onDismiss={() => dismissToast(t.id)}
          />
        ))}
      </View>
    </>
  );
}
