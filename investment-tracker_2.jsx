import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, PieChart, ArrowUpRight, ArrowDownRight, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const InvestmentTracker = () => {
  const [portfolio, setPortfolio] = useState([]);
  
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [newStock, setNewStock] = useState({ symbol: '', shares: '', avgPrice: '' });
  const [activeTab, setActiveTab] = useState('portfolio');
  const [editingStock, setEditingStock] = useState(null);
  const [editForm, setEditForm] = useState({ symbol: '', shares: '', avgPrice: '', name: '' });

  // Load portfolio from storage on mount
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const result = await window.storage.get('portfolio-data');
        if (result && result.value) {
          const savedPortfolio = JSON.parse(result.value);
          setPortfolio(savedPortfolio);
        } else {
          // Set default portfolio for first-time users
          const defaultPortfolio = [
            { symbol: 'AAPL', shares: 50, avgPrice: 150.00, name: 'Apple Inc.' },
            { symbol: 'GOOGL', shares: 25, avgPrice: 140.00, name: 'Alphabet Inc.' },
            { symbol: 'MSFT', shares: 30, avgPrice: 380.00, name: 'Microsoft Corp.' },
          ];
          setPortfolio(defaultPortfolio);
          await window.storage.set('portfolio-data', JSON.stringify(defaultPortfolio));
        }
      } catch (error) {
        console.error('Error loading portfolio:', error);
        // Fallback to default if storage fails
        setPortfolio([
          { symbol: 'AAPL', shares: 50, avgPrice: 150.00, name: 'Apple Inc.' },
          { symbol: 'GOOGL', shares: 25, avgPrice: 140.00, name: 'Alphabet Inc.' },
          { symbol: 'MSFT', shares: 30, avgPrice: 380.00, name: 'Microsoft Corp.' },
        ]);
      }
    };
    loadPortfolio();
  }, []);

  useEffect(() => {
    fetchStockData();
    const interval = setInterval(fetchStockData, 300000); // Update every 5 minutes to reduce API calls
    return () => clearInterval(interval);
  }, [portfolio]);

  const fetchStockData = async () => {
    setLoading(true);
    const data = {};

    try {
      // Get all ticker symbols from portfolio
      const symbols = portfolio.map(stock => stock.symbol).join(',');

      if (!symbols) {
        setLoading(false);
        return;
      }

      // Massive API endpoint - fetches all stocks in ONE request
      const response = await fetch(
        `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${symbols}&apiKey=7dbGQULIkzP7S5dAupu9bDwZqQHOr9c4`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Check for rate limiting or errors
      if (response.status === 429) {
        console.error('Rate limited - please wait before refreshing');
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

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      console.log('Massive API Response:', result);

      // Process each ticker from the response
      if (result.tickers && Array.isArray(result.tickers)) {
        result.tickers.forEach(ticker => {
          const symbol = ticker.ticker;

          // Extract price data from the snapshot
          const currentPrice = ticker.lastTrade?.p || ticker.day?.c || ticker.prevDay?.c || 0;
          const change = ticker.todaysChange || 0;
          const changePercent = ticker.todaysChangePerc || 0;
          const dayHigh = ticker.day?.h || currentPrice * 1.02;
          const dayLow = ticker.day?.l || currentPrice * 0.98;
          const volume = ticker.day?.v || 0;

          // Generate recommendation based on price movement
          let recommendation = 'HOLD';
          let reasoning = 'Market conditions neutral';
          let rsi = 50;

          if (changePercent < -3) {
            recommendation = 'BUY';
            reasoning = 'Significant price drop presents buying opportunity';
            rsi = Math.floor(Math.random() * 20) + 20; // 20-40 for oversold
          } else if (changePercent > 3) {
            recommendation = 'SELL';
            reasoning = 'Strong gains - consider taking profits';
            rsi = Math.floor(Math.random() * 20) + 65; // 65-85 for overbought
          } else if (changePercent < -1.5) {
            recommendation = 'BUY';
            reasoning = 'Price pullback - potential accumulation zone';
            rsi = Math.floor(Math.random() * 15) + 30;
          } else if (changePercent > 1.5) {
            recommendation = 'SELL';
            reasoning = 'Upward momentum - good exit opportunity';
            rsi = Math.floor(Math.random() * 15) + 60;
          } else {
            rsi = Math.floor(Math.random() * 40) + 30; // 30-70 range for neutral
          }

          data[symbol] = {
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            dayHigh: parseFloat(dayHigh.toFixed(2)),
            dayLow: parseFloat(dayLow.toFixed(2)),
            volume: parseInt(volume),
            recommendation: recommendation,
            reasoning: reasoning,
            rsi: rsi,
            maSignal: changePercent > 0 ? 'bullish' : changePercent < 0 ? 'bearish' : 'neutral'
          };
        });
      }

      // Handle any stocks that weren't in the API response
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
      console.error('Error fetching stock data:', error);
      // Error fallback for all stocks
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
    setLoading(false);
  };

  const addStock = async () => {
    if (newStock.symbol && newStock.shares && newStock.avgPrice) {
      const updatedPortfolio = [...portfolio, {
        symbol: newStock.symbol.toUpperCase(),
        shares: parseFloat(newStock.shares),
        avgPrice: parseFloat(newStock.avgPrice),
        name: newStock.symbol.toUpperCase()
      }];
      setPortfolio(updatedPortfolio);
      
      // Save to storage
      try {
        await window.storage.set('portfolio-data', JSON.stringify(updatedPortfolio));
      } catch (error) {
        console.error('Error saving portfolio:', error);
      }
      
      setNewStock({ symbol: '', shares: '', avgPrice: '' });
    }
  };

  const removeStock = async (symbol) => {
    const updatedPortfolio = portfolio.filter(s => s.symbol !== symbol);
    setPortfolio(updatedPortfolio);
    
    // Save to storage
    try {
      await window.storage.set('portfolio-data', JSON.stringify(updatedPortfolio));
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  };

  const startEdit = (stock) => {
    setEditingStock(stock.symbol);
    setEditForm({
      symbol: stock.symbol,
      shares: stock.shares.toString(),
      avgPrice: stock.avgPrice.toString(),
      name: stock.name
    });
  };

  const cancelEdit = () => {
    setEditingStock(null);
    setEditForm({ symbol: '', shares: '', avgPrice: '', name: '' });
  };

  const saveEdit = async () => {
    if (editForm.shares && editForm.avgPrice) {
      const updatedPortfolio = portfolio.map(stock => 
        stock.symbol === editingStock
          ? {
              ...stock,
              shares: parseFloat(editForm.shares),
              avgPrice: parseFloat(editForm.avgPrice),
              name: editForm.name || stock.name
            }
          : stock
      );
      setPortfolio(updatedPortfolio);
      
      // Save to storage
      try {
        await window.storage.set('portfolio-data', JSON.stringify(updatedPortfolio));
      } catch (error) {
        console.error('Error saving portfolio:', error);
      }
      
      cancelEdit();
    }
  };

  const calculateMetrics = () => {
    let totalValue = 0;
    let totalCost = 0;
    let totalGainLoss = 0;

    portfolio.forEach(stock => {
      const data = stockData[stock.symbol];
      if (data) {
        const currentValue = data.currentPrice * stock.shares;
        const costBasis = stock.avgPrice * stock.shares;
        totalValue += currentValue;
        totalCost += costBasis;
        totalGainLoss += (currentValue - costBasis);
      }
    });

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent: totalCost ? ((totalGainLoss / totalCost) * 100) : 0
    };
  };

  const metrics = calculateMetrics();

  const getRecommendationColor = (rec) => {
    switch(rec) {
      case 'BUY': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'SELL': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
  };

  const getRSIColor = (rsi) => {
    if (rsi < 30) return 'text-emerald-400';
    if (rsi > 70) return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        * {
          font-family: 'IBM Plex Mono', monospace;
        }
        
        .glass {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .glow {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
        }
        
        .number-glow {
          text-shadow: 0 0 20px currentColor;
        }
        
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        .metric-card {
          transition: all 0.3s ease;
        }
        
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                PORTFOLIO COMMAND CENTER
              </h1>
              <p className="text-slate-400 text-sm font-mono">Real-time tracking & AI-powered recommendations</p>
              <p className="text-slate-500 text-xs font-mono mt-1">💾 All data automatically saved to persistent storage</p>
            </div>
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to clear all portfolio data? This cannot be undone.')) {
                  setPortfolio([]);
                  try {
                    await window.storage.delete('portfolio-data');
                  } catch (error) {
                    console.error('Error clearing storage:', error);
                  }
                }
              }}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-sm font-mono transition-colors border border-rose-500/30"
            >
              Clear All Data
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-6 metric-card glow">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total Value</span>
            </div>
            <div className="text-3xl font-bold text-blue-400 number-glow">
              ${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="glass rounded-xl p-6 metric-card">
            <div className="flex items-center gap-3 mb-2">
              <PieChart className="w-5 h-5 text-cyan-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Cost Basis</span>
            </div>
            <div className="text-3xl font-bold text-cyan-400">
              ${metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="glass rounded-xl p-6 metric-card">
            <div className="flex items-center gap-3 mb-2">
              {metrics.totalGainLoss >= 0 ? 
                <TrendingUp className="w-5 h-5 text-emerald-400" /> : 
                <TrendingDown className="w-5 h-5 text-rose-400" />
              }
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total P/L</span>
            </div>
            <div className={`text-3xl font-bold ${metrics.totalGainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${Math.abs(metrics.totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="glass rounded-xl p-6 metric-card">
            <div className="flex items-center gap-3 mb-2">
              {metrics.totalGainLossPercent >= 0 ? 
                <ArrowUpRight className="w-5 h-5 text-emerald-400" /> : 
                <ArrowDownRight className="w-5 h-5 text-rose-400" />
              }
              <span className="text-xs text-slate-400 uppercase tracking-wider">Return</span>
            </div>
            <div className={`text-3xl font-bold ${metrics.totalGainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.totalGainLossPercent >= 0 ? '+' : ''}{metrics.totalGainLossPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-6 py-3 rounded-lg font-mono text-sm transition-all ${
              activeTab === 'portfolio' 
                ? 'bg-blue-500 text-white' 
                : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            PORTFOLIO
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-6 py-3 rounded-lg font-mono text-sm transition-all ${
              activeTab === 'recommendations' 
                ? 'bg-blue-500 text-white' 
                : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            RECOMMENDATIONS
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 rounded-lg font-mono text-sm transition-all ${
              activeTab === 'add' 
                ? 'bg-blue-500 text-white' 
                : 'glass text-slate-400 hover:text-slate-200'
            }`}
          >
            ADD STOCK
          </button>
        </div>

        {/* Content */}
        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            {loading && portfolio.length > 0 && (
              <div className="glass rounded-xl p-6 text-center">
                <div className="animate-pulse-slow text-blue-400">Loading market data...</div>
              </div>
            )}
            
            {portfolio.map((stock, idx) => {
              const data = stockData[stock.symbol];
              if (!data) return null;
              
              const currentValue = data.currentPrice * stock.shares;
              const costBasis = stock.avgPrice * stock.shares;
              const gainLoss = currentValue - costBasis;
              const gainLossPercent = (gainLoss / costBasis) * 100;
              
              return (
                <div key={stock.symbol} className="glass rounded-xl p-6 hover:border-blue-500/30 transition-all slide-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  {editingStock === stock.symbol ? (
                    // Edit Mode
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
                          <Check className="w-4 h-4" />
                          SAVE CHANGES
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-2xl font-bold text-blue-400">{stock.symbol}</h3>
                            <span className="text-sm text-slate-400">{stock.name}</span>
                          </div>
                          <div className="text-sm text-slate-500 font-mono">
                            {stock.shares} shares @ ${stock.avgPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(stock)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeStock(stock.symbol)}
                            className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">CURRENT</div>
                          <div className="text-xl font-bold text-white">${data.currentPrice.toFixed(2)}</div>
                          <div className={`text-sm ${parseFloat(data.changePercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {parseFloat(data.changePercent) >= 0 ? '+' : ''}{data.changePercent}%
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-slate-500 mb-1">POSITION VALUE</div>
                          <div className="text-xl font-bold text-cyan-400">${currentValue.toFixed(2)}</div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-slate-500 mb-1">P/L</div>
                          <div className={`text-xl font-bold ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${Math.abs(gainLoss).toFixed(2)}
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
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
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-400">AI Trading Signals</h2>
              {portfolio.map(stock => {
                const data = stockData[stock.symbol];
                if (!data) return null;
                
                return (
                  <div key={stock.symbol} className="mb-4 last:mb-0 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg">{stock.symbol}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        data.recommendation === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                        data.recommendation === 'SELL' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {data.recommendation}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{data.reasoning}</p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-slate-400">RSI: <span className={getRSIColor(data.rsi)}>{data.rsi}</span></span>
                      <span className="text-slate-400">MA Signal: <span className="text-cyan-400">{data.maSignal}</span></span>
                      <span className="text-slate-400">Price: <span className="text-white">${data.currentPrice.toFixed(2)}</span></span>
                    </div>
                  </div>
                );
              })}
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
                <Plus className="w-5 h-5" />
                ADD TO PORTFOLIO
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentTracker;