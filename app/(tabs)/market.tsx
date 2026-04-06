import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import StockCard from '../../components/StockCard';
import {
  WATCHLIST_SYMBOLS,
  getBatchQuotes,
  searchSymbol,
  StockQuote,
  SymbolSearchResult,
} from '../../services/finnhub';
import { getPositions, Position } from '../../services/storage';

export default function MarketScreen() {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const symbols = WATCHLIST_SYMBOLS.map(s => s.symbol);
      const [q, pos] = await Promise.all([
        getBatchQuotes(symbols),
        getPositions(),
      ]);
      setQuotes(q);
      setPositions(pos);
    } catch (err) {
      console.warn('Market load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();

      // Auto-refresh every 15s
      refreshTimer.current = setInterval(loadData, 15000);
      return () => {
        if (refreshTimer.current) clearInterval(refreshTimer.current);
      };
    }, [loadData])
  );

  // Search debounce
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchSymbol(query);
      setSearchResults(
        results.filter(r => r.type === 'Common Stock').slice(0, 10)
      );
      setSearching(false);
    }, 400);
  };

  const getOwned = (symbol: string): number => {
    const pos = positions.find(p => p.symbol === symbol);
    return pos?.shares || 0;
  };

  const renderWatchlistItem = ({ item }: { item: typeof WATCHLIST_SYMBOLS[0] }) => {
    const quote = quotes[item.symbol];
    if (!quote) return null;

    return (
      <StockCard
        symbol={item.symbol}
        name={item.name}
        price={quote.c}
        change={quote.d}
        changePercent={quote.dp}
        owned={getOwned(item.symbol)}
        onPress={() => router.push(`/stock/${item.symbol}`)}
      />
    );
  };

  const renderSearchResult = ({ item }: { item: SymbolSearchResult }) => {
    const quote = quotes[item.symbol];
    return (
      <StockCard
        symbol={item.symbol}
        name={item.description}
        price={quote?.c || 0}
        change={quote?.d || 0}
        changePercent={quote?.dp || 0}
        owned={getOwned(item.symbol)}
        onPress={() => router.push(`/stock/${item.symbol}`)}
      />
    );
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stocks (e.g. AAPL, Tesla)"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <Text
              style={styles.clearButton}
              onPress={() => handleSearch('')}
            >
              ✕
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.neonCyan} />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      ) : isSearching ? (
        <>
          <Text style={styles.sectionTitle}>Search Results</Text>
          {searching ? (
            <ActivityIndicator
              color={Colors.neonCyan}
              style={{ marginTop: 20 }}
            />
          ) : searchResults.length === 0 ? (
            <Text style={styles.noResults}>No stocks found for "{searchQuery}"</Text>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={item => item.symbol}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Popular Stocks</Text>
          <FlatList
            data={WATCHLIST_SYMBOLS}
            renderItem={renderWatchlistItem}
            keyExtractor={item => item.symbol}
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
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  clearButton: {
    fontSize: 16,
    color: Colors.textMuted,
    padding: 4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
  noResults: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSize.md,
  },
});
