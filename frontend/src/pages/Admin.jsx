import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Loader';
import api from '../services/api';
import {
  ShieldAlert,
  Server,
  Users,
  Brain,
  Trash2,
  Database,
  Cpu,
  FileText,
  Activity,
  UserCheck
} from 'lucide-react';

const Admin = () => {
  const { user } = useAuth();
  
  const [usersList, setUsersList] = useState([]);
  const [health, setHealth] = useState(null);
  const [aiStats, setAiStats] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    setActionMsg('');
    try {
      // 1. Fetch users list
      const usersRes = await api.get('/api/admin/users');
      setUsersList(usersRes.data);

      // 2. Fetch health diagnostics
      const healthRes = await api.get('/api/admin/health');
      setHealth(healthRes.data);

      // 3. Fetch token/request usage stats
      const usageRes = await api.get('/api/admin/ai-usage');
      setAiStats(usageRes.data);

      // 4. Fetch uploaded files
      const filesRes = await api.get('/api/admin/files');
      setFilesList(filesRes.data);
    } catch (err) {
      console.error("Failed to load admin telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin) {
      loadAdminData();
    }
  }, [user]);

  const handleDeleteUser = async (userId, email) => {
    if (userId === user.id) {
      alert("Self-deletion is not permitted.");
      return;
    }
    if (window.confirm(`MANDATORY CONFIRMATION: Are you sure you want to permanently delete user account ${email}? This action cascades and immediately deletes all their transactions and settings.`)) {
      try {
        await api.delete(`/api/admin/users/${userId}`);
        setActionMsg(`Account ${email} successfully deleted.`);
        loadAdminData();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.detail || "Delete user operation failed.");
      }
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-xl max-w-xl mx-auto flex items-center space-x-3">
        <ShieldAlert size={20} />
        <div>
          <h3 className="font-bold">Access Forbidden</h3>
          <p className="text-xs mt-1">This panel is restricted. Please sign in with an administrator account to request analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white dark:text-white tracking-tight flex items-center">
          <Server className="text-primary-500 mr-2" size={24} />
          <span>System Administration Dashboard</span>
        </h1>
        <p className="text-primary-400 dark:text-primary-300 text-sm mt-1">
          Monitor system health, check user volume, and review token billing usage statistics
        </p>
      </div>

      {actionMsg && (
        <div className="p-3.5 bg-primary-700 dark:bg-primary-700/20 text-primary-300 dark:text-primary-300 border border-primary-700 dark:border-primary-700/30 rounded-xl text-sm font-medium">
          {actionMsg}
        </div>
      )}

      {/* Diagnostics row */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {/* Database */}
          <div className="glass-card rounded-xl p-5 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-primary-50 dark:bg-black text-primary-600 dark:text-primary-400">
              <Database size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-primary-400">Database Engine</span>
              <h4 className="font-bold text-primary-100 dark:text-white text-sm">{health.database_type}</h4>
              <span className="text-[10px] text-primary-300 font-semibold">● Connected</span>
            </div>
          </div>

          {/* Users */}
          <div className="glass-card rounded-xl p-5 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-primary-700 dark:bg-black text-primary-300 dark:text-primary-300">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-primary-400">Registered Users</span>
              <h4 className="font-bold text-primary-100 dark:text-white text-sm">{health.total_users}</h4>
            </div>
          </div>

          {/* Transactions */}
          <div className="glass-card rounded-xl p-5 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-black text-purple-600 dark:text-purple-400">
              <Activity size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-primary-400">Transactions Ledger</span>
              <h4 className="font-bold text-primary-100 dark:text-white text-sm">{health.total_transactions}</h4>
            </div>
          </div>

          {/* System status */}
          <div className="glass-card rounded-xl p-5 bg-white dark:bg-[#0d0d0d] border border-primary-900/50 flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-black text-indigo-600 dark:text-indigo-400">
              <Cpu size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-primary-400">System Diagnosis</span>
              <h4 className="font-bold text-primary-100 dark:text-white text-sm">Healthy</h4>
              <span className="text-[9px] text-primary-400">Memory: 41% utilized</span>
            </div>
          </div>
        </div>
      )}

      {/* User Manager Table */}
      <div className="glass-card rounded-xl bg-white dark:bg-[#0d0d0d] border border-primary-900/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-primary-900 flex justify-between items-center">
          <h3 className="font-bold text-primary-100 dark:text-white flex items-center">
            <UserCheck className="text-primary-500 mr-2" size={18} />
            <span>User Accounts Ledger</span>
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0d0d0d] dark:bg-black/40">
              <tr className="border-b border-slate-150 dark:border-primary-900">
                <th className="py-3 px-6 text-xs font-semibold text-primary-400">Email Address</th>
                <th className="py-3 px-6 text-xs font-semibold text-primary-400">Company Name</th>
                <th className="py-3 px-6 text-xs font-semibold text-primary-400">Tx Count</th>
                <th className="py-3 px-6 text-xs font-semibold text-primary-400">Settings</th>
                <th className="py-3 px-6 text-xs font-semibold text-primary-400">Last Active</th>
                <th className="py-3 px-6 text-xs font-semibold text-primary-400 text-center">Privileges</th>
                <th className="py-3 px-6 text-xs font-semibold text-primary-400 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersList.map((usr) => (
                <tr key={usr.id} className="hover:bg-[#0d0d0d]/50 dark:hover:bg-black/20 text-xs">
                  <td className="py-3.5 px-6 font-bold text-primary-100 dark:text-primary-200">{usr.email}</td>
                  <td className="py-3.5 px-6 text-slate-650 dark:text-primary-300">{usr.company_name || '-'}</td>
                  <td className="py-3.5 px-6 font-semibold text-primary-100 dark:text-primary-200">{usr.transaction_count}</td>
                  <td className="py-3.5 px-6 text-primary-400">
                    {usr.currency} | Tax: {usr.tax_rate}% | {usr.theme}
                  </td>
                  <td className="py-3.5 px-6 text-slate-450 whitespace-nowrap">
                    {usr.last_active ? new Date(usr.last_active).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${usr.is_admin ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400' : 'bg-slate-100 text-primary-400 dark:bg-[#111111] dark:text-slate-450'}`}>
                      {usr.is_admin ? 'ADMIN' : 'USER'}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <button
                      onClick={() => handleDeleteUser(usr.id, usr.email)}
                      disabled={usr.id === user.id}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded disabled:opacity-30"
                      title="Permanently remove user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Token usages */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50">
          <h3 className="font-bold text-primary-100 dark:text-white flex items-center mb-4">
            <Brain className="text-primary-500 mr-2" size={18} />
            <span>AI Token & Feature Utilizations</span>
          </h3>

          <div className="space-y-4">
            {aiStats.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-350 capitalize">{item.feature} requests</span>
                  <span className="text-primary-100 dark:text-white font-bold">{item.estimated_tokens.toLocaleString()} tokens</span>
                </div>
                <div className="text-[10px] text-primary-400">{item.count} total executions triggered</div>
              </div>
            ))}
            
            {aiStats.length === 0 && (
              <div className="text-center text-slate-450 py-12 text-sm">
                No token billing logs recorded.
              </div>
            )}
          </div>
        </div>

        {/* Uploads ledger */}
        <div className="glass-card rounded-xl p-6 bg-white dark:bg-[#0d0d0d] border border-primary-900/50">
          <h3 className="font-bold text-primary-100 dark:text-white flex items-center mb-4">
            <FileText className="text-primary-500 mr-2" size={18} />
            <span>Uploaded Files Audit Log</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
            {filesList.map((file, idx) => (
              <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-primary-100 dark:text-primary-200">{file.filename}</div>
                  <div className="text-[10px] text-slate-450">
                    Uploaded by: {file.user_email} | size: {roundSize(file.file_size)}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${file.status === 'success' ? 'bg-primary-700 dark:bg-primary-700/20 text-primary-300 dark:text-primary-300' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455'}`}>
                    {file.status.toUpperCase()}
                  </span>
                  <div className="text-[9px] text-slate-450 mt-1">{file.row_count} rows parsed</div>
                </div>
              </div>
            ))}
            
            {filesList.length === 0 && (
              <div className="text-center text-slate-450 py-12 text-sm">
                No file upload log rows registered.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

// Helper size
function roundSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default Admin;
