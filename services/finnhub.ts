// Finnhub API Service — Real-time stock data
// Sign up at https://finnhub.io/ for a free API key

const API_KEY = 'd76ot29r01qtg3nee000d76ot29r01qtg3nee00g'; // Replace with your Finnhub API key
const BASE_URL = 'https://finnhub.io/api/v1';

export interface StockQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface SymbolSearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface StockCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps
  v: number[]; // Volumes
  s: string;   // Status
}

// Time range configurations for chart
export type TimeRangeKey = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'MAX';

export interface TimeRangeConfig {
  label: string;
  resolution: string;   // Finnhub resolution: 1, 5, 15, 30, 60, D, W, M
  daysBack: number;     // How many days of data to fetch
}

export const TIME_RANGES: Record<TimeRangeKey, TimeRangeConfig> = {
  '1D':  { label: '1D',  resolution: '5',  daysBack: 1 },
  '1W':  { label: '1W',  resolution: '30', daysBack: 7 },
  '1M':  { label: '1M',  resolution: 'D',  daysBack: 30 },
  '3M':  { label: '3M',  resolution: 'D',  daysBack: 90 },
  '6M':  { label: '6M',  resolution: 'D',  daysBack: 180 },
  'YTD': { label: 'YTD', resolution: 'D',  daysBack: Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000) },
  '1Y':  { label: '1Y',  resolution: 'D',  daysBack: 365 },
  '5Y':  { label: '5Y',  resolution: 'W',  daysBack: 1825 },
  'MAX': { label: 'Max', resolution: 'M',  daysBack: 7300 },
};

// Popular stocks watchlist
export const WATCHLIST_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'DIS', name: 'Walt Disney Co.' },
  { symbol: 'PYPL', name: 'PayPal Holdings' },
  { symbol: 'INTC', name: 'Intel Corp.' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'UBER', name: 'Uber Technologies' },
  { symbol: 'COIN', name: 'Coinbase Global' },
];

// Rate limiter: Finnhub free tier = 60 calls/min
let callTimestamps: number[] = [];
const MAX_CALLS_PER_MIN = 60;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  callTimestamps = callTimestamps.filter(t => now - t < 60000);
  
  if (callTimestamps.length >= MAX_CALLS_PER_MIN) {
    const waitTime = 60000 - (now - callTimestamps[0]);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  callTimestamps.push(Date.now());
  return fetch(url);
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`
    );
    const data = await response.json();
    
    // If API returns empty/zero data (demo key limitation), generate realistic mock data
    if (!data.c || data.c === 0) {
      return generateMockQuote(symbol);
    }
    
    return data;
  } catch (error) {
    console.warn(`Failed to fetch quote for ${symbol}, using mock data`);
    return generateMockQuote(symbol);
  }
}

export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/search?q=${query}&token=${API_KEY}`
    );
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.warn('Symbol search failed:', error);
    return [];
  }
}

export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number = Math.floor(Date.now() / 1000) - 30 * 86400,
  to: number = Math.floor(Date.now() / 1000),
  currentPrice: number | null = null
): Promise<StockCandle> {
  const daysBack = Math.round((to - from) / 86400);
  try {
    const response = await rateLimitedFetch(
      `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${API_KEY}`
    );
    const data = await response.json();
    
    if (data.s === 'no_data' || !data.c) {
      return generateMockCandles(symbol, daysBack, resolution, currentPrice);
    }
    
    return data;
  } catch (error) {
    console.warn(`Failed to fetch candles for ${symbol}, using mock data`);
    return generateMockCandles(symbol, daysBack, resolution, currentPrice);
  }
}

// Helper to get candles for a specific time range key
export async function getCandlesForRange(
  symbol: string,
  rangeKey: TimeRangeKey,
  currentPrice: number | null = null
): Promise<StockCandle> {
  const config = TIME_RANGES[rangeKey];
  const to = Math.floor(Date.now() / 1000);
  const from = to - config.daysBack * 86400;
  return getCandles(symbol, config.resolution, from, to, currentPrice);
}

// Batch fetch quotes for multiple symbols
export async function getBatchQuotes(
  symbols: string[]
): Promise<Record<string, StockQuote>> {
  const quotes: Record<string, StockQuote> = {};
  
  // Fetch in batches of 5 to avoid rate limiting
  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5);
    const results = await Promise.all(batch.map(s => getQuote(s)));
    batch.forEach((symbol, idx) => {
      quotes[symbol] = results[idx];
    });
    
    // Small delay between batches
    if (i + 5 < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return quotes;
}

// --- Mock data generators for demo/sandbox mode ---

const MOCK_PRICES: Record<string, number> = {
  AAPL: 227.48, GOOGL: 176.32, MSFT: 430.15, AMZN: 201.87,
  TSLA: 271.34, NVDA: 136.41, META: 593.72, NFLX: 1012.55,
  AMD: 162.18, DIS: 112.44, PYPL: 72.36, INTC: 24.18,
  CRM: 327.65, UBER: 79.22, COIN: 261.45,
};

function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateMockQuote(symbol: string): StockQuote {
  const basePrice = MOCK_PRICES[symbol] || 100 + symbol.length * 10;
  const seed = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
  const changePercent = (pseudoRandom(seed) - 0.48) * 6; // Deterministic daily change
  const change = basePrice * (changePercent / 100);
  const current = basePrice + change;
  
  return {
    c: Math.round(current * 100) / 100,
    d: Math.round(change * 100) / 100,
    dp: Math.round(changePercent * 100) / 100,
    h: Math.round((current * 1.02) * 100) / 100,
    l: Math.round((current * 0.98) * 100) / 100,
    o: Math.round(basePrice * 100) / 100,
    pc: Math.round(basePrice * 100) / 100,
    t: Math.floor(Date.now() / 1000),
  };
}

function generateMockCandles(symbol: string, daysBack: number = 30, resolution: string = 'D', currentPrice: number | null = null): StockCandle {
  const basePrice = currentPrice !== null ? currentPrice : (MOCK_PRICES[symbol] || 150);
  // Calculate number of data points based on resolution
  let dataPoints: number;
  let intervalSeconds: number;
  switch (resolution) {
    case '1':  dataPoints = Math.min(daysBack * 390, 390); intervalSeconds = 60; break;
    case '5':  dataPoints = Math.min(daysBack * 78, 78); intervalSeconds = 300; break;
    case '15': dataPoints = Math.min(daysBack * 26, 78); intervalSeconds = 900; break;
    case '30': dataPoints = Math.min(daysBack * 13, 91); intervalSeconds = 1800; break;
    case '60': dataPoints = Math.min(daysBack * 7, 168); intervalSeconds = 3600; break;
    case 'W':  dataPoints = Math.ceil(daysBack / 7); intervalSeconds = 604800; break;
    case 'M':  dataPoints = Math.ceil(daysBack / 30); intervalSeconds = 2592000; break;
    default:   dataPoints = daysBack; intervalSeconds = 86400; break; // 'D'
  }
  dataPoints = Math.max(dataPoints, 10);

  const c: number[] = [];
  const h: number[] = [];
  const l: number[] = [];
  const o: number[] = [];
  const t: number[] = [];
  const v: number[] = [];
  
  // Start price further back for longer ranges
  let seed = symbol.charCodeAt(0) + daysBack;
  const volatility = resolution === '5' || resolution === '1' ? 0.005 : 0.02;
  let price = basePrice * (0.85 + pseudoRandom(seed++) * 0.1);
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = 0; i < dataPoints; i++) {
    const r1 = pseudoRandom(seed++);
    const r2 = pseudoRandom(seed++);
    const r3 = pseudoRandom(seed++);
    
    // Create trends using a sine wave component overlaid with noise
    const trend = Math.sin(i * 0.2 + seed) * 0.005;
    const change = (r1 - 0.47 + trend) * price * volatility;
    
    const open = price;
    price += change;
    const close = price;
    const high = Math.max(open, close) * (1 + r2 * 0.01);
    const low = Math.min(open, close) * (1 - r3 * 0.01);
    
    o.push(Math.round(open * 100) / 100);
    c.push(Math.round(close * 100) / 100);
    h.push(Math.round(high * 100) / 100);
    l.push(Math.round(low * 100) / 100);
    t.push(now - (dataPoints - 1 - i) * intervalSeconds);
    v.push(Math.floor(pseudoRandom(seed++) * 50000000 + 10000000));
  }
  
  return { c, h, l, o, t, v, s: 'ok' };
}
