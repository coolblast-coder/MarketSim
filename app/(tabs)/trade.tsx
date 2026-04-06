import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import GlassCard from '../../components/GlassCard';
import { getTransactions, Transaction } from '../../services/storage';

export default function TradeHistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  async function loadTransactions() {
    const txs = await getTransactions();
    setTransactions(txs);
  }

  function formatDate(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isBuy = item.type === 'BUY';
    const color = isBuy ? Colors.neonGreen : Colors.negative;
    const icon = isBuy ? '🟢' : '🔴';

    return (
      <GlassCard style={styles.txCard}>
        <View style={styles.txRow}>
          <View style={styles.txLeft}>
            <View style={styles.txHeader}>
              <Text style={styles.txIcon}>{icon}</Text>
              <Text style={[styles.txType, { color }]}>{item.type}</Text>
              <Text style={styles.txSymbol}>{item.symbol}</Text>
            </View>
            <Text style={styles.txDetail}>
              {item.shares} share{item.shares !== 1 ? 's' : ''} @ ${item.price.toFixed(2)}
            </Text>
            <Text style={styles.txDate}>{formatDate(item.timestamp)}</Text>
          </View>
          <View style={styles.txRight}>
            <Text style={[styles.txTotal, { color }]}>
              {isBuy ? '-' : '+'}${item.total.toFixed(2)}
            </Text>
          </View>
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyTitle}>No trades yet</Text>
          <Text style={styles.emptySub}>
            Your buy and sell transactions will appear here
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {transactions.length} trade{transactions.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  txCard: {
    marginBottom: Spacing.sm,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flex: 1,
  },
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txIcon: {
    fontSize: 14,
  },
  txType: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  txSymbol: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  txDetail: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txTotal: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
