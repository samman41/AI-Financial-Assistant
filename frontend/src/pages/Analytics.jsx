import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import api from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  Building,
  Target,
  DollarSign,
  Briefcase
} from 'lucide-react';

const Analytics = () => {
  const { user } = useAuth();
  const currencySymbol = user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/insights/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to load analytics details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !analytics) {
    return <Loader />;
  }

  const categories = analytics.largest_categories || [];
  const vendors = analytics.highest_vendors || [];
  const incomeSources = analytics.top_income_sources || [];

  const totalExpense = analytics.total_expenses || 1.0;
  const totalIncome = analytics.total_revenue || 0.0;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight">Financial Analytics</h1>
        <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">
          Detailed metrics of categories, top vendors, daily spending rates, and earnings channels
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Expense Analysis */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary-100 dark:text-white flex items-center">
              <Target className="text-primary-500 mr-2" size={18} />
              <span>Category Share Breakdown</span>
            </h3>
            <span className="text-xs text-primary-400">Total Spent: {currencySymbol}{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="space-y-4">
            {categories.map((c, idx) => {
              const pct = (c.amount / totalExpense) * 100;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-primary-300">{c.category}</span>
                    <div className="space-x-1.5">
                      <span className="text-primary-100 dark:text-white font-bold">{currencySymbol}{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="text-primary-400">({pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#111111] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-primary-600' :
                        idx === 1 ? 'bg-primary-700' :
                        idx === 2 ? 'bg-purple-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            
            {categories.length === 0 && (
              <div className="text-center text-slate-450 py-12 text-sm">
                No expense category breakdowns available
              </div>
            )}
          </div>
        </div>

        {/* Highest Vendor Expenses */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary-100 dark:text-white flex items-center">
              <Building className="text-primary-500 mr-2" size={18} />
              <span>Top Spending Vendors</span>
            </h3>
            <span className="text-xs text-primary-400">Past Year ledger records</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {vendors.map((v, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center hover:bg-[#0d0d0d]/50 dark:hover:bg-black/20 px-2 rounded-lg transition-colors">
                <div>
                  <div className="text-xs font-bold text-primary-100 dark:text-primary-200">{v.vendor}</div>
                  <div className="text-[10px] text-primary-400">{v.transaction_count} transaction lines</div>
                </div>
                <div className="text-xs font-bold text-primary-100 dark:text-primary-100">
                  {currencySymbol}{v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
            
            {vendors.length === 0 && (
              <div className="text-center text-slate-450 py-12 text-sm">
                No vendor transaction summaries available
              </div>
            )}
          </div>
        </div>

        {/* Top Income Sources */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-primary-100 dark:text-white flex items-center">
              <Briefcase className="text-primary-300 mr-2" size={18} />
              <span>Top Income Streams</span>
            </h3>
            <span className="text-xs text-primary-400">Inflow: {currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="space-y-3">
            {incomeSources.map((inc, idx) => {
              const pct = totalIncome > 0 ? (inc.amount / totalIncome) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center p-3 bg-[#0d0d0d] dark:bg-black rounded-xl border border-slate-100 dark:border-slate-850">
                  <div>
                    <div className="text-xs font-bold text-primary-100 dark:text-primary-200">{inc.source}</div>
                    <div className="text-[10px] text-primary-400">Direct deposit stream</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-primary-300 dark:text-primary-300">
                      +{currencySymbol}{inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {pct > 0 && <div className="text-[9px] text-primary-400">({pct.toFixed(1)}% share)</div>}
                  </div>
                </div>
              );
            })}
            
            {incomeSources.length === 0 && (
              <div className="text-center text-slate-450 py-12 text-sm">
                No income source records available
              </div>
            )}
          </div>
        </div>

        {/* Dynamic KPI Metric Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Average daily spend */}
          <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-400 uppercase">Average Daily Expense</span>
              <h3 className="text-2xl font-bold text-white dark:text-white mt-2">
                {currencySymbol}{analytics.average_daily_expense_current_month.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <p className="text-[10px] text-primary-400 mt-4 leading-relaxed">
              Calculated dynamically by dividing this month's total expenses by days lapsed.
            </p>
          </div>

          {/* Savings capability ratio */}
          <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-primary-400 uppercase">Profit Margin Ratio</span>
              {(() => {
                const ratio = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
                return (
                  <>
                    <h3 className={`text-2xl font-bold mt-2 ${ratio >= 0 ? 'text-primary-300 dark:text-primary-300' : 'text-rose-600'}`}>
                      {ratio.toFixed(1)}%
                    </h3>
                  </>
                );
              })()}
            </div>
            <p className="text-[10px] text-primary-400 mt-4 leading-relaxed">
              Expresses the percentage of revenue remaining after accounting for all operating cash outflows.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
