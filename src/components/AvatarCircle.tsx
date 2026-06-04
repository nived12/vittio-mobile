import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Crown } from 'lucide-react-native';

interface AvatarCircleProps {
  initials: string;
  onPress: () => void;
  isPremium?: boolean;
  avatarUrl?: string | null;
}

function AvatarCircleComponent({ initials, onPress, isPremium, avatarUrl }: AvatarCircleProps) {
  const [imgError, setImgError] = React.useState(false);
  const showImage = !!avatarUrl && !imgError;

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity onPress={onPress} style={styles.avatarCircle} accessibilityRole="button">
        {showImage ? (
          <Image source={{ uri: avatarUrl! }} style={styles.avatarImage} onError={() => setImgError(true)} />
        ) : (
          <Text style={styles.avatarInitials}>{initials}</Text>
        )}
      </TouchableOpacity>
      {isPremium && (
        <View style={styles.crownBadge}>
          <Crown size={9} color="#ffffff" />
        </View>
      )}
    </View>
  );
}

export const AvatarCircle = React.memo(AvatarCircleComponent);

const styles = StyleSheet.create({
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 36, height: 36, borderRadius: 18 },
  avatarInitials: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
  crownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});
