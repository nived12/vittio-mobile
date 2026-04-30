import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Bell, Camera, Download, LogOut, Tag, Upload, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useRequireConfirmed } from '../../hooks/useRequireConfirmed';
import { apiClient } from '../../api/client';
import { ReportPickerModal } from './ReportPickerModal';
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
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const { showToast } = useUIStore();
  const openStatementUpload = useUIStore((s) => s.openStatementUpload);
  const requireConfirmed = useRequireConfirmed();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showReport, setShowReport] = useState(false);

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

  function handleEditProfile() {
    onClose();
    router.push('/(app)/profile');
  }

  function handleCategories() {
    onClose();
    router.push('/(app)/categories');
  }

  function handleNotifications() {
    onClose();
    router.push('/(app)/notification-preferences');
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.handle} />

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
            <View style={styles.cameraOverlay}>
              <Camera size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>
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

        {/* Download report */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => { onClose(); setTimeout(() => setShowReport(true), 300); }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.downloadReport')}
        >
          <Download size={20} color={colors.text.secondary} />
          <Text style={styles.actionLabel}>{t('profile.downloadReport')}</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Notifications */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleNotifications}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.title')}
        >
          <Bell size={20} color={colors.text.secondary} />
          <Text style={styles.actionLabel}>{t('notifications.title')}</Text>
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
