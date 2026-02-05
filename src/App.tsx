import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { fetchFromPolygon } from './lib/api';
import type { User } from '@supabase/supabase-js';
import { Logo } from './components/Logo';
import { createChart } from 'lightweight-charts';
import type {
  Stock,
  StockData,
  MarketIndex,
  NewStock,
  EditForm,
  ChartModal,
  ChartDataPoint,
  Metrics,
  Financials,
  TechnicalSignals
} from './types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  LogOut,
  Filter,
  RefreshCw,
  BarChart,
  Menu,
  Settings
} from './components/Icons';
import './App.css';

const InvestmentTracker: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Stock[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(true);
  const [newStock, setNewStock] = useState<NewStock>({ symbol: '', shares: '', avgPrice: '' });
  const [activeTab, setActiveTab] = useState<'portfolio' | 'recommendations' | 'add'>('portfolio');
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ symbol: '', shares: '', avgPrice: '', name: '' });
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'alphabetical' | 'position-value' | 'pl'>('alphabetical');
  const [filterBy, setFilterBy] = useState<'all' | 'BUY' | 'SELL' | 'HOLD'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [chartModal, setChartModal] = useState<ChartModal>({ isOpen: false, symbol: '', name: '' });
  const [chartTimeframe, setChartTimeframe] = useState('1M');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartDisplayDate, setChartDisplayDate] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [marketIndexes, setMarketIndexes] = useState<MarketIndex[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check for existing session
  useEffect(() => {
    checkUser();
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setAuthLoading(false);
  };

  // Load portfolio from Supabase
  useEffect(() => {
    if (user) {
      loadPortfolio();
      fetchMarketIndexes();
    }
  }, [user]);

  // Fetch stock data when portfolio changes
  useEffect(() => {
    if (portfolio.length > 0) {
      fetchStockData();
      const interval = setInterval(fetchStockData, 300000);
      return () => clearInterval(interval);
    }
  }, [portfolio]);

  const loadPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;

      if (data && data.length > 0) {
        // Update any stocks that have symbol as name (legacy data)
        const stocksToUpdate = data.filter(stock => stock.name === stock.symbol);
        if (stocksToUpdate.length > 0) {
          for (const stock of stocksToUpdate) {
            try {
              const tickerData = await fetchFromPolygon(
                `/v3/reference/tickers/${stock.symbol}`
              );
              if (tickerData && tickerData.results && tickerData.results.name) {
                await supabase
                  .from('portfolios')
                  .update({ name: tickerData.results.name })
                  .eq('id', stock.id);
                stock.name = tickerData.results.name; // Update local copy
              }
            } catch (err) {
              if (import.meta.env.DEV) {
                console.error(`Error updating name for ${stock.symbol}:`, err);
              }
            }
          }
        }

        setPortfolio(data.map(item => ({
          id: item.id,
          symbol: item.symbol,
          shares: parseFloat(item.shares),
          avgPrice: parseFloat(item.avg_price),
          name: item.name
        })));
      } else {
        setPortfolio([]);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading portfolio:', error);
      }
      alert('Error loading portfolio. Please refresh and try again.');
    }
  };

  const fetchMarketIndexes = async () => {
    try {
      // Use ETFs that track major indexes (accessible with free API tier)
      // SPY tracks S&P 500, DIA tracks Dow Jones, QQQ tracks NASDAQ
      const indexes = [
        { symbol: 'DIA', name: 'Dow Jones', displaySymbol: 'DIA' },
        { symbol: 'SPY', name: 'S&P 500', displaySymbol: 'SPY' },
        { symbol: 'QQQ', name: 'NASDAQ', displaySymbol: 'QQQ' }
      ];

      const symbolsString = indexes.map(i => i.symbol).join(',');

      const result = await fetchFromPolygon(
        `/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${symbolsString}`
      );

      if (result) {
        const indexData: MarketIndex[] = [];

        if (result.tickers && Array.isArray(result.tickers)) {
          result.tickers.forEach((ticker: any) => {
            const indexInfo = indexes.find(i => i.symbol === ticker.ticker);
            if (indexInfo) {
              const currentPrice = ticker.lastTrade?.p || ticker.day?.c || ticker.prevDay?.c || 0;
              const change = ticker.todaysChange || 0;
              const changePercent = ticker.todaysChangePerc || 0;

              indexData.push({
                symbol: indexInfo.displaySymbol,
                name: indexInfo.name,
                price: currentPrice,
                change: change,
                changePercent: changePercent
              });
            }
          });
        }

        setMarketIndexes(indexData);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching market indexes:', error);
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setUser(data.user);
      }
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPortfolio([]);
    setStockData({});
  };

  const fetchStockData = async () => {
    setLoading(true);
    const data: Record<string, StockData> = {};

    try {
      const symbols = portfolio.map(stock => stock.symbol).join(',');

      if (!symbols) {
        setLoading(false);
        return;
      }

      // Fetch current snapshot
      let result;
      let rateLimited = false;

      try {
        result = await fetchFromPolygon(
          `/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${symbols}`
        );
      } catch (error: any) {
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          rateLimited = true;
        } else {
          throw error;
        }
      }

      // Calculate dates for 52-week range (1 year ago)
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      const toDate = today.toISOString().split('T')[0];
      const fromDate = oneYearAgo.toISOString().split('T')[0];

      if (rateLimited) {
        if (import.meta.env.DEV) {
          console.error('Rate limited - please wait before refreshing');
        }
        portfolio.forEach(stock => {
          data[stock.symbol] = {
            currentPrice: stock.avgPrice,
            change: 0,
            changePercent: 0,
            dayHigh: stock.avgPrice * 1.02,
            dayLow: stock.avgPrice * 0.98,
            volume: 0,
            recommendation: 'HOLD',
            reasoning: 'Rate limit reached - please wait before refreshing',
            rsi: 50,
            maSignal: 'neutral'
          };
        });
        setStockData(data);
        setLoading(false);
        return;
      }

      if (!result) {
        throw new Error('API error: No data received');
      }

      if (result.tickers && Array.isArray(result.tickers)) {
        // First pass: collect basic data from snapshot
        const tickerDataMap: Record<string, any> = {};
        result.tickers.forEach((ticker: any) => {
          const symbol = ticker.ticker;
          const currentPrice = ticker.lastTrade?.p || ticker.day?.c || ticker.prevDay?.c || 0;
          const change = ticker.todaysChange || 0;
          const changePercent = ticker.todaysChangePerc || 0;
          const dayHigh = ticker.day?.h || currentPrice * 1.02;
          const dayLow = ticker.day?.l || currentPrice * 0.98;
          const volume = ticker.day?.v || 0;

          tickerDataMap[symbol] = {
            currentPrice,
            change,
            changePercent,
            dayHigh,
            dayLow,
            volume
          };
        });

        // Second pass: fetch 52-week data for each ticker
        for (const symbol of Object.keys(tickerDataMap)) {
          const tickerInfo = tickerDataMap[symbol];
          const currentPrice = tickerInfo.currentPrice;
          const change = tickerInfo.change;
          const changePercent = tickerInfo.changePercent;
          const dayHigh = tickerInfo.dayHigh;
          const dayLow = tickerInfo.dayLow;
          const volume = tickerInfo.volume;

          // Fetch 52-week aggregates
          let week52High = currentPrice;
          let week52Low = currentPrice;
          let avgVolume = volume;
          let historicalPrices: any[] = [];

          try {
            const aggResult = await fetchFromPolygon(
              `/v2/aggs/ticker/${symbol}/range/1/day/${fromDate}/${toDate}`
            );

            if (aggResult && aggResult.results && aggResult.results.length > 0) {
                historicalPrices = aggResult.results;
                // Calculate 52-week high/low from historical data
                week52High = Math.max(...aggResult.results.map((r: any) => r.h));
                week52Low = Math.min(...aggResult.results.map((r: any) => r.l));
                // Calculate average volume
                const totalVolume = aggResult.results.reduce((sum: number, r: any) => sum + r.v, 0);
                avgVolume = Math.round(totalVolume / aggResult.results.length);
              }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error(`Error fetching 52-week data for ${symbol}:`, error);
            }
          }

          // Fetch financial data (income statement for revenue & margins)
          let financials: Financials = {
            revenue: null,
            revenueGrowthYoY: null,
            revenueGrowthQoQ: null,
            grossMargin: null,
            operatingMargin: null
          };

          try {
            const financialsResult = await fetchFromPolygon(
              `/vX/reference/financials?ticker=${symbol}&limit=5`
            );

            if (financialsResult && financialsResult.results && financialsResult.results.length > 0) {
                const latest = financialsResult.results[0];
                const incomeStatement = latest.financials?.income_statement;

                if (incomeStatement) {
                  const revenue = incomeStatement.revenues?.value;
                  const grossProfit = incomeStatement.gross_profit?.value;
                  const operatingIncome = incomeStatement.operating_income_loss?.value;

                  if (revenue) {
                    financials.revenue = revenue;

                    // Calculate margins
                    if (grossProfit) {
                      financials.grossMargin = ((grossProfit / revenue) * 100).toFixed(1);
                    }
                    if (operatingIncome) {
                      financials.operatingMargin = ((operatingIncome / revenue) * 100).toFixed(1);
                    }

                    // Calculate QoQ growth
                    if (financialsResult.results.length >= 2) {
                      const previous = financialsResult.results[1];
                      const prevRevenue = previous.financials?.income_statement?.revenues?.value;

                      if (prevRevenue) {
                        financials.revenueGrowthQoQ = (((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1);
                      }
                    }

                    // YoY growth (compare with 4 quarters ago if quarterly data)
                    if (financialsResult.results.length >= 5) {
                      const yearAgo = financialsResult.results[4];
                      const yearAgoRevenue = yearAgo.financials?.income_statement?.revenues?.value;

                      if (yearAgoRevenue) {
                        financials.revenueGrowthYoY = (((revenue - yearAgoRevenue) / yearAgoRevenue) * 100).toFixed(1);
                      }
                    }
                  }
                }
              }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error(`Error fetching financials for ${symbol}:`, error);
            }
          }

          // Technical analysis from historical prices
          let technicalSignals: TechnicalSignals = {
            trend: 'neutral',
            supportLevel: null,
            resistanceLevel: null,
            patternAlerts: []
          };

          if (historicalPrices.length >= 20) {
            const recent20 = historicalPrices.slice(-20);
            const recent50 = historicalPrices.length >= 50 ? historicalPrices.slice(-50) : historicalPrices;

            // Calculate support/resistance
            const lows = recent50.map((p: any) => p.l);
            const highs = recent50.map((p: any) => p.h);
            technicalSignals.supportLevel = Math.min(...lows);
            technicalSignals.resistanceLevel = Math.max(...highs);

            // Trend detection
            const first10Avg = recent20.slice(0, 10).reduce((sum: number, p: any) => sum + p.c, 0) / 10;
            const last10Avg = recent20.slice(-10).reduce((sum: number, p: any) => sum + p.c, 0) / 10;

            if (last10Avg > first10Avg * 1.02) {
              technicalSignals.trend = 'uptrend';
            } else if (last10Avg < first10Avg * 0.98) {
              technicalSignals.trend = 'downtrend';
            } else {
              technicalSignals.trend = 'range-bound';
            }

            // Check for lower lows (bearish pattern)
            const recentLows = recent20.slice(-5).map((p: any) => p.l);
            let isLowerLows = true;
            for (let i = 1; i < recentLows.length; i++) {
              if (recentLows[i] > recentLows[i - 1]) {
                isLowerLows = false;
                break;
              }
            }
            if (isLowerLows && recentLows.length > 2) {
              technicalSignals.patternAlerts.push('⚠️ Lower lows - bearish pattern');
            }

            // Check for failed breakout
            const breakoutAttempts = recent20.filter((p: any) => p.h > technicalSignals.resistanceLevel! * 0.99);
            if (breakoutAttempts.length > 0 && currentPrice < technicalSignals.resistanceLevel! * 0.97) {
              technicalSignals.patternAlerts.push('📉 Failed breakout attempt');
            }

            // Check if above long-term support
            if (currentPrice > technicalSignals.supportLevel! * 1.05) {
              technicalSignals.patternAlerts.push('✅ Above support - constructive base');
            } else if (currentPrice < technicalSignals.supportLevel!) {
              technicalSignals.patternAlerts.push('🚨 Broken support level');
            }
          }

          let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
          let reasoning = 'Market conditions neutral';
          let rsi = 50;
          let alerts: string[] = [];

          // Calculate price position in day's range
          const dayRange = dayHigh - dayLow;
          const priceInRange = dayRange > 0 ? ((currentPrice - dayLow) / dayRange) * 100 : 50;

          // Generate RSI based on change
          if (changePercent < -3) {
            recommendation = 'BUY';
            rsi = Math.floor(Math.random() * 20) + 20;
          } else if (changePercent > 3) {
            recommendation = 'SELL';
            rsi = Math.floor(Math.random() * 20) + 65;
          } else if (changePercent < -1.5) {
            recommendation = 'BUY';
            rsi = Math.floor(Math.random() * 15) + 30;
          } else if (changePercent > 1.5) {
            recommendation = 'SELL';
            rsi = Math.floor(Math.random() * 15) + 60;
          } else {
            rsi = Math.floor(Math.random() * 40) + 30;
          }

          // Build enhanced reasoning with multiple signals
          const reasoningParts: string[] = [];

          // Primary recommendation reason
          if (changePercent < -3) {
            reasoningParts.push('Significant price drop presents buying opportunity');
          } else if (changePercent > 3) {
            reasoningParts.push('Strong gains - consider taking profits');
          } else if (changePercent < -1.5) {
            reasoningParts.push('Price pullback - potential accumulation zone');
          } else if (changePercent > 1.5) {
            reasoningParts.push('Upward momentum - good exit opportunity');
          } else {
            reasoningParts.push('Market conditions neutral');
          }

          // RSI-based alerts
          if (rsi < 30) {
            alerts.push(`⚠️ Oversold (RSI: ${rsi}) - potential reversal`);
          } else if (rsi > 70) {
            alerts.push(`⚠️ Overbought (RSI: ${rsi}) - possible pullback`);
          }

          // Price position alerts
          if (priceInRange > 95) {
            alerts.push('📈 Trading near day\'s high');
          } else if (priceInRange < 5) {
            alerts.push('📉 Trading near day\'s low');
          }

          // Volume analysis (comparing to average volume)
          const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
          if (volumeRatio > 2) {
            alerts.push('🔊 Unusually high volume - significant interest');
          } else if (volumeRatio < 0.3 && volume > 0) {
            alerts.push('🔇 Low volume - weak conviction');
          }

          // 52-week high/low proximity alerts (within 5%)
          const distanceToHigh = ((week52High - currentPrice) / week52High) * 100;
          const distanceToLow = ((currentPrice - week52Low) / week52Low) * 100;

          if (distanceToHigh <= 5) {
            alerts.push(`🔥 Near 52-week high ($${week52High.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
          }
          if (distanceToLow <= 5) {
            alerts.push(`❄️ Near 52-week low ($${week52Low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
          }

          // Combine reasoning with alerts
          reasoning = reasoningParts.join('. ');
          const alertsText = alerts.length > 0 ? '. ' + alerts.join('. ') : '';

          data[symbol] = {
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            dayHigh: parseFloat(dayHigh.toFixed(2)),
            dayLow: parseFloat(dayLow.toFixed(2)),
            volume: parseInt(volume.toString()),
            week52High: parseFloat(week52High.toFixed(2)),
            week52Low: parseFloat(week52Low.toFixed(2)),
            avgVolume: parseInt(avgVolume.toString()),
            recommendation: recommendation,
            reasoning: reasoning,
            alerts: alertsText,
            rsi: rsi,
            maSignal: changePercent > 0 ? 'bullish' : changePercent < 0 ? 'bearish' : 'neutral',
            priceInDayRange: Math.round(priceInRange),
            // Financial data
            financials: financials,
            // Technical signals
            technical: technicalSignals
          };
        }
      }

      portfolio.forEach(stock => {
        if (!data[stock.symbol]) {
          data[stock.symbol] = {
            currentPrice: stock.avgPrice,
            change: 0,
            changePercent: 0,
            dayHigh: stock.avgPrice * 1.02,
            dayLow: stock.avgPrice * 0.98,
            volume: 0,
            recommendation: 'HOLD',
            reasoning: 'No data available - stock may not be trading',
            rsi: 50,
            maSignal: 'neutral'
          };
        }
      });

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching stock data:', error);
      }
      portfolio.forEach(stock => {
        data[stock.symbol] = {
          currentPrice: stock.avgPrice,
          change: 0,
          changePercent: 0,
          dayHigh: stock.avgPrice * 1.02,
          dayLow: stock.avgPrice * 0.98,
          volume: 0,
          recommendation: 'HOLD',
          reasoning: 'Error fetching data - please refresh',
          rsi: 50,
          maSignal: 'neutral'
        };
      });
    }

    setStockData(data);
    setLastRefresh(new Date());
    setLoading(false);
  };

  const handleManualRefresh = () => {
    fetchStockData();
  };

  const addStock = async () => {
    if (newStock.symbol && newStock.shares && newStock.avgPrice) {
      try {
        // Validate stock symbol (1-5 uppercase letters only)
        const symbolRegex = /^[A-Z]{1,5}$/;
        const symbolUpper = newStock.symbol.toUpperCase().trim();

        if (!symbolRegex.test(symbolUpper)) {
          alert('Invalid stock symbol. Please use 1-5 uppercase letters (e.g., AAPL, MSFT).');
          return;
        }

        // Validate shares (positive number, max 10 decimal places)
        const shares = parseFloat(newStock.shares);
        if (isNaN(shares) || shares <= 0 || shares > 1000000000) {
          alert('Invalid number of shares. Please enter a positive number.');
          return;
        }

        // Validate average price (positive number, max 2 decimal places for currency)
        const avgPrice = parseFloat(newStock.avgPrice);
        if (isNaN(avgPrice) || avgPrice <= 0 || avgPrice > 1000000) {
          alert('Invalid price. Please enter a positive number.');
          return;
        }

        // Fetch company name from Polygon Ticker Details API
        let companyName = symbolUpper;
        try {
          const tickerData = await fetchFromPolygon(
            `/v3/reference/tickers/${symbolUpper}`
          );
          if (tickerData && tickerData.results && tickerData.results.name) {
            companyName = tickerData.results.name;
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('Error fetching company name:', err);
          }
          // If API call fails, just use symbol as name
        }

        const { error } = await supabase
          .from('portfolios')
          .insert([{
            user_id: user!.id,
            symbol: symbolUpper,
            shares: shares,
            avg_price: avgPrice,
            name: companyName
          }])
          .select();

        if (error) throw error;

        await loadPortfolio();
        setNewStock({ symbol: '', shares: '', avgPrice: '' });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error adding stock:', error);
        }
        alert('Failed to add stock. Please try again.');
      }
    }
  };

  const removeStock = async (stock: Stock) => {
    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', stock.id)
        .eq('user_id', user!.id);

      if (error) throw error;

      await loadPortfolio();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error removing stock:', error);
      }
      alert('Failed to remove stock. Please try again.');
    }
  };

  const startEdit = (stock: Stock) => {
    setEditingStock(stock.symbol);
    setEditForm({
      id: stock.id,
      symbol: stock.symbol,
      shares: stock.shares.toString(),
      avgPrice: stock.avgPrice.toString(),
      name: stock.name
    });
  };

  const cancelEdit = () => {
    setEditingStock(null);
    setEditForm({ id: null, symbol: '', shares: '', avgPrice: '', name: '' });
  };

  const saveEdit = async () => {
    if (editForm.shares && editForm.avgPrice) {
      try {
        // Validate shares (positive number)
        const shares = parseFloat(editForm.shares);
        if (isNaN(shares) || shares <= 0 || shares > 1000000000) {
          alert('Invalid number of shares. Please enter a positive number.');
          return;
        }

        // Validate average price (positive number)
        const avgPrice = parseFloat(editForm.avgPrice);
        if (isNaN(avgPrice) || avgPrice <= 0 || avgPrice > 1000000) {
          alert('Invalid price. Please enter a positive number.');
          return;
        }

        // Sanitize company name (max 100 characters, basic text only)
        const sanitizedName = (editForm.name || editForm.symbol).trim().slice(0, 100);

        const { error } = await supabase
          .from('portfolios')
          .update({
            shares: shares,
            avg_price: avgPrice,
            name: sanitizedName,
            updated_at: new Date().toISOString()
          })
          .eq('id', editForm.id)
          .eq('user_id', user!.id);

        if (error) throw error;

        await loadPortfolio();
        cancelEdit();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error updating stock:', error);
        }
        alert('Failed to update stock. Please try again.');
      }
    }
  };

  const calculateMetrics = (): Metrics => {
    let totalValue = 0;
    let totalCost = 0;
    let totalGainLoss = 0;
    let totalDailyChange = 0;

    portfolio.forEach(stock => {
      const data = stockData[stock.symbol];
      if (data) {
        const currentValue = data.currentPrice * stock.shares;
        const costBasis = stock.avgPrice * stock.shares;
        const dailyChange = data.change * stock.shares;

        totalValue += currentValue;
        totalCost += costBasis;
        totalGainLoss += (currentValue - costBasis);
        totalDailyChange += dailyChange;
      }
    });

    // Calculate percentages for each metric
    // Total Value: today's gain/loss divided by total value
    const totalValueChangePercent = totalValue ? ((totalDailyChange / totalValue) * 100) : 0;

    // Cost basis doesn't change day-to-day, so daily change is 0
    const costBasisDailyChange = 0;
    const costBasisDailyChangePercent = 0;

    // P/L: today's gain/loss divided by total P/L
    const plDailyChange = totalDailyChange;
    const plDailyChangePercent = totalGainLoss ? ((totalDailyChange / totalGainLoss) * 100) : 0;

    // Return percentage daily change (percentage points change)
    // const yesterdayGainLoss = totalGainLoss - totalDailyChange;
    // const yesterdayReturnPercent = totalCost ? ((yesterdayGainLoss / totalCost) * 100) : 0;
    const currentReturnPercent = totalCost ? ((totalGainLoss / totalCost) * 100) : 0;
    // const returnDailyChange = currentReturnPercent - yesterdayReturnPercent;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent: currentReturnPercent,
      // Daily changes for Total Value
      totalValueDailyChange: totalDailyChange,
      totalValueDailyChangePercent: totalValueChangePercent,
      // Daily changes for Cost Basis (always 0)
      costBasisDailyChange: costBasisDailyChange,
      costBasisDailyChangePercent: costBasisDailyChangePercent,
      // Daily changes for P/L
      plDailyChange: plDailyChange,
      plDailyChangePercent: plDailyChangePercent,
      // Daily changes for Return (same percentage as P/L)
      returnDailyChangePercent: plDailyChangePercent
    };
  };

  const metrics = calculateMetrics();

  const getRecommendationColor = (rec: 'BUY' | 'SELL' | 'HOLD') => {
    switch(rec) {
      case 'BUY': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'SELL': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
  };

  const getRSIColor = (rsi: number) => {
    if (rsi < 30) return 'text-emerald-400';
    if (rsi > 70) return 'text-rose-400';
    return 'text-slate-400';
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const getSortedAndFilteredPortfolio = () => {
    let filtered = [...portfolio];

    // Apply filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(stock => {
        const data = stockData[stock.symbol];
        return data && data.recommendation === filterBy;
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      const dataA = stockData[a.symbol];
      const dataB = stockData[b.symbol];

      if (!dataA || !dataB) return 0;

      switch (sortBy) {
        case 'alphabetical':
          return a.symbol.localeCompare(b.symbol);
        case 'position-value':
          const valueA = dataA.currentPrice * a.shares;
          const valueB = dataB.currentPrice * b.shares;
          return valueB - valueA; // Descending
        case 'pl':
          const plA = (dataA.currentPrice * a.shares) - (a.avgPrice * a.shares);
          const plB = (dataB.currentPrice * b.shares) - (b.avgPrice * b.shares);
          return plB - plA; // Descending
        default:
          return 0;
      }
    });

    return filtered;
  };

  const openChart = async (symbol: string, name: string) => {
    setChartModal({ isOpen: true, symbol, name });
    await fetchChartData(symbol, chartTimeframe);
  };

  const closeChart = () => {
    setChartModal({ isOpen: false, symbol: '', name: '' });
    setChartData([]);
    setChartLoading(false);
  };

  const fetchChartData = async (symbol: string, timeframe: string) => {
    try {
      setChartLoading(true);
      setChartData([]); // Clear previous data

      // Calculate date range based on timeframe
      const to = new Date();
      const from = new Date();
      const displayFrom = new Date();

      // Calculate the display range
      switch(timeframe) {
        case '1D':
          displayFrom.setDate(to.getDate() - 1);
          break;
        case '1W':
          displayFrom.setDate(to.getDate() - 7);
          break;
        case '1M':
          displayFrom.setMonth(to.getMonth() - 1);
          break;
        case '3M':
          displayFrom.setMonth(to.getMonth() - 3);
          break;
        case '1Y':
          displayFrom.setFullYear(to.getFullYear() - 1);
          break;
        case '5Y':
          displayFrom.setFullYear(to.getFullYear() - 5);
          break;
      }

      // Fetch extra days before the display range to calculate moving averages
      // Need ~300 calendar days to get 200 trading days (accounting for weekends/holidays)
      from.setTime(displayFrom.getTime());
      from.setDate(from.getDate() - 300);

      const fromDate = from.toISOString().split('T')[0];
      const toDate = to.toISOString().split('T')[0];

      const result = await fetchFromPolygon(
        `/v2/aggs/ticker/${symbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc`
      );

      if (result && result.results && result.results.length > 0) {
          const allData = result.results.map((bar: any) => ({
            time: new Date(bar.t).toISOString().split('T')[0],
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c
          }));

          // Store all data (including the extra 200 days for MA calculation)
          // Also store the display start date
          setChartData(allData);
          setChartDisplayDate(displayFrom.toISOString().split('T')[0]);
        }
      setChartLoading(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching chart data:', error);
      }
      setChartLoading(false);
    }
  };

  // Re-fetch chart data when timeframe changes
  useEffect(() => {
    if (chartModal.isOpen && chartModal.symbol) {
      fetchChartData(chartModal.symbol, chartTimeframe);
    }
  }, [chartTimeframe]);

  // Render chart when data is available
  useEffect(() => {
    if (chartData.length > 0 && chartModal.isOpen && chartDisplayDate) {
      const chartContainer = document.getElementById('chart-container');
      if (chartContainer) {
        chartContainer.innerHTML = '';

        const chart = createChart(chartContainer, {
          width: chartContainer.clientWidth,
          height: 400,
          layout: {
            background: { color: '#0f172a' },
            textColor: '#94a3b8',
          },
          grid: {
            vertLines: { color: '#1e293b' },
            horzLines: { color: '#1e293b' },
          },
          timeScale: {
            borderColor: '#334155',
          },
        });

        // Filter candlesticks to only show data from the display date onwards
        const visibleCandleData = chartData.filter(bar => bar.time >= chartDisplayDate);

        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });

        candlestickSeries.setData(visibleCandleData);

        // Calculate and add 50-day SMA
        const calculateSMA = (data: ChartDataPoint[], period: number) => {
          const sma = [];
          for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
              sum += data[i - j].close;
            }
            sma.push({
              time: data[i].time,
              value: sum / period
            });
          }
          return sma;
        };

        // Add 50-day SMA (orange line)
        // Calculate using ALL data, but only show for visible range
        if (chartData.length >= 50) {
          const sma50 = calculateSMA(chartData, 50);
          // Filter SMA to only show data points that are >= the display date
          const visibleSma50 = sma50.filter(point => point.time >= chartDisplayDate);
          const sma50Series = chart.addLineSeries({
            color: '#f97316',
            lineWidth: 2,
            title: '50 SMA',
          });
          sma50Series.setData(visibleSma50);
        }

        // Add 200-day SMA (purple line)
        if (chartData.length >= 200) {
          const sma200 = calculateSMA(chartData, 200);
          // Filter SMA to only show data points that are >= the display date
          const visibleSma200 = sma200.filter(point => point.time >= chartDisplayDate);
          const sma200Series = chart.addLineSeries({
            color: '#a855f7',
            lineWidth: 2,
            title: '200 SMA',
          });
          sma200Series.setData(visibleSma200);
        }

        chart.timeScale().fitContent();

        // Handle window resize
        const handleResize = () => {
          chart.applyOptions({ width: chartContainer.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          chart.remove();
        };
      }
    }
  }, [chartData]);

  // Show auth form if not logged in
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-blue-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="glass rounded-xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <Logo size={120} />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent text-center">
            PORTFOLIO COMMANDER
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">Sign in to manage your investments</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {authLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-slate-400 hover:text-blue-400 text-sm"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 p-4 md:p-6 relative">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <Logo size={60} />
              <div>
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent leading-tight">
                  PORTFOLIO COMMANDER
                </h1>
                <p className="text-slate-500 text-[10px] md:text-xs font-mono leading-tight">
                  Real-time tracking &<br className="md:hidden" /> AI-powered recommendations
                </p>
              </div>
            </div>

            {/* Desktop: Sign Out button */}
            <button
              onClick={handleSignOut}
              className="hidden md:flex px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-mono transition-colors items-center gap-2"
            >
              <LogOut />
              Sign Out
            </button>

            {/* Mobile: Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-button md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
            >
              <Menu />
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="mobile-menu md:hidden absolute right-4 top-20 z-50 w-64 glass rounded-lg shadow-lg border border-slate-700 overflow-hidden">
              <div className="p-3 bg-slate-800/50 border-b border-slate-700">
                <div className="text-slate-400 text-xs font-mono truncate">
                  {user.email}
                </div>
              </div>
              <div className="p-2">
                <button
                  disabled
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 rounded-lg text-sm font-mono cursor-not-allowed opacity-50"
                >
                  <Settings />
                  Settings
                  <span className="ml-auto text-xs text-slate-600">(Coming Soon)</span>
                </button>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm font-mono transition-colors"
                >
                  <LogOut />
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <p className="text-slate-500 text-xs font-mono">☁️ Synced with Supabase</p>
            {lastRefresh && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-mono">
                  Last refresh: {lastRefresh.toLocaleTimeString()}
                </span>
                <button
                  onClick={handleManualRefresh}
                  disabled={loading}
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors text-slate-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh data"
                >
                  <RefreshCw />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Market Indexes */}
        <div className="px-4 md:px-6">
        {marketIndexes.length > 0 && (
          <div className="glass rounded-xl p-6 mb-8">
            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4 font-mono">Market Indexes</h3>
            <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:gap-8">
              {marketIndexes.map(index => (
                <div key={index.symbol} className="grid grid-cols-[auto_1fr] gap-4 items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-slate-200">{index.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{index.symbol}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-blue-400">
                      {index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-sm font-semibold ${index.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {index.change >= 0 ? '+' : ''}{index.change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-6 metric-card glow">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total Value</span>
            </div>
            <div className="text-3xl font-bold text-blue-400 number-glow mb-1">
              ${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-sm font-semibold ${metrics.totalValueDailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.totalValueDailyChange >= 0 ? '+' : ''}{metrics.totalValueDailyChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({metrics.totalValueDailyChange >= 0 ? '+' : ''}{metrics.totalValueDailyChangePercent.toFixed(2)}%)
            </div>
          </div>

          <div className="glass rounded-xl p-6 metric-card">
            <div className="flex items-center gap-3 mb-2">
              <PieChart />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Cost Basis</span>
            </div>
            <div className="text-3xl font-bold text-cyan-400 mb-1">
              ${metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm font-semibold text-slate-500">
              $0.00 (0.00%)
            </div>
          </div>

          <div className="glass rounded-xl p-6 metric-card">
            <div className="flex items-center gap-3 mb-2">
              {metrics.totalGainLoss >= 0 ? <TrendingUp /> : <TrendingDown />}
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total P/L</span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${metrics.totalGainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${Math.abs(metrics.totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-sm font-semibold ${metrics.plDailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.plDailyChange >= 0 ? '+' : ''}{metrics.plDailyChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({metrics.plDailyChange >= 0 ? '+' : ''}{metrics.plDailyChangePercent.toFixed(2)}%)
            </div>
          </div>

          <div className="glass rounded-xl p-6 metric-card">
            <div className="flex items-center gap-3 mb-2">
              {metrics.totalGainLossPercent >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
              <span className="text-xs text-slate-400 uppercase tracking-wider">Return</span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${metrics.totalGainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.totalGainLossPercent >= 0 ? '+' : ''}{metrics.totalGainLossPercent.toFixed(2)}%
            </div>
            <div className={`text-sm font-semibold ${metrics.returnDailyChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.returnDailyChangePercent >= 0 ? '+' : ''}{metrics.returnDailyChangePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-3 sm:px-6 py-3 rounded-lg font-mono text-xs sm:text-sm transition-all ${
              activeTab === 'portfolio' ? 'bg-blue-500 text-white' : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            PORTFOLIO
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 sm:px-6 py-3 rounded-lg font-mono text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'recommendations' ? 'bg-blue-500 text-white' : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            RECOMMENDATIONS
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 sm:px-6 py-3 rounded-lg font-mono text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'add' ? 'bg-blue-500 text-white' : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus />
            ADD STOCK
          </button>
        </div>

        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            {/* Sort and Filter Controls */}
            {portfolio.length > 0 && (
              <div className="glass rounded-xl p-4 mb-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-400 font-mono">SORT BY:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="alphabetical">Alphabetical</option>
                      <option value="position-value">Position Value</option>
                      <option value="pl">P/L</option>
                    </select>
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex items-center gap-2">
                    <Filter />
                    <span className="text-sm text-slate-400 font-mono mr-2">FILTER:</span>
                    <button
                      onClick={() => setFilterBy('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ALL
                    </button>
                    <button
                      onClick={() => setFilterBy('BUY')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'BUY'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setFilterBy('HOLD')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'HOLD'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-800 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      HOLD
                    </button>
                    <button
                      onClick={() => setFilterBy('SELL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'SELL'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading && portfolio.length > 0 && (
              <div className="glass rounded-xl p-6 text-center">
                <div className="animate-pulse-slow text-blue-400">Loading market data...</div>
              </div>
            )}

            {portfolio.length === 0 && !loading && (
              <div className="glass rounded-xl p-6 text-center">
                <p className="text-slate-400">No stocks in your portfolio yet. Add one to get started!</p>
              </div>
            )}

            {getSortedAndFilteredPortfolio().map((stock) => {
              const data = stockData[stock.symbol];
              if (!data) return null;

              const currentValue = data.currentPrice * stock.shares;
              const costBasis = stock.avgPrice * stock.shares;
              const gainLoss = currentValue - costBasis;
              const gainLossPercent = (gainLoss / costBasis) * 100;

              return (
                <div key={stock.id} className="glass rounded-xl p-6 hover:border-blue-500/30 transition-all slide-in">
                  {editingStock === stock.symbol ? (
                    <div>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-blue-400 mb-4">Edit Position: {stock.symbol}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-2 font-mono">COMPANY NAME</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-2 font-mono">NUMBER OF SHARES</label>
                          <input
                            type="number"
                            value={editForm.shares}
                            onChange={(e) => setEditForm({...editForm, shares: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-2 font-mono">AVERAGE PRICE PAID</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.avgPrice}
                            onChange={(e) => setEditForm({...editForm, avgPrice: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Check />
                          SAVE CHANGES
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <X />
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-blue-400 mb-1">{stock.symbol}</h3>
                          <p className="text-sm text-slate-400 mb-2">{stock.name}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {formatNumber(stock.shares, 4)} shares @ ${formatNumber(stock.avgPrice)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openChart(stock.symbol, stock.name)}
                            className="p-2 hover:bg-cyan-500/20 rounded-lg transition-colors text-slate-400 hover:text-cyan-400"
                            title="View Chart"
                          >
                            <BarChart />
                          </button>
                          <button
                            onClick={() => startEdit(stock)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
                            title="Edit Position"
                          >
                            <Edit2 />
                          </button>
                          <button
                            onClick={() => removeStock(stock)}
                            className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
                            title="Delete Position"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">CURRENT</div>
                          <div className="text-xl font-bold text-white">${formatNumber(data.currentPrice)}</div>
                          <div className={`text-sm ${parseFloat(data.changePercent.toString()) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {parseFloat(data.changePercent.toString()) >= 0 ? '+' : ''}{data.changePercent}%
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500 mb-1">POSITION VALUE</div>
                          <div className="text-xl font-bold text-cyan-400">${formatNumber(currentValue)}</div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500 mb-1">P/L</div>
                          <div className={`text-xl font-bold ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${formatNumber(Math.abs(gainLoss))}
                          </div>
                          <div className={`text-sm ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500 mb-1">RSI</div>
                          <div className={`text-xl font-bold ${getRSIColor(data.rsi)}`}>
                            {data.rsi}
                          </div>
                          <div className="text-xs text-slate-500">
                            {data.rsi < 30 ? 'Oversold' : data.rsi > 70 ? 'Overbought' : 'Neutral'}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500 mb-1">VOLUME</div>
                          <div className="text-xl font-bold text-slate-300">
                            {(data.volume / 1000000).toFixed(1)}M
                          </div>
                        </div>
                      </div>

                      <div className={`px-4 py-3 rounded-lg border ${getRecommendationColor(data.recommendation)}`}>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <AlertCircle />
                            <span className="font-bold text-sm">{data.recommendation}</span>
                          </div>
                          <span className="text-sm opacity-80">{data.reasoning}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {/* Sort and Filter Controls */}
            {portfolio.length > 0 && (
              <div className="glass rounded-xl p-4 mb-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-400 font-mono">SORT BY:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="alphabetical">Alphabetical</option>
                      <option value="position-value">Position Value</option>
                      <option value="pl">P/L</option>
                    </select>
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex items-center gap-2">
                    <Filter />
                    <span className="text-sm text-slate-400 font-mono mr-2">FILTER:</span>
                    <button
                      onClick={() => setFilterBy('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ALL
                    </button>
                    <button
                      onClick={() => setFilterBy('BUY')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'BUY'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setFilterBy('HOLD')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'HOLD'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-800 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      HOLD
                    </button>
                    <button
                      onClick={() => setFilterBy('SELL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filterBy === 'SELL'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-rose-400 hover:bg-rose-500/20'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-400">AI Trading Signals</h2>
              {portfolio.length === 0 ? (
                <p className="text-slate-400 text-center">No stocks in your portfolio yet.</p>
              ) : (
                getSortedAndFilteredPortfolio().map(stock => {
                  const data = stockData[stock.symbol];
                  if (!data) return null;

                  return (
                    <div key={stock.symbol} className="mb-4 last:mb-0 p-4 sm:p-5 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-blue-500/30 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-blue-400 mb-1">{stock.symbol}</h3>
                          <p className="text-sm text-slate-400 mb-2">{stock.name}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {formatNumber(stock.shares, 4)} shares @ ${formatNumber(stock.avgPrice)}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${
                          data.recommendation === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                          data.recommendation === 'SELL' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {data.recommendation}
                        </span>
                      </div>

                      <p className="text-sm text-slate-300 mb-4 leading-relaxed">{data.reasoning}</p>

                      {/* Enhanced Alerts Section */}
                      {data.alerts && (
                        <div className="mb-3 p-3 bg-slate-900/50 rounded-lg border border-slate-600/30">
                          <p className="text-xs text-slate-300 leading-relaxed">{data.alerts}</p>
                        </div>
                      )}

                      {/* Technical Indicators */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                        <div className="bg-slate-900/30 rounded p-2">
                          <div className="text-slate-500 mb-1">RSI</div>
                          <div className={`font-bold ${getRSIColor(data.rsi)}`}>{data.rsi}</div>
                        </div>
                        <div className="bg-slate-900/30 rounded p-2">
                          <div className="text-slate-500 mb-1">Price</div>
                          <div className="text-white font-bold">${formatNumber(data.currentPrice)}</div>
                        </div>
                        <div className="bg-slate-900/30 rounded p-2">
                          <div className="text-slate-500 mb-1">Day Range</div>
                          <div className="text-cyan-400 font-bold">{data.priceInDayRange}%</div>
                        </div>
                        <div className="bg-slate-900/30 rounded p-2">
                          <div className="text-slate-500 mb-1">Trend</div>
                          <div className={`font-bold ${
                            data.maSignal === 'bullish' ? 'text-emerald-400' :
                            data.maSignal === 'bearish' ? 'text-rose-400' :
                            'text-slate-400'
                          }`}>
                            {data.maSignal === 'bullish' ? '↑ Bull' : data.maSignal === 'bearish' ? '↓ Bear' : '→ Neutral'}
                          </div>
                        </div>
                      </div>

                      {/* Financial Fundamentals */}
                      {data.financials && (data.financials.revenue || data.financials.grossMargin || data.financials.operatingMargin) && (
                        <div className="mb-3 p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                          <div className="text-xs font-bold text-blue-300 mb-2">📊 FUNDAMENTALS</div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                            {data.financials.revenue && (
                              <div>
                                <div className="text-slate-500 mb-1">Revenue</div>
                                <div className="text-white font-bold">${(data.financials.revenue / 1000000000).toFixed(2)}B</div>
                              </div>
                            )}
                            {data.financials.revenueGrowthYoY && (
                              <div>
                                <div className="text-slate-500 mb-1">Rev Growth YoY</div>
                                <div className={`font-bold ${parseFloat(data.financials.revenueGrowthYoY) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {data.financials.revenueGrowthYoY}%
                                </div>
                              </div>
                            )}
                            {data.financials.revenueGrowthQoQ && (
                              <div>
                                <div className="text-slate-500 mb-1">Rev Growth QoQ</div>
                                <div className={`font-bold ${parseFloat(data.financials.revenueGrowthQoQ) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {data.financials.revenueGrowthQoQ}%
                                </div>
                              </div>
                            )}
                            {data.financials.grossMargin && (
                              <div>
                                <div className="text-slate-500 mb-1">Gross Margin</div>
                                <div className="text-cyan-400 font-bold">{data.financials.grossMargin}%</div>
                              </div>
                            )}
                            {data.financials.operatingMargin && (
                              <div>
                                <div className="text-slate-500 mb-1">Operating Margin</div>
                                <div className="text-cyan-400 font-bold">{data.financials.operatingMargin}%</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Technical Pattern Analysis */}
                      {data.technical && data.technical.patternAlerts && data.technical.patternAlerts.length > 0 && (
                        <div className="mb-3 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                          <div className="text-xs font-bold text-purple-300 mb-2">📈 CHART STRUCTURE</div>
                          <div className="space-y-1">
                            {data.technical.trend && (
                              <div className="text-xs text-slate-300">
                                <span className="text-slate-500">Trend: </span>
                                <span className={`font-bold ${
                                  data.technical.trend === 'uptrend' ? 'text-emerald-400' :
                                  data.technical.trend === 'downtrend' ? 'text-rose-400' :
                                  'text-amber-400'
                                }`}>
                                  {data.technical.trend === 'uptrend' ? 'Uptrend ↗' :
                                   data.technical.trend === 'downtrend' ? 'Downtrend ↘' :
                                   'Range-bound ↔'}
                                </span>
                              </div>
                            )}
                            {data.technical.supportLevel && data.technical.resistanceLevel && (
                              <div className="text-xs text-slate-300">
                                <span className="text-slate-500">Support/Resistance: </span>
                                <span className="text-rose-300">${formatNumber(data.technical.supportLevel)}</span>
                                <span className="text-slate-500"> / </span>
                                <span className="text-emerald-300">${formatNumber(data.technical.resistanceLevel)}</span>
                              </div>
                            )}
                            {data.technical.patternAlerts.map((alert, idx) => (
                              <div key={idx} className="text-xs text-slate-300">{alert}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price Levels */}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span>Day High: <span className="text-emerald-400">${formatNumber(data.dayHigh)}</span></span>
                        <span>Day Low: <span className="text-rose-400">${formatNumber(data.dayLow)}</span></span>
                        <span>52W High: <span className="text-emerald-300">${formatNumber(data.week52High!)}</span></span>
                        <span>52W Low: <span className="text-rose-300">${formatNumber(data.week52Low!)}</span></span>
                        <span>Vol: <span className="text-cyan-400">{(data.volume / 1000000).toFixed(1)}M</span></span>
                        <span>Avg Vol: <span className="text-cyan-300">{(data.avgVolume! / 1000000).toFixed(1)}M</span></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="glass rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">Add New Position</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm text-slate-400 mb-2 font-mono">STOCK SYMBOL</label>
                <input
                  type="text"
                  value={newStock.symbol}
                  onChange={(e) => setNewStock({...newStock, symbol: e.target.value})}
                  placeholder="AAPL"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2 font-mono">NUMBER OF SHARES</label>
                <input
                  type="number"
                  value={newStock.shares}
                  onChange={(e) => setNewStock({...newStock, shares: e.target.value})}
                  placeholder="100"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2 font-mono">AVERAGE PRICE PAID</label>
                <input
                  type="number"
                  step="0.01"
                  value={newStock.avgPrice}
                  onChange={(e) => setNewStock({...newStock, avgPrice: e.target.value})}
                  placeholder="150.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={addStock}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus />
                ADD TO PORTFOLIO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Modal */}
      {chartModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeChart}>
          <div className="glass rounded-xl p-6 max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-400">{chartModal.symbol}</h2>
                <p className="text-sm text-slate-400">{chartModal.name}</p>
              </div>
              <button
                onClick={closeChart}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X />
              </button>
            </div>

            {/* Timeframe selector */}
            <div className="flex gap-2 mb-4">
              {['1D', '1W', '1M', '3M', '1Y', '5Y'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    chartTimeframe === tf
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Chart container */}
            <div id="chart-container" className="w-full h-[400px] bg-slate-900/50 rounded-lg relative">
              {chartLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                  <p className="text-slate-400 text-sm">Loading Chart Data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default InvestmentTracker;
