// AsyncStorage-based persistence service
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export interface UserProfile {
  username: string;
  avatarColor: string;
  createdAt: string;
}

export interface Position {
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  shares: number;
  price: number;
  total: number;
  timestamp: string;
}

// --- Storage Keys ---

const KEYS = {
  USER_PROFILE: '@marketsim_user',
  BALANCE: '@marketsim_balance',
  POSITIONS: '@marketsim_positions',
  TRANSACTIONS: '@marketsim_transactions',
  IS_LOGGED_IN: '@marketsim_logged_in',
};

// --- Avatar Colors ---

const AVATAR_COLORS = [
  '#00d4ff', '#00ff88', '#ff006e', '#ffbe0b', '#8b5cf6',
  '#06b6d4', '#f43f5e', '#a855f7', '#14b8a6', '#f97316',
];

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// --- User Profile ---

export async function saveUserProfile(username: string): Promise<UserProfile> {
  const profile: UserProfile = {
    username,
    avatarColor: randomAvatarColor(),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  await AsyncStorage.setItem(KEYS.IS_LOGGED_IN, 'true');
  return profile;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return data ? JSON.parse(data) : null;
}

export async function isLoggedIn(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.IS_LOGGED_IN);
  return val === 'true';
}

// --- Balance ---

export async function setBalance(amount: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.BALANCE, amount.toString());
}

export async function getBalance(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.BALANCE);
  return val ? parseFloat(val) : 0;
}

export async function updateBalance(delta: number): Promise<number> {
  const current = await getBalance();
  const newBalance = Math.round((current + delta) * 100) / 100;
  await setBalance(newBalance);
  return newBalance;
}

// --- Positions ---

export async function getPositions(): Promise<Position[]> {
  const data = await AsyncStorage.getItem(KEYS.POSITIONS);
  return data ? JSON.parse(data) : [];
}

export async function savePositions(positions: Position[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions));
}

export async function getPosition(symbol: string): Promise<Position | null> {
  const positions = await getPositions();
  return positions.find(p => p.symbol === symbol) || null;
}

export async function updatePosition(
  symbol: string,
  shares: number,
  avgCost: number
): Promise<void> {
  const positions = await getPositions();
  const idx = positions.findIndex(p => p.symbol === symbol);
  
  if (shares <= 0) {
    // Remove position
    if (idx !== -1) {
      positions.splice(idx, 1);
    }
  } else if (idx !== -1) {
    // Update existing
    positions[idx] = { symbol, shares, avgCost };
  } else {
    // Add new
    positions.push({ symbol, shares, avgCost });
  }
  
  await savePositions(positions);
}

// --- Transactions ---

export async function getTransactions(): Promise<Transaction[]> {
  const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
}

export async function addTransaction(
  tx: Omit<Transaction, 'id' | 'timestamp'>
): Promise<Transaction> {
  const transactions = await getTransactions();
  const newTx: Transaction = {
    ...tx,
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  transactions.unshift(newTx); // Most recent first
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  return newTx;
}

// --- Session Management ---

export async function logout(): Promise<void> {
  await AsyncStorage.setItem(KEYS.IS_LOGGED_IN, 'false');
}

export async function resetAllData(): Promise<void> {
  const keysToRemove = [
    KEYS.USER_PROFILE,
    KEYS.BALANCE,
    KEYS.POSITIONS,
    KEYS.TRANSACTIONS,
    KEYS.IS_LOGGED_IN,
  ];
  await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
}
