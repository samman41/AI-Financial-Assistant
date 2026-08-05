import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  MessageSquare,
  FileDown,
  Settings,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Building
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard',        path: '/',             icon: LayoutDashboard },
    { name: 'Transactions',     path: '/transactions', icon: Receipt },
    { name: 'Import Ledger',    path: '/import',       icon: FileSpreadsheet },
    { name: 'Cash Forecasting', path: '/forecasting',  icon: TrendingUp },
    { name: 'Analytics',        path: '/analytics',    icon: BarChart3 },
    { name: 'AI Chat Assistant',path: '/chat',         icon: MessageSquare, badge: 'AI' },
    { name: 'Report Generator', path: '/reports',      icon: FileDown },
    { name: 'Settings',         path: '/settings',     icon: Settings },
  ];

  if (user?.is_admin) {
    menuItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldCheck });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen text-primary-100 flex flex-col md:flex-row" style={{ backgroundColor: '#000000' }}>

      {/* Mobile Top Bar */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: '#0d0d0d', borderColor: '#0f5480' }}>
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg text-black" style={{ backgroundColor: '#89cff0' }}>
            <Building size={20} />
          </div>
          <span className="font-bold text-lg text-white">Antigravity Finance</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-all"
            style={{ color: '#89cff0' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full transition-all"
            style={{ color: '#89cff0' }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-4/5 max-w-sm h-full p-6 shadow-premium flex flex-col animate-fade-in" style={{ backgroundColor: '#0d0d0d' }}>
            <div className="flex justify-between items-center pb-6 border-b" style={{ borderColor: '#0f5480' }}>
              <span className="font-bold text-white flex items-center space-x-2">
                <Building style={{ color: '#89cff0' }} />
                <span>{user?.company_name || 'Antigravity Finance'}</span>
              </span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded">
                <X size={20} style={{ color: '#89cff0' }} />
              </button>
            </div>

            <nav className="flex-1 mt-6 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={isActive
                      ? { backgroundColor: '#1a87c0', color: '#ffffff', fontWeight: 600 }
                      : { color: '#89cff0' }
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#051f32', color: '#89cff0' }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-6 border-t" style={{ borderColor: '#0f5480' }}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-black" style={{ backgroundColor: '#89cff0' }}>
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">{user?.full_name}</h4>
                  <span className="text-xs" style={{ color: '#5ab8e8' }}>{user?.email}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-rose-400 hover:bg-rose-950/20 rounded-xl transition-all"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-72 p-6 border-r" style={{ backgroundColor: '#0d0d0d', borderColor: '#0f5480' }}>
        <div className="flex items-center space-x-2 px-2 pb-6 mb-4 border-b" style={{ borderColor: '#0f5480' }}>
          <div className="p-2.5 rounded-lg text-black shadow-premium-blue" style={{ backgroundColor: '#89cff0' }}>
            <Building size={20} />
          </div>
          <div className="truncate">
            <h2 className="font-bold text-white truncate">{user?.company_name || 'My Company'}</h2>
            <span className="text-xs" style={{ color: '#5ab8e8' }}>SMB AI Finance</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150"
                style={isActive
                  ? { backgroundColor: '#1a87c0', color: '#ffffff', fontWeight: 600 }
                  : { color: '#89cff0' }
                }
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#0f1a24'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#051f32', color: '#89cff0' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="pt-6 border-t" style={{ borderColor: '#0f5480' }}>
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center space-x-3 truncate">
              <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm text-black shadow-premium-blue" style={{ backgroundColor: '#89cff0' }}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <h4 className="font-semibold text-xs text-white truncate">{user?.full_name}</h4>
                <span className="text-[10px] truncate block" style={{ color: '#5ab8e8' }}>{user?.email}</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#89cff0' }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-rose-400 hover:bg-rose-950/20 rounded-xl transition-all"
          >
            <LogOut size={16} />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in overflow-y-auto">
          {children}
        </div>
      </main>

    </div>
  );
};

export default Layout;
