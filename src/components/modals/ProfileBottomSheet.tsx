import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Springs } from '../../theme/animations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Bell, BotMessageSquare, Camera, Crown, Download, LogOut, Repeat2, Settings as SettingsIcon, Tag, Upload, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useRequireConfirmed } from '../../hooks/useRequireConfirmed';
import { useRecurringSummary } from '../../hooks/useRecurringSummary';
import { apiClient } from '../../api/client';
import { ReportPickerModal } from './ReportPickerModal';
import { colors, spacing, textStyles } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(user: { first_name?: string; last_name?: string } | null | undefined) {
  return [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';
}

// ── Component ──────────────────────────────────────────────────────────────

interface ProfileBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileBottomSheet({ visible, onClose }: ProfileBottomSheetProps) {
  const { theme, isDark } = useTheme();
  const sheetBg       = isDark ? theme.surface         : '#ffffff';
  const inputBg       = isDark ? theme.surfaceElevated : '#f1f5f9';
  const textPrimary   = isDark ? theme.textPrimary     : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary   : '#64748b';
  const borderCol     = isDark ? theme.border          : '#e2e8f0';
  const dividerCol    = isDark ? 'rgba(255,255,255,0.06)'       : '#f1f5f9';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const subscriptionStatus = useAuthStore((s) => s.user?.subscription_status ?? 'none');
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const colorScheme = useUIStore((s) => s.colorScheme);
  const setColorScheme = useUIStore((s) => s.setColorScheme);
  const { showToast } = useUIStore();
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);
  const requireConfirmed = useRequireConfirmed();
  const { detectedCount } = useRecurringSummary();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Spring animation
  const translateY = useSharedValue(300);
  const animOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, Springs.bottomSheet);
      animOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [visible]);

  const handleAnimatedClose = () => {
    translateY.value = withSpring(300, Springs.bottomSheet, (finished) => {
      if (finished) runOnJS(onClose)();
    });
    animOpacity.value = withTiming(0, { duration: 150 });
  };

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: animOpacity.value,
  }));

  const initials = getInitials(user);
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  function handleLanguage(lang: 'en' | 'es') {
    Haptics.selectionAsync();
    setLocale(lang);
    i18n.changeLanguage(lang);
  }

  function handleScheme(scheme: 'system' | 'light' | 'dark') {
    Haptics.selectionAsync();
    setColorScheme(scheme);
  }

  function handleUpload() {
    requireConfirmed(() => {
      onClose();
      setTimeout(() => openStatementUpload(), 300);
    });
  }

  async function handleChangeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('profile.avatarPermissionTitle'), t('profile.avatarPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('avatar', {
      uri: asset.uri,
      name: 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as any);

    setUploadingAvatar(true);
    try {
      // Do NOT set Content-Type manually — Axios must generate the multipart boundary
      const response = await apiClient.patch('/user/avatar', formData);
      if (response.data?.data) {
        setUser(response.data.data);
        showToast(t('profile.avatarUpdated'), 'success');
      }
    } catch {
      showToast(t('profile.avatarUpdateError'), 'error');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handlePremium() {
    onClose();
    router.push('/(app)/premium');
  }

  function handleEditProfile() {
    onClose();
    router.push('/(app)/profile');
  }

  function handleSettings() {
    onClose();
    router.push('/(app)/settings');
  }

  function handleCategories() {
    onClose();
    router.push('/(app)/categories');
  }

  function handleAssistant() {
    onClose();
    router.push('/(app)/assistant');
  }

  function handleNotifications() {
    onClose();
    router.push('/(app)/notification-preferences');
  }

  function handleRecurring() {
    onClose();
    router.push('/(app)/recurring');
  }

  function handleLogout() {
    Alert.alert(
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmMessage'),
      [
        { text: t('profile.logoutCancel'), style: 'cancel' },
        {
          text: t('profile.logoutConfirm'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onClose();
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }

  return (
    <>
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleAnimatedClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleAnimatedClose} />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: sheetBg }, animatedSheetStyle]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.neutral[300] }]} />

        {/* Avatar row */}
        <View style={styles.userRow}>
          <TouchableOpacity
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel={t('profile.changeAvatar')}
            style={styles.avatarWrapper}
          >
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={[styles.cameraOverlay, { borderColor: sheetBg }]}>
              <Camera size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.userName, { color: textPrimary }]} numberOfLines={1}>{fullName || '—'}</Text>
            <Text style={[styles.userEmail, { color: textSecondary }]} numberOfLines={1}>{user?.email ?? ''}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Upload statement */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleUpload}
          accessibilityRole="button"
          accessibilityLabel={t('profile.statementUpload')}
        >
          <Upload size={20} color={textSecondary} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('profile.statementUpload')}</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Edit profile */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleEditProfile}
          accessibilityRole="button"
          accessibilityLabel={t('profile.editProfile')}
        >
          <User size={20} color={textSecondary} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Settings */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleSettings}
          accessibilityRole="button"
          accessibilityLabel={t('navigation.settings')}
        >
          <SettingsIcon size={20} color={textSecondary} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('navigation.settings')}</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Premium */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handlePremium}
          accessibilityRole="button"
          accessibilityLabel={t('premium.headerTitle')}
        >
          <Crown size={20} color="#d97706" />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>
            {subscriptionStatus === 'active' ? t('settings.managePremium') : t('premium.headerTitle')}
          </Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Vittbot assistant */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleAssistant}
          accessibilityRole="button"
          accessibilityLabel={t('navigation.assistant')}
        >
          <BotMessageSquare size={20} color="#4f46e5" strokeWidth={2.2} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('navigation.assistant')}</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Categories */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleCategories}
          accessibilityRole="button"
          accessibilityLabel={t('profile.manageCategories')}
        >
          <Tag size={20} color={textSecondary} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('profile.manageCategories')}</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Recurring transactions */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleRecurring}
          accessibilityRole="button"
          accessibilityLabel={t('recurring.title')}
        >
          <Repeat2 size={20} color={textSecondary} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('recurring.title')}</Text>
          {detectedCount > 0 && (
            <View style={styles.recurringBadge}>
              <Text style={styles.recurringBadgeText}>{detectedCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Download report */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => { onClose(); setTimeout(() => setShowReport(true), 300); }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.downloadReport')}
        >
          <Download size={20} color={textSecondary} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('profile.downloadReport')}</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Notifications */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleNotifications}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.title')}
        >
          <Bell size={20} color={textSecondary} />
          <Text style={[styles.actionLabel, { color: textPrimary }]}>{t('notifications.title')}</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Language toggle */}
        <View style={styles.languageRow}>
          <Text style={[styles.languageLabel, { color: textPrimary }]}>{t('profile.language')}</Text>
          <View style={styles.langPills}>
            {(['ES', 'EN'] as const).map((label) => {
              const lang = label.toLowerCase() as 'es' | 'en';
              const active = locale === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => handleLanguage(lang)}
                  style={[styles.langPill, { backgroundColor: inputBg, borderColor: borderCol }, active && styles.langPillActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.langPillText, { color: textSecondary }, active && styles.langPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Appearance */}
        <View style={styles.languageRow}>
          <Text style={[styles.languageLabel, { color: textPrimary }]}>{t('settings.appearance')}</Text>
          <View style={styles.langPills}>
            {(['system', 'light', 'dark'] as const).map((option) => {
              const active = colorScheme === option;
              const label = option === 'system'
                ? t('settings.schemeSystem')
                : option === 'light'
                  ? t('settings.schemeLight')
                  : t('settings.schemeDark');
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => handleScheme(option)}
                  style={[styles.schemePill, { backgroundColor: inputBg, borderColor: borderCol }, active && styles.langPillActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.langPillText, { color: textSecondary }, active && styles.langPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerCol }]} />

        {/* Logout */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel={t('profile.logout')}
        >
          <LogOut size={20} color={colors.expense} />
          <Text style={[styles.actionLabel, { color: colors.expense }]}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>

    <ReportPickerModal visible={showReport} onClose={() => setShowReport(false)} />
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.overlay,
  },
  sheet: {
    position:         'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    backgroundColor:   colors.bg.card,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.neutral[300],
    alignSelf:       'center',
    marginTop:       10,
    marginBottom:    4,
  },
  userRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical:   16,
  },
  avatarWrapper: {
    width:      56,
    height:     56,
    flexShrink: 0,
    position:   'relative',
  },
  avatar: {
    width:        56,
    height:       56,
    borderRadius: 28,
  },
  avatarFallback: {
    backgroundColor: colors.brand.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize:   20,
    color:      '#ffffff',
  },
  cameraOverlay: {
    position:        'absolute',
    bottom:           0,
    right:            0,
    width:            20,
    height:           20,
    borderRadius:     10,
    backgroundColor:  colors.text.secondary,
    alignItems:       'center',
    justifyContent:   'center',
    borderWidth:      1.5,
    borderColor:      colors.bg.card,
  },
  userName: {
    ...textStyles.headingMd,
    color: colors.text.primary,
  },
  userEmail: {
    ...textStyles.bodySm,
    color:     colors.text.muted,
    marginTop: 1,
  },
  divider: {
    height:           1,
    backgroundColor:  colors.borderNested.subtle,
    marginHorizontal: spacing.screenPaddingH,
  },
  actionRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               12,
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical:   16,
    minHeight:         56,
  },
  actionLabel: {
    ...textStyles.bodyMd,
    color: colors.text.primary,
    flex: 1,
  },
  recurringBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringBadgeText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  languageRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical:   14,
    minHeight:         52,
  },
  languageLabel: {
    ...textStyles.bodyMd,
    color: colors.text.primary,
  },
  langPills: {
    flexDirection: 'row',
    gap:           8,
  },
  langPill: {
    width:           44,
    height:          32,
    borderRadius:    8,
    backgroundColor: colors.bg.surface2,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.borderNested.default,
  },
  langPillActive: {
    backgroundColor: colors.brand.primary,
    borderColor:     colors.brand.primary,
  },
  langPillText: {
    fontFamily: 'Inter_400Regular',
    fontSize:   13,
    color:      colors.text.secondary,
  },
  langPillTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color:      '#ffffff',
  },
  schemePill: {
    minWidth:        56,
    height:          32,
    borderRadius:    8,
    backgroundColor: colors.bg.surface2,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 8,
    borderWidth:     1,
    borderColor:     colors.borderNested.default,
  },
});
