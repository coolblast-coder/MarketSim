import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import GlassCard from '../../components/GlassCard';
import NeonButton from '../../components/NeonButton';
import {
  getUserProfile,
  getBalance,
  getTransactions,
  getPositions,
  resetAllData,
  logout,
  updateBalance,
  UserProfile,
} from '../../services/storage';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [posCount, setPosCount] = useState(0);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    const [p, bal, txs, positions] = await Promise.all([
      getUserProfile(),
      getBalance(),
      getTransactions(),
      getPositions(),
    ]);
    setProfile(p);
    setBalance(bal);
    setTradeCount(txs.length);
    setPosCount(positions.length);
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getMemberSince(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!isNaN(amount) && amount > 0) {
      const newBalance = await updateBalance(amount);
      setBalance(newBalance);
      setDepositAmount('');
      setIsDepositing(false);
      if (Platform.OS !== 'web') {
        Alert.alert('✅ Funds Added', `$${amount.toLocaleString()} was added to your account.`);
      } else {
        window.alert(`✅ $${amount.toLocaleString()} was added to your account.`);
      }
    } else {
      if (Platform.OS !== 'web') Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      else window.alert('Invalid Amount: Please enter a valid deposit amount.');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      await logout();
      router.replace('/login');
    } else {
      Alert.alert(
        'Log Out',
        'You will need to log in again. Your data will be preserved.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            onPress: async () => {
              await logout();
              router.replace('/login');
            },
          },
        ]
      );
    }
  };

  const handleReset = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('⚠️ This will permanently delete ALL your data: balance, positions, and trade history. This cannot be undone.\n\nAre you sure you want to reset everything?')) {
        await resetAllData();
        router.replace('/login');
      }
    } else {
      Alert.alert(
        '⚠️ Reset Account',
        'This will permanently delete ALL your data: balance, positions, and trade history. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset Everything',
            style: 'destructive',
            onPress: async () => {
              await resetAllData();
              router.replace('/login');
            },
          },
        ]
      );
    }
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.bgPrimary]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: profile.avatarColor },
            ]}
          >
            <Text style={styles.avatarText}>
              {getInitials(profile.username)}
            </Text>
          </View>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.memberSince}>
            Member since {getMemberSince(profile.createdAt)}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.statLabel}>Cash Balance</Text>
            
            {isDepositing ? (
              <View style={{ width: '100%', marginTop: 12 }}>
                <TextInput
                  style={{ backgroundColor: Colors.bgInput, color: Colors.textPrimary, padding: 8, borderRadius: 8, textAlign: 'center', marginBottom: 8 }}
                  placeholder="Enter Amount"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <NeonButton title="Cancel" variant="outline" color={Colors.textMuted} style={{ flex: 1, height: 35 }} onPress={() => setIsDepositing(false)} />
                  <NeonButton title="Add" color={Colors.neonGreen} style={{ flex: 1, height: 35 }} onPress={handleDeposit} />
                </View>
              </View>
            ) : (
              <NeonButton 
                title="+ Deposit Funds" 
                variant="outline" 
                color={Colors.neonCyan} 
                style={{ marginTop: 12, width: '100%', height: 35 }} 
                onPress={() => setIsDepositing(true)} 
              />
            )}
          </GlassCard>
        </View>
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCardHalf}>
            <Text style={styles.statValue}>{tradeCount}</Text>
            <Text style={styles.statLabel}>Total Trades</Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <Text style={styles.statValue}>{posCount}</Text>
            <Text style={styles.statLabel}>Open Positions</Text>
          </GlassCard>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <NeonButton
            title="Log Out"
            onPress={handleLogout}
            variant="outline"
            color={Colors.textSecondary}
            style={styles.actionButton}
          />
          <NeonButton
            title="🗑️ Reset Account"
            onPress={handleReset}
            variant="outline"
            color={Colors.negative}
            style={styles.actionButton}
          />
        </View>

        <Text style={styles.version}>MarketSim v1.0 • Day Trading Simulator</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.bgPrimary,
  },
  username: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  memberSince: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statCardHalf: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  version: {
    marginTop: Spacing.xl,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
