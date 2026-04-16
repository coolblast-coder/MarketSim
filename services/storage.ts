// Supabase-backed persistence service
// Drop-in replacement for the old AsyncStorage version
import { supabase } from './supabase';

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

// --- Avatar Colors ---

const AVATAR_COLORS = [
  '#00d4ff', '#00ff88', '#ff006e', '#ffbe0b', '#8b5cf6',
  '#06b6d4', '#f43f5e', '#a855f7', '#14b8a6', '#f97316',
];

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// --- Helpers ---

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

// --- User Profile ---

export async function saveUserProfile(username: string): Promise<UserProfile> {
  const userId = await getUserId();
  const avatarColor = randomAvatarColor();

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username,
      avatar_color: avatarColor,
      created_at: new Date().toISOString(),
    });

  if (error) throw error;

  return {
    username,
    avatarColor,
    createdAt: new Date().toISOString(),
  };
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('username, avatar_color, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    username: data.username,
    avatarColor: data.avatar_color,
    createdAt: data.created_at,
  };
}

export async function isLoggedIn(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// --- Balance ---

export async function setBalance(amount: number): Promise<void> {
  const userId = await getUserId();
  await supabase
    .from('balances')
    .upsert({ id: userId, amount });
}

export async function getBalance(): Promise<number> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('balances')
    .select('amount')
    .eq('id', userId)
    .single();

  if (error || !data) return 0;
  return Number(data.amount);
}

export async function updateBalance(delta: number): Promise<number> {
  const current = await getBalance();
  const newBalance = Math.round((current + delta) * 100) / 100;
  await setBalance(newBalance);
  return newBalance;
}

// --- Positions ---

export async function getPositions(): Promise<Position[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('positions')
    .select('symbol, shares, avg_cost')
    .eq('user_id', userId);

  if (error || !data) return [];

  return data.map(row => ({
    symbol: row.symbol,
    shares: Number(row.shares),
    avgCost: Number(row.avg_cost),
  }));
}

export async function savePositions(positions: Position[]): Promise<void> {
  const userId = await getUserId();

  // Delete all current positions, then insert the new set
  await supabase
    .from('positions')
    .delete()
    .eq('user_id', userId);

  if (positions.length > 0) {
    const rows = positions.map(p => ({
      user_id: userId,
      symbol: p.symbol,
      shares: p.shares,
      avg_cost: p.avgCost,
    }));
    await supabase.from('positions').insert(rows);
  }
}

export async function getPosition(symbol: string): Promise<Position | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('positions')
    .select('symbol, shares, avg_cost')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .single();

  if (error || !data) return null;

  return {
    symbol: data.symbol,
    shares: Number(data.shares),
    avgCost: Number(data.avg_cost),
  };
}

export async function updatePosition(
  symbol: string,
  shares: number,
  avgCost: number
): Promise<void> {
  const userId = await getUserId();

  if (shares <= 0) {
    // Remove position
    await supabase
      .from('positions')
      .delete()
      .eq('user_id', userId)
      .eq('symbol', symbol);
  } else {
    // Upsert position
    await supabase
      .from('positions')
      .upsert(
        { user_id: userId, symbol, shares, avg_cost: avgCost },
        { onConflict: 'user_id,symbol' }
      );
  }
}

// --- Transactions ---

export async function getTransactions(): Promise<Transaction[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, symbol, shares, price, total, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(row => ({
    id: String(row.id),
    type: row.type as 'BUY' | 'SELL',
    symbol: row.symbol,
    shares: Number(row.shares),
    price: Number(row.price),
    total: Number(row.total),
    timestamp: row.created_at,
  }));
}

export async function addTransaction(
  tx: Omit<Transaction, 'id' | 'timestamp'>
): Promise<Transaction> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: tx.type,
      symbol: tx.symbol,
      shares: tx.shares,
      price: tx.price,
      total: tx.total,
    })
    .select('id, type, symbol, shares, price, total, created_at')
    .single();

  if (error || !data) throw error || new Error('Failed to insert transaction');

  return {
    id: String(data.id),
    type: data.type as 'BUY' | 'SELL',
    symbol: data.symbol,
    shares: Number(data.shares),
    price: Number(data.price),
    total: Number(data.total),
    timestamp: data.created_at,
  };
}

// --- Session Management ---

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function resetAllData(): Promise<void> {
  const userId = await getUserId();

  await Promise.all([
    supabase.from('transactions').delete().eq('user_id', userId),
    supabase.from('positions').delete().eq('user_id', userId),
    supabase.from('balances').delete().eq('id', userId),
    supabase.from('profiles').delete().eq('id', userId),
  ]);

  await supabase.auth.signOut();
}
