import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import api from '../services/api';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Import = () => {
  const { user } = useAuth();
  const currencySymbol = user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';

  const [step, setStep] = useState(1); // 1: Select/Upload, 2: Preview & Adjust, 3: Success
  const [file, setFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [error, setError] = useState('');

  // Parsed results from upload
  const [uploadId, setUploadId] = useState(null);
  const [rowTotal, setRowTotal] = useState(0);
  const [previewRows, setPreviewRows] = useState([]);
  const [headersDetected, setHeadersDetected] = useState({});

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a CSV or Excel file to upload.");
      return;
    }

    setUploadLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { upload_id, row_count, preview, headers } = response.data;
      setUploadId(upload_id);
      setRowTotal(row_count);
      setPreviewRows(preview);
      setHeadersDetected(headers);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to process the uploaded file. Please ensure columns are correctly formatted.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCategoryChangeInPreview = (index, value) => {
    const updated = [...previewRows];
    updated[index].category = value;
    setPreviewRows(updated);
  };

  const handleCommitSubmit = async () => {
    // Check if there are critical errors
    const hasErrors = previewRows.some(row => !row.is_valid);
    if (hasErrors) {
      setError("Please resolve or remove invalid transaction entries before importing.");
      return;
    }

    setCommitLoading(true);
    setError('');

    try {
      const payload = {
        // Strip validation flags before sending back to commit
        transactions: previewRows.map(row => ({
          name: row.name,
          description: row.description,
          category: row.category,
          amount: row.amount,
          date: row.date,
          payment_method: row.payment_method,
          vendor: row.vendor,
          type: row.type,
          notes: row.notes
        }))
      };

      await api.post(`/api/import/commit?upload_id=${uploadId}`, payload);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Commit transaction batch failed.");
    } finally {
      setCommitLoading(false);
    }
  };

  const handleRemoveRow = (index) => {
    const updated = previewRows.filter((_, idx) => idx !== index);
    setPreviewRows(updated);
    setRowTotal(updated.length);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight">CSV & Excel Importer</h1>
        <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">Upload banking statements and map fields with automated AI classification assistance</p>
      </div>

      {/* Progress Wizard */}
      <div className="flex items-center space-x-4 px-2 py-3 bg-white dark:bg-[#0d0d0d] rounded-xl border border-primary-900/50 dark:border-primary-900">
        <div className={`flex items-center space-x-2 text-xs font-bold ${step >= 1 ? 'text-primary-600 dark:text-primary-400' : 'text-primary-400'}`}>
          <span className={`h-6 w-6 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary-600 dark:border-primary-400' : 'border-slate-300'}`}>1</span>
          <span>Upload File</span>
        </div>
        <ChevronRight size={14} className="text-slate-300" />
        <div className={`flex items-center space-x-2 text-xs font-bold ${step >= 2 ? 'text-primary-600 dark:text-primary-400' : 'text-primary-400'}`}>
          <span className={`h-6 w-6 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary-600 dark:border-primary-400' : 'border-slate-300'}`}>2</span>
          <span>Review & Map</span>
        </div>
        <ChevronRight size={14} className="text-slate-300" />
        <div className={`flex items-center space-x-2 text-xs font-bold ${step >= 3 ? 'text-primary-600 dark:text-primary-400' : 'text-primary-400'}`}>
          <span className={`h-6 w-6 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-primary-600 dark:border-primary-400' : 'border-slate-300'}`}>3</span>
          <span>Finished</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border border-rose-100 dark:border-rose-900/35 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* --- Step 1: File Upload Form --- */}
      {step === 1 && (
        <div className="glass-card rounded-xl p-8 bg-white dark:bg-[#0d0d0d] text-center border border-primary-900/50">
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-primary-900 dark:border-primary-900 rounded-2xl p-12 transition-all hover:bg-[#0d0d0d]/50 dark:hover:bg-black/20 flex flex-col items-center cursor-pointer relative">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              
              <div className="p-4 bg-primary-50 dark:bg-black rounded-2xl text-primary-600 dark:text-primary-400 mb-4">
                <Upload size={32} />
              </div>
              
              <h3 className="font-bold text-primary-100 dark:text-primary-200">
                {file ? file.name : "Select bank statement file"}
              </h3>
              
              <p className="text-primary-400 text-xs mt-2">
                Supports Standard CSV or Excel exports (.csv, .xlsx). Max size 15MB.
              </p>
            </div>

            <div className="p-4 bg-[#0d0d0d] dark:bg-black rounded-xl text-left border border-slate-150 dark:border-primary-900 flex items-start space-x-3">
              <Info size={16} className="text-primary-500 mt-0.5" />
              <div className="text-xs text-primary-400 leading-relaxed">
                <strong>Headers Auto-Detection:</strong> Our algorithms automatically map standard header formats (such as <em>Amount</em>, <em>Date</em>, <em>Vendor/Payee</em>, and <em>Payment Method</em>). Fields missing category values will be filled with local ML predictions.
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-150 dark:border-primary-900">
              <button
                type="submit"
                disabled={uploadLoading || !file}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-sm transition-all shadow-premium-blue flex items-center disabled:opacity-50"
              >
                {uploadLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin mr-2" />
                    Analyzing Headers...
                  </>
                ) : (
                  <>
                    <span>Next: Parse Fields</span>
                    <ArrowRight size={14} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- Step 2: Mapping & Preview Grid --- */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Mapping Summary */}
          <div className="glass-card rounded-xl p-4 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-primary-100 dark:text-primary-200 flex items-center">
                <FileSpreadsheet className="text-primary-500 mr-2" size={18} />
                <span>Parsed Statement: {file?.name}</span>
              </h3>
              <p className="text-xs text-primary-400 dark:text-primary-300 mt-1">
                Detected columns: <strong>Amount</strong> ({headersDetected.amount || 'N/A'}), <strong>Date</strong> ({headersDetected.date || 'N/A'}), <strong>Vendor</strong> ({headersDetected.vendor || 'N/A'}).
              </p>
            </div>
            
            <div className="text-xs px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 font-bold">
              {rowTotal} rows ready to commit
            </div>
          </div>

          {/* Table Ledger Preview */}
          <div className="glass-card rounded-xl bg-white dark:bg-[#0d0d0d] border border-primary-900/50 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0d0d0d] dark:bg-black/40 sticky top-0 z-10">
                  <tr className="border-b border-slate-100 dark:border-primary-900">
                    <th className="py-3 px-4 text-xs font-semibold text-primary-400">Date</th>
                    <th className="py-3 px-4 text-xs font-semibold text-primary-400">Vendor / Payee</th>
                    <th className="py-3 px-4 text-xs font-semibold text-primary-400">Type</th>
                    <th className="py-3 px-4 text-xs font-semibold text-primary-400">Category (AI Suggestion)</th>
                    <th className="py-3 px-4 text-xs font-semibold text-primary-400 text-right">Amount</th>
                    <th className="py-3 px-4 text-xs font-semibold text-primary-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewRows.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-[#0d0d0d]/50 dark:hover:bg-slate-850/30 ${
                        !row.is_valid ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-xs text-primary-400 dark:text-primary-300">{row.date || 'INVALID'}</td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-bold text-primary-100 dark:text-primary-200">{row.name}</div>
                        <div className="text-[10px] text-primary-400">{row.vendor}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs uppercase font-medium">{row.type}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <select
                            value={row.category}
                            onChange={(e) => handleCategoryChangeInPreview(idx, e.target.value)}
                            className="bg-transparent border-b border-primary-900 dark:border-primary-900 py-0.5 text-xs focus:outline-none focus:border-primary-500"
                          >
                            <option value="Uncategorized">Uncategorized</option>
                            <option value="Transport & Travel">Transport & Travel</option>
                            <option value="Food & Beverage">Food & Beverage</option>
                            <option value="Cloud Services & Hosting">Cloud Services & Hosting</option>
                            <option value="Marketing & Advertising">Marketing & Advertising</option>
                            <option value="Software & Subscriptions">Software & Subscriptions</option>
                            <option value="Office Supplies & Equipment">Office Supplies & Equipment</option>
                            <option value="Rent & Utilities">Rent & Utilities</option>
                            <option value="Salaries & Benefits">Salaries & Benefits</option>
                            <option value="Professional Services">Professional Services</option>
                            <option value="Miscellaneous">Miscellaneous</option>
                          </select>
                          <Sparkles size={11} className="text-primary-500" title="Assigned by AI algorithm" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-right">
                        {currencySymbol}{row.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {row.is_valid ? (
                          <span className="text-[10px] bg-primary-700 dark:bg-primary-700/20 text-primary-300 dark:text-primary-300 px-2 py-0.5 rounded-full font-bold">
                            Valid
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="text-[10px] bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 px-2 py-0.5 rounded-full font-bold hover:bg-rose-100 transition-colors"
                            title={row.errors.join(' | ')}
                          >
                            Remove Row
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions footer */}
            <div className="flex justify-between items-center px-6 py-4 bg-[#0d0d0d] dark:bg-[#0d0d0d] border-t border-slate-150 dark:border-primary-900">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-primary-900 dark:border-primary-900 hover:bg-[#111111] dark:hover:bg-[#111111] text-primary-300 dark:text-slate-350 text-sm font-semibold rounded-xl transition-all"
              >
                Go Back
              </button>
              
              <button
                type="button"
                onClick={handleCommitSubmit}
                disabled={commitLoading || previewRows.length === 0}
                className="px-6 py-2.5 bg-primary-700 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-all shadow-premium flex items-center disabled:opacity-50"
              >
                {commitLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin mr-2" />
                    Saving Ledger...
                  </>
                ) : (
                  <>
                    <span>Commit Import</span>
                    <CheckCircle size={14} className="ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Step 3: Success Screen --- */}
      {step === 3 && (
        <div className="glass-card rounded-xl p-12 bg-white dark:bg-[#0d0d0d] text-center border border-primary-900/50 space-y-6">
          <div className="inline-flex p-4 bg-primary-700 dark:bg-primary-700/30 text-primary-300 dark:text-primary-300 border border-primary-700 dark:border-primary-700/50 rounded-full animate-bounce">
            <CheckCircle size={40} />
          </div>
          
          <h2 className="text-xl font-extrabold text-primary-100 dark:text-white">Transaction Import Successful!</h2>
          <p className="text-sm text-primary-400 dark:text-primary-300 max-w-md mx-auto leading-relaxed">
            All validated records have been added to your ledger. AI model classifier will dynamically fine-tune based on these inputs.
          </p>

          <div className="pt-6 border-t border-slate-150 dark:border-primary-900 flex justify-center space-x-3">
            <Link
              to="/"
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-sm transition-all shadow-premium-blue"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={() => { setFile(null); setStep(1); setPreviewRows([]); }}
              className="px-6 py-2.5 bg-slate-200 dark:bg-[#111111] hover:bg-slate-300 dark:hover:bg-[#1a1a1a] text-slate-700 dark:text-primary-200 text-sm font-semibold rounded-xl transition-all"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Import;
