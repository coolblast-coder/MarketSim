import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, Shadows } from '../constants/theme';

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  onPress?: () => void;
  owned?: number; // shares owned
}

export default function StockCard({
  symbol,
  name,
  price,
  change,
  changePercent,
  onPress,
  owned,
}: StockCardProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? Colors.positive : Colors.negative;
  const arrow = isPositive ? '▲' : '▼';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.wrapper}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(25, 30, 65, 0.7)', 'rgba(15, 18, 45, 0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.left}>
            <View style={styles.symbolRow}>
              <Text style={styles.symbol}>{symbol}</Text>
              {owned !== undefined && owned > 0 && (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedText}>{owned} shares</Text>
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.price}>${price.toFixed(2)}</Text>
            <View style={[styles.changePill, { backgroundColor: isPositive ? 'rgba(0,255,136,0.12)' : 'rgba(255,71,87,0.12)' }]}>
              <Text style={[styles.changeText, { color: changeColor }]}>
                {arrow} {Math.abs(changePercent).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    overflow: 'hidden',
    ...Shadows.card,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  left: {
    flex: 1,
    marginRight: Spacing.md,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  name: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  changePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  changeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  ownedBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ownedText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.neonCyan,
  },
});
