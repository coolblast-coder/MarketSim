import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { Colors, FontSize, Spacing, Shadows } from '../../constants/theme';
import GlassCard from '../../components/GlassCard';
import AnimatedNumber from '../../components/AnimatedNumber';
import { getBalance, getPositions, Position } from '../../services/storage';
import {
  getBatchQuotes,
  StockQuote,
  WATCHLIST_SYMBOLS,
} from '../../services/finnhub';
import {
  calculatePortfolioSummary,
  calculatePositionPnL,
  PositionWithPnL,
} from '../../services/portfolio';

export default function PortfolioScreen() {
  const [cashBalance, setCashBalance] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [bal, pos] = await Promise.all([getBalance(), getPositions()]);
      setCashBalance(bal);
      setPositions(pos);

      if (pos.length > 0) {
        const symbols = pos.map(p => p.symbol);
        const q = await getBatchQuotes(symbols);
        setQuotes(q);
      }
    } catch (err) {
      console.warn('Portfolio load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate prices map and summary
  const pricesMap: Record<string, number> = {};
  Object.entries(quotes).forEach(([symbol, q]) => {
    pricesMap[symbol] = q.c;
  });

  const summary = calculatePortfolioSummary(cashBalance, positions, pricesMap);

  // Build positions with P&L
  const positionsWithPnL: PositionWithPnL[] = positions.map(pos => {
    const price = pricesMap[pos.symbol] || pos.avgCost;
    return calculatePositionPnL(pos, price);
  });

  const isPnLPositive = summary.totalPnL >= 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.neonCyan}
          />
        }
      >
        {/* Total Value Card */}
        <GlassCard neonBorder style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Account Value</Text>
          <AnimatedNumber
            value={summary.totalValue}
            prefix="$"
            style={styles.heroValue}
            decimals={2}
          />
          <View style={styles.pnlRow}>
            <View
              style={[
                styles.pnlPill,
                {
                  backgroundColor: isPnLPositive
                    ? 'rgba(0,255,136,0.12)'
                    : 'rgba(255,71,87,0.12)',
                },
              ]}
            >
              <Text
                style={[
                  styles.pnlText,
                  { color: isPnLPositive ? Colors.positive : Colors.negative },
                ]}
              >
                {isPnLPositive ? '▲' : '▼'} ${Math.abs(summary.totalPnL).toFixed(2)} (
                {Math.abs(summary.totalPnLPercent).toFixed(2)}%)
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Cash & Holdings Row */}
        <View style={styles.row}>
          <GlassCard style={styles.halfCard}>
            <Text style={styles.statLabel}>💰 Cash</Text>
            <Text style={styles.statValue}>
              ${cashBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </GlassCard>
          <GlassCard style={styles.halfCard}>
            <Text style={styles.statLabel}>📊 Holdings</Text>
            <Text style={styles.statValue}>
              ${summary.holdingsValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </GlassCard>
        </View>

        {/* Holdings List */}
        <Text style={styles.sectionTitle}>Your Positions</Text>
        {positionsWithPnL.length === 0 ? (
          <GlassCard>
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No positions yet</Text>
              <Text style={styles.emptySub}>
                Head to the Market tab to start trading!
              </Text>
            </View>
          </GlassCard>
        ) : (
          positionsWithPnL.map(pos => (
            <TouchableOpacity
              key={pos.symbol}
              onPress={() => router.push(`/stock/${pos.symbol}`)}
              activeOpacity={0.7}
            >
              <GlassCard style={styles.positionCard}>
                <View style={styles.posTop}>
                  <View>
                    <Text style={styles.posSymbol}>{pos.symbol}</Text>
                    <Text style={styles.posShares}>
                      {pos.shares} share{pos.shares !== 1 ? 's' : ''} • Avg ${pos.avgCost.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.posRight}>
                    <Text style={styles.posValue}>
                      ${pos.marketValue.toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.posPnL,
                        {
                          color:
                            pos.pnl >= 0 ? Colors.positive : Colors.negative,
                        },
                      ]}
                    >
                      {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} (
                      {pos.pnlPercent.toFixed(2)}%)
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    marginBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pnlRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  pnlPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pnlText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  halfCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  positionCard: {
    marginBottom: Spacing.sm,
  },
  posTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  posSymbol: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  posShares: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  posRight: {
    alignItems: 'flex-end',
  },
  posValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  posPnL: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
