import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileDown, FileSpreadsheet, RefreshCw, CalendarCheck } from 'lucide-react';
import api from '../services/api';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const YEARS = [2024, 2025, 2026, 2027];

const Reports = () => {
  const { user } = useAuth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [error, setError] = useState('');

  const downloadReport = async (format) => {
    setError('');
    if (format === 'pdf') setPdfLoading(true);
    else setExcelLoading(true);

    try {
      const response = await api.get(`/api/reports/${format}?month=${month}&year=${year}`, {
        responseType: 'blob' // Important: handle binary files
      });

      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'pdf' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${year}_${month}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(`Failed to compile ${format.toUpperCase()} report. Ensure transactions exist for selected period.`);
    } finally {
      setPdfLoading(false);
      setExcelLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight">Report Generator</h1>
        <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">Export professional, audit-ready financial statements for accounting, tax, or investment reviews</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30 rounded-xl text-sm font-medium animate-fade-in">
          {error}
        </div>
      )}

      {/* Select Period */}
      <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center space-x-2 text-primary-500 flex-shrink-0">
          <CalendarCheck size={20} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-750 dark:text-slate-350">Configure Period:</span>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          <div>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full glass-input text-xs"
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full glass-input text-xs"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Downloads cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PDF Card */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex flex-col justify-between h-64">
          <div>
            <div className="inline-flex p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl mb-4 border border-red-100 dark:border-red-900/30">
              <FileDown size={22} />
            </div>
            <h3 className="font-bold text-primary-100 dark:text-white">PDF Executive Report</h3>
            <p className="text-primary-400 text-xs mt-2 leading-relaxed">
              Consolidated PDF layout featuring executive summaries, category share charts, flagged anomalies, and recent ledgers. Suitable for investor decks.
            </p>
          </div>

          <button
            onClick={() => downloadReport('pdf')}
            disabled={pdfLoading || excelLoading}
            className="w-full py-2.5 bg-[#0d0d0d] dark:bg-[#111111] hover:bg-[#111111] dark:hover:bg-[#1a1a1a] text-white font-semibold rounded-xl text-xs transition-all flex justify-center items-center gap-2"
          >
            {pdfLoading ? <RefreshCw className="animate-spin" size={14} /> : <FileDown size={14} />}
            <span>{pdfLoading ? 'Compiling PDF...' : 'Download PDF Statement'}</span>
          </button>
        </div>

        {/* Excel Card */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex flex-col justify-between h-64">
          <div>
            <div className="inline-flex p-3 bg-primary-700 dark:bg-primary-700/20 text-primary-300 rounded-xl mb-4 border border-primary-700 dark:border-primary-700/30">
              <FileSpreadsheet size={22} />
            </div>
            <h3 className="font-bold text-primary-100 dark:text-white">Excel Ledger Workbook</h3>
            <p className="text-primary-400 text-xs mt-2 leading-relaxed">
              Multi-sheet Excel workbook compiling raw transactions, categories, and monthly sheets formatted with cell configurations. Perfect for internal audits.
            </p>
          </div>

          <button
            onClick={() => downloadReport('excel')}
            disabled={pdfLoading || excelLoading}
            className="w-full py-2.5 bg-primary-700 hover:bg-primary-700 text-white font-semibold rounded-xl text-xs transition-all flex justify-center items-center gap-2 shadow-premium"
          >
            {excelLoading ? <RefreshCw className="animate-spin" size={14} /> : <FileSpreadsheet size={14} />}
            <span>{excelLoading ? 'Formatting Workbook...' : 'Download Excel Ledger'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};

export default Reports;
