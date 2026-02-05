export interface Stock {
  id: string;
  symbol: string;
  shares: number;
  avgPrice: number;
  name: string;
}

export interface StockData {
  currentPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
  alerts?: string;
  rsi: number;
  maSignal: 'bullish' | 'bearish' | 'neutral';
  priceInDayRange?: number;
  financials?: Financials;
  technical?: TechnicalSignals;
}

export interface Financials {
  revenue: number | null;
  revenueGrowthYoY: string | null;
  revenueGrowthQoQ: string | null;
  grossMargin: string | null;
  operatingMargin: string | null;
}

export interface TechnicalSignals {
  trend: 'uptrend' | 'downtrend' | 'range-bound' | 'neutral';
  supportLevel: number | null;
  resistanceLevel: number | null;
  patternAlerts: string[];
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Metrics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalValueDailyChange: number;
  totalValueDailyChangePercent: number;
  costBasisDailyChange: number;
  costBasisDailyChangePercent: number;
  plDailyChange: number;
  plDailyChangePercent: number;
  returnDailyChangePercent: number;
}

export interface NewStock {
  symbol: string;
  shares: string;
  avgPrice: string;
}

export interface EditForm {
  id?: string | null;
  symbol: string;
  shares: string;
  avgPrice: string;
  name: string;
}

export interface ChartModal {
  isOpen: boolean;
  symbol: string;
  name: string;
}
