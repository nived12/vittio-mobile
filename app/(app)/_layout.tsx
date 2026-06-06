import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, TouchableOpacity, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { StatementUploadModal } from '../../src/components/modals/StatementUploadModal';
import { ConfirmationBanner } from '../../src/components/ui/ConfirmationBanner';
import { FabSpeedDial, FabAction } from '../../src/components/ui/FabSpeedDial';
import { Toast } from '../../src/components/ui/Toast';
import { useUIStore } from '../../src/stores/uiStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useRequireConfirmed } from '../../src/hooks/useRequireConfirmed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';

// Default React Navigation bottom tab bar content heights per platform.
// iOS: 49pt (UIKit standard) + safe-area inset for the home indicator.
// Android: 56dp (Material standard); no inset needed since edge-to-edge is enabled.
const TAB_BAR_CONTENT_HEIGHT_IOS = 49;
const TAB_BAR_CONTENT_HEIGHT_ANDROID = 56;
const TOAST_GAP_ABOVE_TAB_BAR = 16;

// Module-scope tab-bar icon factories. Defining these inside AppLayout
// re-creates the function on every parent render, which makes React Navigation
// think the screen options changed and re-mount the tab bar items.
const renderHomeIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
);
const renderActivityIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
);
const renderAccountsIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
);
const renderFinancesIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'trending-up' : 'trending-up-outline'} size={22} color={color} />
);
const HIDDEN_TAB_OPTIONS = { href: null } as const;

const fabButtonStyle = {
  top: -16,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '#4f46e5',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: '#4f46e5',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 8,
};

// ── Tab navigator ──────────────────────────────────────────────────────────

export default function AppLayout() {
  const { t } = useTranslation();
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

  const fabIconRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabIconRotation, {
      toValue: showFabSheet ? 1 : 0,
      tension: 200,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [showFabSheet]);
  const iconRotate = fabIconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const showBanner = user != null && !user.confirmed && !hideConfirmationBanner;
  const { theme } = useTheme();
  const tabBarBg = theme.tabBarBg;
  const tabBarBorder = theme.tabBarBorder;
  const tabBarActive = theme.tabBarActive;
  const tabBarInactive = theme.tabBarInactive;

  const handleFabLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowFabSheet(true);
  }, []);

  const fabActions: FabAction[] = useMemo(() => [
    {
      key: 'newTransaction',
      icon: 'plus',
      tint: 'indigo',
      title: t('navigation.fab.newTransaction'),
      subtitle: t('navigation.fab.newTransactionSubtitle'),
      onPress: () => requireConfirmed(() => router.push('/(app)/transactions/new')),
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
  ], [t, requireConfirmed, openStatementUpload]);

  // Stable haptic handler for every tab's tabPress listener.
  const tabPressListeners = useMemo(
    () => ({ tabPress: () => Haptics.selectionAsync() }),
    [],
  );

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: tabBarActive,
    tabBarInactiveTintColor: tabBarInactive,
    freezeOnBlur: true,
    tabBarStyle: {
      backgroundColor: tabBarBg,
      borderTopWidth: 1,
      borderTopColor: tabBarBorder,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      marginTop: 2,
    },
  }), [tabBarActive, tabBarInactive, tabBarBg, tabBarBorder]);

  const homeOptions = useMemo(() => ({
    title: t('navigation.home'),
    tabBarIcon: renderHomeIcon,
    tabBarAccessibilityLabel: t('navigation.homeTab'),
  }), [t]);

  const activityOptions = useMemo(() => ({
    title: t('navigation.activity'),
    tabBarIcon: renderActivityIcon,
    tabBarAccessibilityLabel: t('navigation.activityTab'),
  }), [t]);

  const accountsOptions = useMemo(() => ({
    title: t('navigation.accounts'),
    tabBarIcon: renderAccountsIcon,
    tabBarAccessibilityLabel: t('navigation.accountsTab'),
  }), [t]);

  const financesOptions = useMemo(() => ({
    title: t('navigation.finances'),
    tabBarIcon: renderFinancesIcon,
    tabBarAccessibilityLabel: t('navigation.financesTab'),
  }), [t]);

  // The FAB tab options depend on showFabSheet + iconRotate so we don't memoize
  // it aggressively — its rotation animation needs to stay reactive.
  const addOptions = useMemo(() => ({
    tabBarButton: () => (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={() => {
            if (showFabSheet) {
              setShowFabSheet(false);
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            requireConfirmed(() => router.push('/(app)/transactions/new'));
          }}
          onLongPress={handleFabLongPress}
          style={fabButtonStyle}
          accessibilityLabel={t('navigation.addTransaction')}
          accessibilityRole="button"
          accessibilityHint={t('navigation.addTransactionHint')}
        >
          <Animated.View style={{ transform: [{ rotate: iconRotate }] }}>
            <Ionicons name="add" size={28} color="#ffffff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    ),
  }), [showFabSheet, requireConfirmed, handleFabLongPress, iconRotate, t]);

  return (
    <>
      {showBanner && <ConfirmationBanner />}
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen name="index" options={homeOptions} listeners={tabPressListeners} />
        <Tabs.Screen name="transactions" options={activityOptions} listeners={tabPressListeners} />
        <Tabs.Screen name="add" options={addOptions} />
        <Tabs.Screen name="accounts" options={accountsOptions} listeners={tabPressListeners} />
        <Tabs.Screen name="finances" options={financesOptions} listeners={tabPressListeners} />

        {/* Routes hidden from the tab bar but accessible via deep links / profile menu */}
        <Tabs.Screen name="profile" options={HIDDEN_TAB_OPTIONS} />
        <Tabs.Screen name="settings" options={HIDDEN_TAB_OPTIONS} />
        <Tabs.Screen name="delete-account" options={HIDDEN_TAB_OPTIONS} />
        <Tabs.Screen name="categories" options={HIDDEN_TAB_OPTIONS} />
        <Tabs.Screen name="notification-preferences" options={HIDDEN_TAB_OPTIONS} />
        <Tabs.Screen name="premium" options={HIDDEN_TAB_OPTIONS} />
        <Tabs.Screen name="assistant" options={HIDDEN_TAB_OPTIONS} />
        <Tabs.Screen name="recurring" options={HIDDEN_TAB_OPTIONS} />
      </Tabs>

      {showUploadStatement && (
        <StatementUploadModal
          visible={showUploadStatement}
          onClose={closeStatementUpload}
        />
      )}
      {showFabSheet && (
        <FabSpeedDial
          visible={showFabSheet}
          onClose={() => setShowFabSheet(false)}
          actions={fabActions}
        />
      )}
      <View
        style={{
          position: 'absolute',
          bottom:
            (Platform.OS === 'ios'
              ? TAB_BAR_CONTENT_HEIGHT_IOS + insets.bottom
              : TAB_BAR_CONTENT_HEIGHT_ANDROID) + TOAST_GAP_ABOVE_TAB_BAR,
          left: 16,
          right: 16,
          gap: 8,
        }}
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
