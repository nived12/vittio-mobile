import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, components, textStyles } from '../../theme';

// ── Types ──────────────────────────────────────────────────────────────────

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  /** Slot for a right-side element (e.g. show/hide password toggle). */
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
}

// ── Component ──────────────────────────────────────────────────────────────

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, rightElement, containerStyle, ...textInputProps },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);

  const inputStateStyle = error
    ? styles.inputError
    : isFocused
    ? styles.inputFocused
    : styles.inputResting;

  return (
    <View style={[styles.container, containerStyle]}>
      {label != null && (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      )}

      <View style={[styles.inputRow, inputStateStyle]}>
        <TextInput
          ref={ref}
          style={styles.textInput}
          placeholderTextColor={components.input.resting.placeholderColor}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />
        {rightElement != null && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>

      {error != null && error.length > 0 && (
        <Text
          style={styles.errorText}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
});

// ── ShowHideToggle ─────────────────────────────────────────────────────────

interface ShowHideToggleProps {
  visible: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
}

export function ShowHideToggle({
  visible,
  onToggle,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
}: ShowHideToggleProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={visible ? hideLabel : showLabel}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={styles.toggleButton}
    >
      <Feather
        name={visible ? 'eye-off' : 'eye'}
        size={20}
        color={colors.neutral[400]}
      />
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...components.input.label,
    marginBottom: components.input.label.marginBottom,
  },
  inputRow: {
    height:        components.input.height,
    borderRadius:  components.input.borderRadius,
    borderWidth:   1,
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: components.input.paddingH,
  },
  inputResting: {
    backgroundColor: components.input.resting.backgroundColor,
    borderColor:     components.input.resting.borderColor,
  },
  inputFocused: {
    backgroundColor: components.input.focused.backgroundColor,
    borderColor:     components.input.focused.borderColor,
  },
  inputError: {
    backgroundColor: components.input.error.backgroundColor,
    borderColor:     components.input.error.borderColor,
  },
  textInput: {
    flex:       1,
    fontFamily: components.input.fontFamily,
    fontSize:   components.input.fontSize,
    lineHeight: components.input.lineHeight,
    color:      components.input.resting.color,
    padding:    0, // Remove default Android padding
  },
  rightElement: {
    marginLeft: 8,
  },
  toggleButton: {
    padding: 4,
  },
  errorText: {
    ...components.input.errorText,
  },
});
