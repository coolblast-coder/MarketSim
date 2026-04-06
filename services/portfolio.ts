// Portfolio management — buy/sell execution, P&L calculations
import {
  getBalance,
  updateBalance,
  getPosition,
  updatePosition,
  addTransaction,
  Position,
} from './storage';
import { StockQuote } from './finnhub';

export interface TradeResult {
  success: boolean;
  message: string;
  newBalance?: number;
}

export interface PortfolioSummary {
  totalValue: number;      // Cash + holdings at current prices
  cashBalance: number;
  holdingsValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalCost: number;
}

export interface PositionWithPnL extends Position {
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
}

// --- Trade Execution ---

export async function executeBuy(
  symbol: string,
  shares: number,
  pricePerShare: number
): Promise<TradeResult> {
  const totalCost = Math.round(shares * pricePerShare * 100) / 100;
  const balance = await getBalance();

  if (totalCost > balance) {
    return {
      success: false,
      message: `Insufficient funds. Need $${totalCost.toFixed(2)} but only have $${balance.toFixed(2)}.`,
    };
  }

  if (shares <= 0) {
    return { success: false, message: 'Invalid number of shares.' };
  }

  // Update balance
  const newBalance = await updateBalance(-totalCost);

  // Update position (average cost basis)
  const existing = await getPosition(symbol);
  if (existing) {
    const totalShares = existing.shares + shares;
    const totalSpent = existing.shares * existing.avgCost + totalCost;
    const newAvgCost = Math.round((totalSpent / totalShares) * 100) / 100;
    await updatePosition(symbol, totalShares, newAvgCost);
  } else {
    await updatePosition(symbol, shares, pricePerShare);
  }

  // Log transaction
  await addTransaction({
    type: 'BUY',
    symbol,
    shares,
    price: pricePerShare,
    total: totalCost,
  });

  return {
    success: true,
    message: `Bought ${shares} share${shares > 1 ? 's' : ''} of ${symbol} at $${pricePerShare.toFixed(2)}`,
    newBalance,
  };
}

export async function executeSell(
  symbol: string,
  shares: number,
  pricePerShare: number
): Promise<TradeResult> {
  const existing = await getPosition(symbol);

  if (!existing || existing.shares < shares) {
    return {
      success: false,
      message: `Insufficient shares. You own ${existing?.shares || 0} shares of ${symbol}.`,
    };
  }

  if (shares <= 0) {
    return { success: false, message: 'Invalid number of shares.' };
  }

  const totalRevenue = Math.round(shares * pricePerShare * 100) / 100;

  // Update balance
  const newBalance = await updateBalance(totalRevenue);

  // Update position
  const remainingShares = existing.shares - shares;
  await updatePosition(symbol, remainingShares, existing.avgCost);

  // Log transaction
  await addTransaction({
    type: 'SELL',
    symbol,
    shares,
    price: pricePerShare,
    total: totalRevenue,
  });

  return {
    success: true,
    message: `Sold ${shares} share${shares > 1 ? 's' : ''} of ${symbol} at $${pricePerShare.toFixed(2)}`,
    newBalance,
  };
}

// --- P&L Calculations ---

export function calculatePositionPnL(
  position: Position,
  currentPrice: number
): PositionWithPnL {
  const marketValue = Math.round(position.shares * currentPrice * 100) / 100;
  const costBasis = Math.round(position.shares * position.avgCost * 100) / 100;
  const pnl = Math.round((marketValue - costBasis) * 100) / 100;
  const pnlPercent = costBasis > 0
    ? Math.round(((marketValue - costBasis) / costBasis) * 10000) / 100
    : 0;

  return {
    ...position,
    currentPrice,
    marketValue,
    pnl,
    pnlPercent,
  };
}

export function calculatePortfolioSummary(
  cashBalance: number,
  positions: Position[],
  currentPrices: Record<string, number>
): PortfolioSummary {
  let holdingsValue = 0;
  let totalCost = 0;

  positions.forEach(pos => {
    const price = currentPrices[pos.symbol] || pos.avgCost;
    holdingsValue += pos.shares * price;
    totalCost += pos.shares * pos.avgCost;
  });

  holdingsValue = Math.round(holdingsValue * 100) / 100;
  totalCost = Math.round(totalCost * 100) / 100;
  const totalPnL = Math.round((holdingsValue - totalCost) * 100) / 100;
  const totalPnLPercent = totalCost > 0
    ? Math.round(((holdingsValue - totalCost) / totalCost) * 10000) / 100
    : 0;

  return {
    totalValue: Math.round((cashBalance + holdingsValue) * 100) / 100,
    cashBalance,
    holdingsValue,
    totalPnL,
    totalPnLPercent,
    totalCost,
  };
}
