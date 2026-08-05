import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  // Load user data on startup if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          setTheme(response.data.theme || 'dark');
        } catch (error) {
          console.error("Failed to load user session", error);
          logout();
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  // Synchronize theme changes with HTML document body classes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#0b0f19'; // Sleep slate color
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc';
    }
  }, [theme]);

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Fetch user info
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      setTheme(userResponse.data.theme || 'dark');
      return { success: true };
    } catch (error) {
      console.error("Login failure:", error);
      const detail = error.response?.data?.detail || "Invalid email or password.";
      return { success: false, error: detail };
    }
  };

  const register = async (email, password, fullName, companyName, currency, taxRate) => {
    try {
      await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        company_name: companyName,
        currency,
        tax_rate: parseFloat(taxRate) || 0.0,
        theme: 'dark'
      });
      
      // Automatically log in after registration
      return await login(email, password);
    } catch (error) {
      console.error("Registration failure:", error);
      const detail = error.response?.data?.detail || "Registration failed. Try again.";
      return { success: false, error: detail };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      setUser(response.data);
      if (profileData.theme) {
        setTheme(profileData.theme);
      }
      return { success: true };
    } catch (error) {
      console.error("Profile update failed:", error);
      return { success: false, error: error.response?.data?.detail || "Update failed." };
    }
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (user) {
      // Sync to database
      await updateProfile({ theme: nextTheme });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
