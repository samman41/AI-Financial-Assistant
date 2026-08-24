import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import api from '../services/api';
import {
  TrendingUp,
  BrainCircuit,
  Sliders,
  Percent,
  TrendingDown,
  Info
} from 'lucide-react';

// Chart JS
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Forecasting = () => {
  const { user } = useAuth();
  const currencySymbol = user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';

  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scenario Simulator variables (percentage adjustments)
  const [revenueSlider, setRevenueSlider] = useState(0); // e.g. -20% to +20%
  const [expenseSlider, setExpenseSlider] = useState(0);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/insights/forecast');
      setForecastData(res.data);
    } catch (err) {
      console.error("Forecasting load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  if (loading || !forecastData) {
    return <Loader />;
  }

  // --- Compute Scenario Projections ---
  const rawMetrics = forecastData.metrics || {};
  
  // Adjusted next month values
  const adjRevenue = rawMetrics.next_month_revenue * (1 + revenueSlider / 100);
  const adjExpenses = rawMetrics.next_month_expenses * (1 + expenseSlider / 100);
  const adjProfit = adjRevenue - adjExpenses;

  // Let's adjust cash balance forecast points
  const historyPoints = forecastData.historical || [];
  const forecastPoints = forecastData.forecast || [];
  
  let currentCash = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1].cash_balance : 10000.0;
  
  const adjustedForecastPoints = forecastPoints.map((pt, idx) => {
    // Apply slider adjustments
    const r = pt.revenue * (1 + revenueSlider / 100);
    const e = pt.expenses * (1 + expenseSlider / 100);
    const profit = r - e;
    currentCash += profit;
    
    return {
      date: pt.date,
      revenue: r,
      expenses: e,
      net_profit: profit,
      cash_balance: currentCash
    };
  });

  // --- Map Chart Data ---
  const allLabels = [...historyPoints.map(p => p.date), ...adjustedForecastPoints.map(p => p.date)];
  
  // Historical cash points
  const historyCash = historyPoints.map(p => p.cash_balance);
  
  // Forecast cash points (must start from the last historical point to maintain continuous line)
  const forecastCash = [
    ...Array(historyPoints.length - 1).fill(null),
    historyPoints.length > 0 ? historyPoints[historyPoints.length - 1].cash_balance : null,
    ...adjustedForecastPoints.map(p => p.cash_balance)
  ];

  const lineChartData = {
    labels: allLabels,
    datasets: [
      {
        label: 'Historical Balance',
        data: [...historyCash, ...Array(forecastPoints.length).fill(null)],
        borderColor: '#10b981', // Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: 'Forecast Trend',
        data: forecastCash,
        borderColor: '#3b82f6', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        fill: true,
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 4,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Inter' } }
      },
      tooltip: {
        padding: 12,
        backgroundColor: '#0f172a'
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8', callback: (val) => `${currencySymbol}${val}` }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight">Cash Flow Forecasting</h1>
        <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">
          Predict future cash positions using linear regression trend models
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Next Month Revenue */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d]">
          <span className="text-xs font-semibold text-primary-400 dark:text-slate-450 uppercase">Expected Revenue</span>
          <h3 className="text-xl font-bold mt-2 text-white dark:text-white">
            {currencySymbol}{adjRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="text-[10px] text-primary-400 mt-2 flex items-center">
            <TrendingUp size={12} className="text-primary-300 mr-1" />
            <span>Predicted cash inflows</span>
          </div>
        </div>

        {/* Next Month Expenses */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d]">
          <span className="text-xs font-semibold text-primary-400 dark:text-slate-450 uppercase">Expected Expenses</span>
          <h3 className="text-xl font-bold mt-2 text-white dark:text-white">
            {currencySymbol}{adjExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="text-[10px] text-primary-400 mt-2 flex items-center">
            <TrendingDown size={12} className="text-rose-500 mr-1" />
            <span>Predicted cash outflows</span>
          </div>
        </div>

        {/* Expected Net Profit */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d]">
          <span className="text-xs font-semibold text-primary-400 dark:text-slate-450 uppercase">Expected Profit</span>
          <h3 className={`text-xl font-bold mt-2 ${adjProfit >= 0 ? 'text-primary-300 dark:text-primary-300' : 'text-rose-600'}`}>
            {currencySymbol}{adjProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="text-[10px] text-primary-400 mt-2">
            <span>Inflows minus Outflows</span>
          </div>
        </div>

        {/* Projected Cash Balance */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] ai-glow-emerald">
          <span className="text-xs font-semibold text-primary-400 dark:text-slate-450 uppercase">Projected Balance</span>
          <h3 className="text-xl font-bold mt-2 text-white dark:text-white">
            {currencySymbol}{adjustedForecastPoints[0]?.cash_balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '10,000.00'}
          </h3>
          <div className="text-[10px] text-primary-400 mt-2 flex items-center">
            <BrainCircuit size={12} className="text-primary-500 mr-1" />
            <span>Calculated cash buffer</span>
          </div>
        </div>

      </div>

      {/* Main Line Chart */}
      <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50">
        <h3 className="font-bold text-primary-100 dark:text-white mb-4">Cash Position Projection</h3>
        <div className="h-96 relative">
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      </div>

      {/* Interactive Scenario Workspace */}
      <div className="glass-card rounded-xl p-6 bg-[#0d0d0d]/60 dark:bg-[#0d0d0d] border border-primary-900 text-white space-y-6">
        <div className="flex items-center space-x-2">
          <Sliders className="text-primary-500" size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Scenario Analysis Simulator</h3>
        </div>
        
        <p className="text-primary-400 text-xs leading-relaxed max-w-2xl">
          Simulate external financial conditions (e.g. inflation, supply chain disruptions, client acquisition spikes) and instantly review how they impact your cash position next month.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-primary-900">
          {/* Revenue Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
              <span>Next Month Sales / Revenue</span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${revenueSlider >= 0 ? 'bg-primary-700 text-primary-300' : 'bg-rose-950 text-rose-400'}`}>
                {revenueSlider >= 0 ? '+' : ''}{revenueSlider}%
              </span>
            </div>
            
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={revenueSlider}
              onChange={(e) => setRevenueSlider(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#111111] rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-primary-400">
              <span>-30% Drop</span>
              <span>Baseline</span>
              <span>+30% Growth</span>
            </div>
          </div>

          {/* Expense Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
              <span>Next Month Expenses / Overhead</span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${expenseSlider <= 0 ? 'bg-primary-700 text-primary-300' : 'bg-rose-950 text-rose-400'}`}>
                {expenseSlider >= 0 ? '+' : ''}{expenseSlider}%
              </span>
            </div>
            
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={expenseSlider}
              onChange={(e) => setExpenseSlider(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#111111] rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-[10px] text-primary-400">
              <span>-30% Save</span>
              <span>Baseline</span>
              <span>+30% Overhead</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-black/40 rounded-xl flex items-start space-x-3 border border-slate-850">
          <Info size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-primary-400 leading-relaxed">
            <strong>Observation:</strong> With the simulated adjustments, your next month expected net profit is <strong>{currencySymbol}{adjProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>, and the projected cash buffer ends at <strong>{currencySymbol}{adjustedForecastPoints[0]?.cash_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>. Adjust parameters to check target margins.
          </div>
        </div>

      </div>

    </div>
  );
};

export default Forecasting;
