import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, RefreshCw, Sun, Moon, Shield } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' }
];

const Settings = () => {
  const { user, updateProfile, theme, toggleTheme } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    currency: 'USD',
    taxRate: '0',
    password: ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Mocks notification flags
  const [notifyAnomaly, setNotifyAnomaly] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name || '',
        companyName: user.company_name || '',
        currency: user.currency || 'USD',
        taxRate: String(user.tax_rate || 0.0),
        password: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const payload = {
      full_name: formData.fullName,
      company_name: formData.companyName,
      currency: formData.currency,
      tax_rate: parseFloat(formData.taxRate) || 0.0,
    };

    if (formData.password && formData.password.trim() !== '') {
      payload.password = formData.password;
    }

    const res = await updateProfile(payload);
    if (res.success) {
      setSuccess("Profile settings successfully synced.");
      setFormData(prev => ({ ...prev, password: '' }));
    } else {
      setError(res.error || "Failed to update profile settings.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight flex items-center">
          <SettingsIcon className="text-primary-500 mr-2" size={24} />
          <span>System Settings</span>
        </h1>
        <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">Configure company profiles, default currencies, and notification setups</p>
      </div>

      {success && (
        <div className="p-3.5 bg-primary-700 dark:bg-primary-700/20 text-primary-300 dark:text-primary-300 border border-primary-700 dark:border-primary-700/30 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Profile Details Card */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 space-y-4">
          <h3 className="font-bold text-primary-100 dark:text-white pb-3 border-b border-slate-100 dark:border-primary-900">
            Company & Personal Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-primary-400 dark:text-primary-300 uppercase mb-1.5">Owner Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full glass-input"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-primary-400 dark:text-primary-300 uppercase mb-1.5">Business / Company Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                className="w-full glass-input"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-semibold text-primary-400 dark:text-primary-300 uppercase mb-1.5">Reporting Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full glass-input"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-xs font-semibold text-primary-400 dark:text-primary-300 uppercase mb-1.5">Corporate Tax Percentage (%)</label>
              <input
                type="number"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full glass-input"
              />
            </div>
          </div>
        </div>

        {/* Security / Password updates */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 space-y-4">
          <h3 className="font-bold text-primary-100 dark:text-white pb-3 border-b border-slate-100 dark:border-primary-900">
            Security Configuration
          </h3>
          
          <div className="max-w-md">
            <label className="block text-xs font-semibold text-primary-400 dark:text-primary-300 uppercase mb-1.5">Update Password (Leave blank to keep current)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full glass-input"
            />
          </div>
        </div>

        {/* Visual Settings */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 space-y-4">
          <h3 className="font-bold text-primary-100 dark:text-white pb-3 border-b border-slate-100 dark:border-primary-900">
            Visual Preferences
          </h3>

          <div className="flex items-center justify-between py-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-750 dark:text-primary-200">System Visual Theme</h4>
              <p className="text-[11px] text-primary-400 mt-1">Select your preferred user interface colors</p>
            </div>
            
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center space-x-2 px-4 py-2 border border-slate-250 dark:border-primary-900 hover:bg-[#0d0d0d] dark:hover:bg-black text-xs font-bold rounded-xl text-slate-700 dark:text-primary-300 transition-all"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={14} className="text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-primary-400" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications mock triggers */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 space-y-4">
          <h3 className="font-bold text-primary-100 dark:text-white pb-3 border-b border-slate-100 dark:border-primary-900">
            Email & Notification Alerts
          </h3>

          <div className="space-y-4">
            {/* Notify 1 */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-750 dark:text-primary-200">Expense Anomaly Warnings</h4>
                <p className="text-[11px] text-primary-400 mt-1">Receive automated email alerts as soon as outsized vendor amounts are flagged</p>
              </div>
              <input
                type="checkbox"
                checked={notifyAnomaly}
                onChange={(e) => setNotifyAnomaly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1 cursor-pointer"
              />
            </div>

            {/* Notify 2 */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-750 dark:text-primary-200">Weekly Cash Flow Summaries</h4>
                <p className="text-[11px] text-primary-400 mt-1">Receive weekly profit margins reports and forecast projections straight to inbox</p>
              </div>
              <input
                type="checkbox"
                checked={notifyWeekly}
                onChange={(e) => setNotifyWeekly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Admin Tag */}
        {user?.is_admin && (
          <div className="p-4 bg-[#0d0d0d] dark:bg-black rounded-xl border border-slate-150 dark:border-slate-850 flex items-start space-x-3">
            <Shield className="text-primary-500 mt-0.5" size={16} />
            <div className="text-[11px] text-primary-400 leading-relaxed">
              <strong>Administrator Account Status:</strong> Your account is registered as a Global Administrator. You can access usage charts, query diagnostic parameters, and manage users in the <strong>Admin Panel</strong>.
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-primary-900 dark:border-primary-900">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-sm transition-all shadow-premium-blue flex items-center disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin mr-2" />
                Syncing Profile...
              </>
            ) : (
              <>
                <Save size={14} className="mr-2" />
                Save Preferences
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export default Settings;
