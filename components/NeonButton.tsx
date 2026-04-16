import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Shadows } from '../constants/theme';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
}

export default function NeonButton({
  title,
  onPress,
  color = Colors.neonCyan,
  style,
  disabled = false,
  variant = 'filled',
}: NeonButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const isFilled = variant === 'filled';

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.button,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.4 : 1,
            ...Shadows.neonCyan,
            shadowColor: color,
          },
          isFilled
            ? {}
            : {
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderColor: color,
              },
          style,
        ]}
      >
        {isFilled ? (
          <LinearGradient
            colors={[color, adjustBrightness(color, -30)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
          />
        ) : null}
        <Text
          style={[
            styles.text,
            { color: isFilled ? Colors.bgPrimary : color },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
