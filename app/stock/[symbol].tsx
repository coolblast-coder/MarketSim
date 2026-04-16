import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  Alert,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Colors, FontSize, Spacing, Shadows } from '../../constants/theme';
import GlassCard from '../../components/GlassCard';
import NeonButton from '../../components/NeonButton';
import AnimatedNumber from '../../components/AnimatedNumber';
import { getQuote, getCandles, getCandlesForRange, StockQuote, WATCHLIST_SYMBOLS, TIME_RANGES, TimeRangeKey } from '../../services/finnhub';
import { getBalance, getPosition, Position } from '../../services/storage';
import { executeBuy, executeSell } from '../../services/portfolio';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 180;

// Simple line chart drawn with Views
function MiniChart({ data, timestamps, color }: { data: number[]; timestamps?: number[]; color: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * CHART_WIDTH,
    y: CHART_HEIGHT - ((val - min) / range) * (CHART_HEIGHT - 20) - 10,
  }));

  const handleTouch = (e: any) => {
    let x = e.nativeEvent.locationX;
    if (x < 0) x = 0;
    if (x > CHART_WIDTH) x = CHART_WIDTH;
    const index = Math.round((x / CHART_WIDTH) * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    setHoverIndex(clampedIndex);
  };

  return (
    <View 
      style={styles.chartContainer}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={() => setHoverIndex(null)}
      onResponderTerminate={() => setHoverIndex(null)}
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
        <View
          key={i}
          style={[
            styles.gridLine,
            { top: frac * CHART_HEIGHT },
          ]}
        />
      ))}
      {/* Price labels */}
      <Text style={[styles.priceLabel, { top: 0 }]}>
        ${max.toFixed(0)}
      </Text>
      <Text style={[styles.priceLabel, { top: CHART_HEIGHT - 14 }]}>
        ${min.toFixed(0)}
      </Text>
      {/* Line segments */}
      {points.slice(0, -1).map((point, i) => {
        const next = points[i + 1];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
           <View
             key={i}
             style={{
               position: 'absolute',
               left: point.x,
               top: point.y,
               width: length,
               height: 2,
               backgroundColor: color,
               transform: [{ rotate: `${angle}deg` }],
               transformOrigin: 'left center',
               borderRadius: 1,
               opacity: 0.9,
             }}
           />
        );
      })}
      
      {/* Dot at last point or hovered point */}
      {hoverIndex === null && (
        <View
          style={{
            position: 'absolute',
            left: points[points.length - 1].x - 4,
            top: points[points.length - 1].y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            ...Shadows.neonCyan,
            shadowColor: color,
          }}
        />
      )}

      {/* Scrubber overlay */}
      {hoverIndex !== null && (
        <>
          <View style={{
            position: 'absolute',
            left: points[hoverIndex].x,
            top: -30,
            bottom: 0,
            width: 1,
            backgroundColor: 'rgba(255,255,255,0.4)',
          }} />
          <View style={{
            position: 'absolute',
            left: points[hoverIndex].x - 5,
            top: points[hoverIndex].y - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#fff',
            ...Shadows.neonCyan,
            shadowColor: '#fff',
          }} />
          <View style={{
            position: 'absolute',
            left: Math.max(0, Math.min(CHART_WIDTH - 80, points[hoverIndex].x - 40)),
            top: -40,
            backgroundColor: 'rgba(20,20,25,0.95)',
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: 6,
            alignItems: 'center',
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1,
            zIndex: 10,
          }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
              ${data[hoverIndex].toFixed(2)}
            </Text>
            {timestamps && timestamps[hoverIndex] && (
              <Text style={{ color: '#bbb', fontSize: 10 }}>
                {new Date(timestamps[hoverIndex] * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candleData, setCandleData] = useState<{prices: number[], timestamps: number[]} | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [balance, setBalanceState] = useState(0);
  const [shares, setShares] = useState('1');
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>('1M');
  const [chartLoading, setChartLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const stockInfo = WATCHLIST_SYMBOLS.find(s => s.symbol === symbol);

  const loadData = useCallback(async () => {
    if (!symbol) return;
    try {
      const [q, pos, bal] = await Promise.all([
        getQuote(symbol),
        getPosition(symbol),
        getBalance(),
      ]);
      setQuote(q);
      const c = await getCandlesForRange(symbol, selectedRange, q?.c);
      if (c && c.c) setCandleData({ prices: c.c, timestamps: c.t });
      setPosition(pos);
      setBalanceState(bal);
    } catch (err) {
      console.warn('Stock detail load error:', err);
    }
  }, [symbol, selectedRange]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRangeChange = async (range: TimeRangeKey) => {
    setSelectedRange(range);
    setChartLoading(true);
    try {
      const c = await getCandlesForRange(symbol!, range, quote?.c);
      if (c && c.c) setCandleData({ prices: c.c, timestamps: c.t });
    } catch (err) {
      console.warn('Chart range load error:', err);
    } finally {
      setChartLoading(false);
    }
  };

  const sharesNum = parseInt(shares) || 0;
  const price = quote?.c || 0;
  const estimatedTotal = Math.round(sharesNum * price * 100) / 100;
  const isPositive = (quote?.d || 0) >= 0;
  const changeColor = isPositive ? Colors.positive : Colors.negative;

  const executeTrade = async () => {
    setLoading(true);

    const result = mode === 'BUY'
      ? await executeBuy(symbol!, sharesNum, price)
      : await executeSell(symbol!, sharesNum, price);

    setLoading(false);
    setConfirmModalVisible(false);

    if (result.success) {
      router.push('/(tabs)/');
    } else {
      Alert.alert('❌ Trade Failed', result.message);
    }
  };

  const handleTrade = () => {
    if (sharesNum <= 0) {
      Alert.alert('Invalid', 'Enter a valid number of shares');
      return;
    }
    setConfirmModalVisible(true);
  };

  if (!quote) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.bgPrimary]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingText}>Loading {symbol}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.symbol}>{symbol}</Text>
            <Text style={styles.name}>{stockInfo?.name || symbol}</Text>
          </View>
          <View style={styles.priceArea}>
            <AnimatedNumber
              value={price}
              prefix="$"
              style={styles.currentPrice}
            />
            <View
              style={[
                styles.changePill,
                {
                  backgroundColor: isPositive
                    ? 'rgba(0,255,136,0.12)'
                    : 'rgba(255,71,87,0.12)',
                },
              ]}
            >
              <Text style={[styles.changeText, { color: changeColor }]}>
                {isPositive ? '▲' : '▼'} ${Math.abs(quote.d).toFixed(2)} (
                {Math.abs(quote.dp).toFixed(2)}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <GlassCard style={styles.chartCard}>
          {/* Range Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.rangeScrollView}
            contentContainerStyle={styles.rangeRow}
          >
            {(Object.keys(TIME_RANGES) as TimeRangeKey[]).map(key => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.rangeBtn,
                  selectedRange === key && styles.rangeBtnActive,
                ]}
                onPress={() => handleRangeChange(key)}
              >
                <Text
                  style={[
                    styles.rangeBtnText,
                    selectedRange === key && styles.rangeBtnTextActive,
                  ]}
                >
                  {TIME_RANGES[key].label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {chartLoading ? (
            <View style={[styles.chartContainer, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.loadingText}>Loading chart...</Text>
            </View>
          ) : (
            <MiniChart data={candleData?.prices || []} timestamps={candleData?.timestamps} color={changeColor} />
          )}
        </GlassCard>

        {/* Day Stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Open</Text>
            <Text style={styles.statValue}>${quote.o.toFixed(2)}</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>High</Text>
            <Text style={[styles.statValue, { color: Colors.positive }]}>${quote.h.toFixed(2)}</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Low</Text>
            <Text style={[styles.statValue, { color: Colors.negative }]}>${quote.l.toFixed(2)}</Text>
          </GlassCard>
        </View>

        {/* Current Position */}
        {position && position.shares > 0 && (
          <GlassCard neonBorder neonColor={Colors.neonPurple} style={styles.posCard}>
            <Text style={styles.posTitle}>📊 Your Position</Text>
            <View style={styles.posRow}>
              <View>
                <Text style={styles.posLabel}>Shares</Text>
                <Text style={styles.posValue}>{position.shares}</Text>
              </View>
              <View>
                <Text style={styles.posLabel}>Avg Cost</Text>
                <Text style={styles.posValue}>${position.avgCost.toFixed(2)}</Text>
              </View>
              <View>
                <Text style={styles.posLabel}>Mkt Value</Text>
                <Text style={styles.posValue}>
                  ${(position.shares * price).toFixed(2)}
                </Text>
              </View>
              <View>
                <Text style={styles.posLabel}>P&L</Text>
                <Text
                  style={[
                    styles.posValue,
                    {
                      color:
                        price >= position.avgCost
                          ? Colors.positive
                          : Colors.negative,
                    },
                  ]}
                >
                  {price >= position.avgCost ? '+' : ''}
                  ${((price - position.avgCost) * position.shares).toFixed(2)}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Trade Panel */}
        <GlassCard neonBorder style={styles.tradeCard}>
          <Text style={styles.tradeTitle}>Place Order</Text>

          {/* Buy/Sell Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                mode === 'BUY' && styles.toggleBuyActive,
              ]}
              onPress={() => setMode('BUY')}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === 'BUY' && styles.toggleTextActive,
                ]}
              >
                BUY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                mode === 'SELL' && styles.toggleSellActive,
              ]}
              onPress={() => setMode('SELL')}
            >
              <Text
                style={[
                  styles.toggleText,
                  mode === 'SELL' && styles.toggleSellTextActive,
                ]}
              >
                SELL
              </Text>
            </TouchableOpacity>
          </View>

          {/* Shares Input */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Shares</Text>
            <TextInput
              style={styles.sharesInput}
              value={shares}
              onChangeText={setShares}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Quick amounts */}
          <View style={styles.quickRow}>
            {['1', '5', '10', '25', '50', '100'].map(val => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.quickBtn,
                  shares === val && styles.quickBtnActive,
                ]}
                onPress={() => setShares(val)}
              >
                <Text
                  style={[
                    styles.quickText,
                    shares === val && styles.quickTextActive,
                  ]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Price per share</Text>
              <Text style={styles.summaryValue}>${price.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Quantity</Text>
              <Text style={styles.summaryValue}>{sharesNum}</Text>
            </View>
            <View style={[styles.summaryLine, styles.totalLine]}>
              <Text style={styles.totalLabel}>
                Estimated {mode === 'BUY' ? 'Cost' : 'Revenue'}
              </Text>
              <Text style={styles.totalValue}>${estimatedTotal.toFixed(2)}</Text>
            </View>
            <Text style={styles.balanceInfo}>
              Available cash: ${balance.toFixed(2)}
              {mode === 'SELL' && position
                ? ` • Owned: ${position.shares} shares`
                : ''}
            </Text>
          </View>

          <NeonButton
            title={
              loading
                ? 'Processing...'
                : `${mode === 'BUY' ? '🟢' : '🔴'} ${mode} ${sharesNum} Share${sharesNum !== 1 ? 's' : ''}`
            }
            onPress={handleTrade}
            disabled={loading || sharesNum <= 0}
            color={mode === 'BUY' ? Colors.neonGreen : Colors.negative}
            style={{ marginTop: Spacing.md }}
          />
        </GlassCard>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard} neonBorder neonColor={mode === 'BUY' ? Colors.neonGreen : Colors.negative}>
            <Text style={styles.modalTitle}>Confirm Trade</Text>
            <Text style={styles.modalText}>
              Are you sure you want to {mode.toLowerCase()} {sharesNum} share(s) of {symbol} for a total of <Text style={{ color: Colors.textPrimary, fontWeight: 'bold' }}>${estimatedTotal.toFixed(2)}</Text>?
            </Text>
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <NeonButton 
                  title="Cancel" 
                  variant="outline" 
                  color={Colors.textSecondary} 
                  onPress={() => setConfirmModalVisible(false)} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <NeonButton 
                  title="Confirm" 
                  color={mode === 'BUY' ? Colors.neonGreen : Colors.negative} 
                  onPress={executeTrade} 
                  disabled={loading}
                />
              </View>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  symbol: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  name: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceArea: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  changePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  changeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  chartCard: {
    marginBottom: Spacing.md,
  },
  rangeScrollView: {
    marginBottom: Spacing.sm,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.bgInput,
  },
  rangeBtnActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.18)',
    borderWidth: 1,
    borderColor: Colors.neonCyan,
  },
  rangeBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  rangeBtnTextActive: {
    color: Colors.neonCyan,
  },
  chartTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartContainer: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  priceLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 10,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  posCard: {
    marginBottom: Spacing.md,
  },
  posTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  posRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  posLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  posValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tradeCard: {
    marginBottom: Spacing.lg,
  },
  tradeTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.bgInput,
    marginBottom: Spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleBuyActive: {
    backgroundColor: 'rgba(0,255,136,0.15)',
  },
  toggleSellActive: {
    backgroundColor: 'rgba(255,71,87,0.15)',
  },
  toggleText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.neonGreen,
  },
  toggleSellTextActive: {
    color: Colors.negative,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.md,
    width: 60,
  },
  sharesInput: {
    flex: 1,
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.bgInput,
  },
  quickBtnActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
  quickText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickTextActive: {
    color: Colors.neonCyan,
  },
  summarySection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderGlass,
    paddingTop: Spacing.md,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderGlass,
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.neonCyan,
  },
  balanceInfo: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
