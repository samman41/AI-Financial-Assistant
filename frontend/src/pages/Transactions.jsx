import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader, TableSkeleton } from '../components/Loader';
import TransactionModal from '../components/TransactionModal';
import api from '../services/api';
import {
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  "Transport & Travel",
  "Food & Beverage",
  "Cloud Services & Hosting",
  "Marketing & Advertising",
  "Software & Subscriptions",
  "Office Supplies & Equipment",
  "Rent & Utilities",
  "Salaries & Benefits",
  "Professional Services",
  "Miscellaneous"
];

const Transactions = () => {
  const { user } = useAuth();
  const currencySymbol = user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [txType, setTxType] = useState('');
  const [isAnomaly, setIsAnomaly] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      let url = `/api/transactions/?skip=${skip}&limit=${limit}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (txType) url += `&tx_type=${txType}`;
      if (isAnomaly !== null) url += `&is_anomaly=${isAnomaly}`;

      const response = await api.get(url);
      setTransactions(response.data);
      
      // Let's query count summaries
      const summaryRes = await api.get('/api/transactions/summary');
      setTotalCount(summaryRes.data.total_count);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, category, txType, isAnomaly, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleScanAnomalies = async () => {
    setIsScanning(true);
    setSuccessMsg('');
    try {
      await api.post('/api/transactions/scan-anomalies');
      setSuccessMsg("System successfully scanned your ledger. Anomalies flags updated.");
      fetchTransactions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDelete = async (txId) => {
    if (window.confirm("Are you sure you want to delete this transaction record?")) {
      try {
        await api.delete(`/api/transactions/${txId}`);
        setSuccessMsg("Transaction deleted successfully.");
        fetchTransactions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEditClick = (tx) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setSelectedTx(null);
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    setSuccessMsg("Transaction saved successfully.");
    fetchTransactions();
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight">Transactions Ledger</h1>
          <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">Review, filter, edit, and audit your business expenses</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddNewClick}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-xl transition-all shadow-premium-blue"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>
          
          <button
            onClick={handleScanAnomalies}
            disabled={isScanning}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-200 dark:bg-[#111111] hover:bg-slate-300 dark:hover:bg-[#1a1a1a] text-slate-700 dark:text-primary-200 text-sm font-semibold rounded-xl transition-all"
            title="Scan statistics outliers"
          >
            <Sparkles size={16} className={isScanning ? 'animate-pulse text-amber-500' : 'text-amber-500'} />
            <span>{isScanning ? 'Scanning...' : 'Scan Anomalies'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-primary-700 dark:bg-primary-700/20 text-primary-300 dark:text-primary-300 border border-primary-700 dark:border-primary-700/30 rounded-xl text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Search & Filters block */}
      <div className="glass-card rounded-xl p-4 bg-white dark:bg-[#0d0d0d] border border-slate-250/30">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 text-primary-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, vendor, description..."
              className="w-full bg-[#0d0d0d] dark:bg-black border border-primary-900 dark:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl pl-11 pr-4 py-2 text-sm text-primary-100 dark:text-primary-100"
            />
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-[#111111] text-slate-700 dark:text-primary-200 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-[#1a1a1a] transition-all"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>

            <button
              onClick={() => { setSearch(''); setCategory(''); setTxType(''); setIsAnomaly(null); setPage(1); fetchTransactions(); }}
              className="p-2 bg-slate-100 dark:bg-[#111111] text-primary-400 hover:text-slate-700 dark:hover:text-slate-350 rounded-xl transition-all"
              title="Reset Filters"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Collapsible filter options */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-primary-900 animate-fade-in">
            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-primary-400 uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="w-full glass-input text-xs"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[10px] font-bold text-primary-400 uppercase mb-1">Type</label>
              <select
                value={txType}
                onChange={(e) => { setTxType(e.target.value); setPage(1); }}
                className="w-full glass-input text-xs"
              >
                <option value="">All Types</option>
                <option value="income">Income (Inbound)</option>
                <option value="expense">Expense (Outbound)</option>
              </select>
            </div>

            {/* Anomalies */}
            <div>
              <label className="block text-[10px] font-bold text-primary-400 uppercase mb-1">Audits</label>
              <select
                value={isAnomaly === null ? '' : isAnomaly.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setIsAnomaly(val === '' ? null : val === 'true');
                  setPage(1);
                }}
                className="w-full glass-input text-xs"
              >
                <option value="">All Transactions</option>
                <option value="true">Anomalies Only</option>
                <option value="false">Normal Only</option>
              </select>
            </div>

            {/* Sorting */}
            <div>
              <label className="block text-[10px] font-bold text-primary-400 uppercase mb-1">Sort Order</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="w-full glass-input text-xs"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="name">Name</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
                  className="w-full glass-input text-xs"
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="glass-card rounded-xl bg-white dark:bg-[#0d0d0d] overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name / Payee</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Type</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#0d0d0d]/50 dark:hover:bg-slate-850/30">
                    <td className="text-xs text-primary-400 dark:text-primary-300 whitespace-nowrap">{tx.date}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-semibold text-primary-100 dark:text-primary-200">{tx.name}</div>
                          {tx.vendor && <div className="text-xs text-primary-400">{tx.vendor}</div>}
                        </div>
                        {tx.is_anomaly && (
                          <div className="p-1 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400" title={tx.anomaly_reason}>
                            <AlertTriangle size={13} className="animate-bounce" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs bg-slate-100 dark:bg-slate-850 text-primary-300 dark:text-slate-350 px-2 py-0.5 rounded-full font-medium">
                        {tx.category}
                      </span>
                    </td>
                    <td className="text-xs text-primary-400 dark:text-primary-300">{tx.payment_method}</td>
                    <td>
                      {tx.type === 'income' ? (
                        <span className="flex items-center text-xs font-semibold text-primary-300 dark:text-primary-300">
                          <TrendingUp size={12} className="mr-1" />
                          Income
                        </span>
                      ) : (
                        <span className="flex items-center text-xs font-semibold text-primary-400 dark:text-slate-450">
                          <TrendingDown size={12} className="mr-1" />
                          Expense
                        </span>
                      )}
                    </td>
                    <td className={`font-bold text-right text-xs whitespace-nowrap ${
                      tx.type === 'income' ? 'text-primary-300 dark:text-primary-300' : 'text-primary-100 dark:text-primary-200'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="p-1.5 hover:bg-[#111111] dark:hover:bg-[#111111] text-primary-400 hover:text-slate-700 dark:hover:text-slate-300 rounded"
                          title="Edit transaction"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 hover:bg-[#111111] dark:hover:bg-[#111111] text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded"
                          title="Delete transaction"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-primary-400 text-sm">
                      No transactions match the search filters. Try resetting filters or add a new transaction!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-150 dark:border-primary-900 bg-[#0d0d0d] dark:bg-[#0d0d0d]">
          <span className="text-xs text-primary-400">
            Showing {transactions.length} of {totalCount} transactions
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 bg-white dark:bg-black border border-primary-900 dark:border-primary-900 text-primary-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-primary-300 dark:text-primary-300 px-3 py-1.5">
              Page {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={transactions.length < limit}
              className="p-1.5 bg-white dark:bg-black border border-primary-900 dark:border-primary-900 text-primary-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={selectedTx}
        onSave={handleModalSave}
      />

    </div>
  );
};

export default Transactions;
