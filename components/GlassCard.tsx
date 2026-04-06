import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Glass, Shadows } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  neonBorder?: boolean;
  neonColor?: string;
}

export default function GlassCard({
  children,
  style,
  neonBorder = false,
  neonColor = Colors.neonCyan,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.container,
        neonBorder && {
          borderColor: neonColor,
          borderWidth: 1.5,
          ...Shadows.neonCyan,
          shadowColor: neonColor,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(25, 30, 65, 0.7)', 'rgba(15, 18, 45, 0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Glass.borderRadius,
    borderWidth: Glass.borderWidth,
    borderColor: Glass.borderColor,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
});
