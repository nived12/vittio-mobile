import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Upload, BotMessageSquare } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

export type FabActionTint = 'indigo' | 'cyan';

export interface FabAction {
  key: 'newTransaction' | 'uploadStatement' | 'aiAssistant';
  icon: 'plus' | 'upload' | 'bot';
  tint: FabActionTint;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const TINT_COLORS: Record<FabActionTint, string> = {
  indigo: '#4f46e5',
  cyan: '#0891b2',
};

const MINI_SIZE = 48;
const ITEM_GAP = 16;
const LABEL_GAP = 10;
const SCREEN_EDGE_MARGIN = 16;
// Distance from screen bottom to the first item's bottom edge:
// tab bar (64) + FAB lift (16) + FAB radius (28) + breathing room (12)
// tab bar (64) + FAB lift (16) + FAB radius (28) - tab bar center offset (32) + gap (12) = 88
const BOTTOM_OFFSET_BASE = 88;

function DialIcon({ name, color }: { name: FabAction['icon']; color: string }) {
  const sz = 21;
  if (name === 'plus') return <Plus size={sz} color={color} strokeWidth={2.2} />;
  if (name === 'upload') return <Upload size={sz} color={color} strokeWidth={2.2} />;
  return <BotMessageSquare size={sz} color={color} strokeWidth={2.2} />;
}

interface FabSpeedDialProps {
  visible: boolean;
  onClose: () => void;
  actions: FabAction[];
}

export function FabSpeedDial({ visible, onClose, actions }: FabSpeedDialProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const backdropAnim = useRef(new Animated.Value(0)).current;
  // One value per item; index 0 = closest to FAB (rendered at bottom).
  const itemAnims = useRef(actions.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        // Stagger bottom→top: item 0 first (nearest FAB), item n last (farthest)
        Animated.stagger(
          65,
          itemAnims.map((a) =>
            Animated.spring(a, {
              toValue: 1,
              tension: 160,
              friction: 13,
              useNativeDriver: true,
            })
          )
        ),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        // Collapse top→bottom: reverse order
        Animated.stagger(
          40,
          [...itemAnims].reverse().map((a) =>
            Animated.spring(a, {
              toValue: 0,
              tension: 280,
              friction: 22,
              useNativeDriver: true,
            })
          )
        ),
      ]).start();
    }
  }, [visible]);

  // Mini FABs center-align with the main FAB (screen center).
  // paddingRight positions the RIGHT edge of each mini FAB at screen center + radius.
  const rightPadding = screenWidth / 2 - MINI_SIZE / 2;
  const bottomStart = insets.bottom + BOTTOM_OFFSET_BASE;

  // Rows are right-anchored at screenWidth/2 + MINI_SIZE/2 and grow leftward, so a
  // label only ever has the left half of the screen minus the mini FAB and its gap.
  // Without a cap it runs off-screen instead of wrapping: "Subir estado de cuenta"
  // clipped on a 393pt iPhone 15 Pro while fitting a 402pt device.
  const labelMaxWidth =
    screenWidth / 2 + MINI_SIZE / 2 - MINI_SIZE - LABEL_GAP - SCREEN_EDGE_MARGIN;

  const miniFabBg = isDark ? '#1e293b' : '#ffffff';
  const labelBg = isDark ? '#1e293b' : '#ffffff';
  const labelColor = isDark ? '#f1f5f9' : '#0f172a';

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      {/* Backdrop — full screen, catches taps to close */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000000',
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.44],
            }),
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>


      {/* Speed-dial stack — column-reverse so item[0] is visually closest to FAB */}
      <View
        style={[
          styles.stack,
          {
            bottom: bottomStart,
            paddingRight: rightPadding,
          },
        ]}
        pointerEvents="box-none"
      >
        {actions.map((action, idx) => {
          const anim = itemAnims[idx];
          const iconColor = TINT_COLORS[action.tint];

          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [22, 0],
          });
          const scale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.68, 1],
          });

          return (
            <Animated.View
              key={action.key}
              style={[
                styles.row,
                {
                  opacity: anim,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            >
              {/* Label pill — flexShrink:0 so it never compresses */}
              <View style={[styles.label, { backgroundColor: labelBg, maxWidth: labelMaxWidth }]}>
                <Text style={[styles.labelText, { color: labelColor }]}>
                  {action.title}
                </Text>
              </View>

              <View style={styles.gap} />

              {/* Mini FAB */}
              <TouchableOpacity
                style={[styles.miniFab, { backgroundColor: miniFabBg, shadowColor: iconColor }]}
                onPress={() => {
                  onClose();
                  setTimeout(action.onPress, 190);
                }}
                accessibilityRole="button"
                accessibilityLabel={action.title}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
                activeOpacity={0.75}
              >
                <DialIcon name={action.icon} color={iconColor} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    // Renders items in column-reverse so index 0 ends up visually at bottom (nearest FAB)
    flexDirection: 'column-reverse',
    gap: ITEM_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  label: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  labelText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },
  gap: { width: LABEL_GAP, flexShrink: 0 },
  miniFab: {
    width: MINI_SIZE,
    height: MINI_SIZE,
    borderRadius: MINI_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 7,
  },
});
