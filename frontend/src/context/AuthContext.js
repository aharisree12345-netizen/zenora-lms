import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setClientToken } from '../api/client';
import { storage } from '../utils/storage';

const AuthContext = createContext();

const STORAGE_KEY = 'zenora_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize auth session: Restores authenticated session from persistent storage
  useEffect(() => {
    async function initAuth() {
      try {
        const savedToken = await storage.getItem(STORAGE_KEY);

        if (savedToken) {
          setClientToken(savedToken);
          const res = await api.getProfile();
          if (res.ok && res.data.success && res.data.user) {
            setUser(res.data.user);
            setToken(savedToken);
            fetchUnread(savedToken);
          } else {
            // Stale or invalid token - clear session
            await storage.removeItem(STORAGE_KEY);
            setClientToken(null);
            setUser(null);
            setToken(null);
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('[Auth Init Error]', err);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  async function fetchUnread(activeToken) {
    try {
      const res = await api.getNotifications();
      if (res.ok && res.data.success) {
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (e) {}
  }

  const login = async (identifier, password) => {
    // Keep AuthScreen mounted during login attempt; form shows local spinner
    const res = await api.login(identifier, password);
    if (res.ok && res.data.success && res.data.user) {
      setUser(res.data.user);
      setToken(res.data.token);
      setClientToken(res.data.token);
      await storage.setItem(STORAGE_KEY, res.data.token);
      fetchUnread(res.data.token);
      return { success: true, user: res.data.user };
    }
    return { success: false, message: res.data?.message || 'Invalid credentials or login failed.' };
  };

  const switchRole = async (targetRole) => {
    setLoading(true);
    const res = await api.switchRole(targetRole);
    if (res.ok && res.data.success && res.data.user) {
      setUser(res.data.user);
      setToken(res.data.token);
      setClientToken(res.data.token);
      await storage.setItem(STORAGE_KEY, res.data.token);
      fetchUnread(res.data.token);
      setLoading(false);
      return { success: true, user: res.data.user };
    }
    setLoading(false);
    return { success: false, message: res.data?.message };
  };

  const logout = async () => {
    await storage.removeItem(STORAGE_KEY);
    setUser(null);
    setToken(null);
    setClientToken(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getProfile();
      if (res.ok && res.data.success && res.data.user) {
        setUser(res.data.user);
      }
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        unreadCount,
        login,
        logout,
        switchRole,
        refreshProfile,
        refreshNotifications: fetchUnread
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
