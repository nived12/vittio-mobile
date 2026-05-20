import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Plus, Upload } from 'lucide-react-native';
import { BotMessageSquare } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { colors, spacing, textStyles } from '../../theme';

export type FabActionTint = 'indigo' | 'cyan';

export interface FabAction {
  key: 'newTransaction' | 'uploadStatement' | 'aiAssistant';
  icon: 'plus' | 'upload' | 'bot';
  tint: FabActionTint;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const TINTS: Record<FabActionTint, { fg: { light: string; dark: string }; bg: { light: string; dark: string } }> = {
  indigo: {
    fg: { light: '#4f46e5', dark: '#a5b4fc' },
    bg: { light: '#eef2ff', dark: 'rgba(99, 102, 241, 0.18)' },
  },
  cyan: {
    fg: { light: '#0891b2', dark: '#67e8f9' },
    bg: { light: '#ecfeff', dark: 'rgba(6, 182, 212, 0.18)' },
  },
};

interface FabActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: FabAction[];
}

function renderIcon(name: FabAction['icon'], color: string) {
  const size = 20;
  switch (name) {
    case 'plus':
      return <Plus size={size} color={color} strokeWidth={2.2} />;
    case 'upload':
      return <Upload size={size} color={color} strokeWidth={2.2} />;
    case 'bot':
      return <BotMessageSquare size={size} color={color} strokeWidth={2.2} />;
  }
}

export function FabActionSheet({ visible, onClose, actions }: FabActionSheetProps) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 200,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });
  const sheetTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const surface = isDark ? theme.surface : '#ffffff';
  const textPrimary = isDark ? theme.textPrimary : '#0f172a';
  const textSecondary = isDark ? theme.textSecondary : '#64748b';
  const border = isDark ? theme.border : '#e2e8f0';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrap,
            { transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={[styles.card, { backgroundColor: surface }]}>
              {actions.map((action, idx) => {
                const tint = TINTS[action.tint];
                const iconFg = isDark ? tint.fg.dark : tint.fg.light;
                const iconBg = isDark ? tint.bg.dark : tint.bg.light;
                return (
                <React.Fragment key={action.key}>
                  {idx > 0 && <View style={[styles.divider, { backgroundColor: border }]} />}
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => {
                      onClose();
                      setTimeout(action.onPress, 200);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={action.title}
                  >
                    <View style={[styles.iconSquare, { backgroundColor: iconBg }]}>
                      {renderIcon(action.icon, iconFg)}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, { color: textPrimary }]}>{action.title}</Text>
                      <Text style={[styles.rowSubtitle, { color: textSecondary }]}>
                        {action.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.cancelCard, { backgroundColor: surface }]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={[styles.cancelText, { color: colors.brand.primary }]}>
                {t('navigation.fab.cancel')}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  sheetWrap: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  iconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...textStyles.bodyMd, fontFamily: 'Inter_600SemiBold' },
  rowSubtitle: { ...textStyles.bodySm, opacity: 0.85 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
  cancelCard: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: { ...textStyles.bodyMd, fontFamily: 'Inter_600SemiBold' },
});
