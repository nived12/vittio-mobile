import React from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { LogOut, Tag, Upload, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import i18n from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useRequireConfirmed } from '../../hooks/useRequireConfirmed';
import { colors, spacing, textStyles } from '../../theme';

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);
  const requireConfirmed = useRequireConfirmed();

  const initials = getInitials(user);
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  function handleLanguage(lang: 'en' | 'es') {
    Haptics.selectionAsync();
    setLocale(lang);
    i18n.changeLanguage(lang);
  }

  function handleUpload() {
    requireConfirmed(() => {
      onClose();
      setTimeout(() => openStatementUpload(), 300);
    });
  }

  function handleEditProfile() {
    onClose();
    router.push('/(app)/profile');
  }

  function handleCategories() {
    onClose();
    router.push('/(app)/categories');
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Avatar row */}
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.userName} numberOfLines={1}>{fullName || '—'}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Upload statement */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleUpload}
          accessibilityRole="button"
          accessibilityLabel={t('profile.statementUpload')}
        >
          <Upload size={20} color={colors.text.secondary} />
          <Text style={styles.actionLabel}>{t('profile.statementUpload')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Edit profile */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleEditProfile}
          accessibilityRole="button"
          accessibilityLabel={t('profile.editProfile')}
        >
          <User size={20} color={colors.text.secondary} />
          <Text style={styles.actionLabel}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Categories */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleCategories}
          accessibilityRole="button"
          accessibilityLabel={t('profile.manageCategories')}
        >
          <Tag size={20} color={colors.text.secondary} />
          <Text style={styles.actionLabel}>{t('profile.manageCategories')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Language toggle */}
        <View style={styles.languageRow}>
          <Text style={styles.languageLabel}>{t('profile.language')}</Text>
          <View style={styles.langPills}>
            {(['ES', 'EN'] as const).map((label) => {
              const lang = label.toLowerCase() as 'es' | 'en';
              const active = locale === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => handleLanguage(lang)}
                  style={[styles.langPill, active && styles.langPillActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.langPillText, active && styles.langPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

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
      </View>
    </Modal>
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
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: colors.brand.primary,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:       0,
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize:   20,
    color:      '#ffffff',
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
    backgroundColor:  colors.border.subtle,
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
    borderColor:     colors.border.default,
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
});
