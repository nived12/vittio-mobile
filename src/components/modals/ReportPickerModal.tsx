import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { downloadMonthlyReport } from '../../api/reports';
import { useUIStore } from '../../stores/uiStore';
import { colors, spacing, textStyles } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReportPickerModal({ visible, onClose }: Props) {
  const { theme, isDark } = useTheme();
  const sheetBg       = isDark ? (theme as any).surface         : '#ffffff';
  const inputBg       = isDark ? (theme as any).surfaceElevated : '#f1f5f9';
  const textPrimary   = isDark ? (theme as any).textPrimary     : '#0f172a';
  const textSecondary = isDark ? (theme as any).textSecondary   : '#64748b';
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();
  const locale  = useUIStore((s) => s.locale);
  const { showToast } = useUIStore();

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based
  const [isLoading, setIsLoading] = useState(false);

  const monthNames = locale === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;

  function prevMonth() {
    Haptics.selectionAsync();
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    Haptics.selectionAsync();
    // Don't allow future months
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const isFutureMonth = year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  async function handleDownload() {
    setIsLoading(true);
    try {
      await downloadMonthlyReport(year, month);
      // Share sheet opened — no toast needed, OS handles the UX
      onClose();
    } catch (err: any) {
      showToast(t('report.downloadError'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20, backgroundColor: sheetBg }]}>
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.neutral[300] }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('report.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: textSecondary }]}>{t('report.selectMonthSubtitle')}</Text>

          {/* Month / year picker */}
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={[styles.arrowBtn, { backgroundColor: inputBg }]}
              onPress={prevMonth}
              accessibilityRole="button"
              accessibilityLabel={t('report.prevMonth')}
            >
              <ChevronLeft size={22} color={textPrimary} />
            </TouchableOpacity>

            <View style={styles.monthDisplay}>
              <Text style={[styles.monthText, { color: textPrimary }]}>{monthNames[month - 1]}</Text>
              <Text style={[styles.yearText, { color: textSecondary }]}>{year}</Text>
            </View>

            <TouchableOpacity
              style={[styles.arrowBtn, { backgroundColor: inputBg }, isFutureMonth && styles.arrowBtnDisabled]}
              onPress={nextMonth}
              disabled={isFutureMonth}
              accessibilityRole="button"
              accessibilityLabel={t('report.nextMonth')}
            >
              <ChevronRight size={22} color={isFutureMonth ? textSecondary : textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Download button */}
          <TouchableOpacity
            style={[styles.downloadBtn, isLoading && styles.downloadBtnDisabled]}
            onPress={handleDownload}
            disabled={isLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.downloadBtnText}>{t('report.downloadButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    justifyContent:  'flex-end',
    backgroundColor: colors.bg.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.bg.card,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingHorizontal:    spacing.screenPaddingH,
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
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...textStyles.headingLg,
    color: colors.text.primary,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    ...textStyles.bodyMd,
    color:        colors.text.secondary,
    marginBottom: spacing.lg,
  },
  pickerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:             spacing.lg,
    marginBottom:   spacing.xl,
  },
  arrowBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: colors.bg.surface2,
    alignItems:      'center',
    justifyContent:  'center',
  },
  arrowBtnDisabled: {
    opacity: 0.4,
  },
  monthDisplay: {
    alignItems:  'center',
    minWidth:    140,
  },
  monthText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   22,
    color:      colors.text.primary,
  },
  yearText: {
    ...textStyles.bodySm,
    color:     colors.text.secondary,
    marginTop:  2,
  },
  downloadBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius:    12,
    paddingVertical: 15,
    alignItems:      'center',
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize:   16,
    color:      '#ffffff',
  },
});
