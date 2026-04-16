import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, textStyles } from '../../theme';

// ── Strength scoring ───────────────────────────────────────────────────────

export function calculateStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 8)                          score++;
  if (/[A-Z]/.test(password))                        score++;
  if (/[0-9]/.test(password))                        score++;
  if (/[!@#$%^&*()_+\-=[\]{}|;':",.<>/?`~\\]/.test(password)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

// ── Color + label map ──────────────────────────────────────────────────────

const strengthConfig = {
  0: { color: 'transparent',    label: ''        },
  1: { color: '#f43f5e',        label: 'Weak'    }, // rose-500
  2: { color: '#f59e0b',        label: 'Fair'    }, // amber-500
  3: { color: '#0ea5e9',        label: 'Good'    }, // sky-500
  4: { color: colors.income,    label: 'Strong'  }, // emerald-600
} as const;

// ── Component ──────────────────────────────────────────────────────────────

interface PasswordStrengthBarProps {
  strength: 0 | 1 | 2 | 3 | 4;
}

export function PasswordStrengthBar({ strength }: PasswordStrengthBarProps) {
  if (strength === 0) return null;

  const { color, label } = strengthConfig[strength];

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Password strength: ${label}`}
      accessibilityValue={{ min: 0, max: 4, now: strength }}
    >
      <View style={styles.segments}>
        {([1, 2, 3, 4] as const).map((segment) => (
          <View
            key={segment}
            style={[
              styles.segment,
              { backgroundColor: segment <= strength ? color : colors.neutral[200] },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    marginTop:      8,
  },
  segments: {
    flex:          1,
    flexDirection: 'row',
    gap:           4,
  },
  segment: {
    flex:         1,
    height:       4,
    borderRadius: 2,
  },
  label: {
    ...textStyles.caption,
    marginLeft: 8,
    minWidth:   40,
    textAlign:  'right',
  },
});
