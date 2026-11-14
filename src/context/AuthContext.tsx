import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { PartnerProfile, TransportMode, User } from '../types/movex';

export type ActivityView = 'sender' | 'partner' | 'admin';

interface AuthContextValue {
  user: User | null;
  partnerProfile: PartnerProfile | null;
  activeActivity: ActivityView;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    role: 'sender' | 'partner';
    primaryMode?: TransportMode;
    vehicleNumber?: string;
  }) => Promise<User>;
  logout: () => void;
  switchActivity: (target: 'sender' | 'partner') => Promise<void>;
  refreshMe: () => Promise<void>;
  setActiveActivity: (activity: ActivityView) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActivityView>(() => {
    const saved = localStorage.getItem('movex_activity');
    if (saved === 'partner' || saved === 'admin') return saved;
    return 'sender';
  });
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('movex_token');
    if (!token) {
      setUser(null);
      setPartnerProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setPartnerProfile(data.partnerProfile || null);
      if (data.user.role === 'admin') {
        setActiveActivity('admin');
      } else if (data.user.role === 'partner' && !localStorage.getItem('movex_activity')) {
        setActiveActivity('partner');
      }
    } catch {
      localStorage.removeItem('movex_token');
      setUser(null);
      setPartnerProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('movex_token', data.token);
    setUser(data.user);
    setPartnerProfile(data.partnerProfile || null);
    const nextActivity: ActivityView =
      data.user.role === 'admin' ? 'admin' : data.user.role === 'partner' ? 'partner' : 'sender';
    setActiveActivity(nextActivity);
    localStorage.setItem('movex_activity', nextActivity);
    return data.user;
  };

  const register = async (payload: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    role: 'sender' | 'partner';
    primaryMode?: TransportMode;
    vehicleNumber?: string;
  }): Promise<User> => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('movex_token', data.token);
    setUser(data.user);
    setPartnerProfile(data.partnerProfile || null);
    const nextActivity: ActivityView = data.user.role === 'partner' ? 'partner' : 'sender';
    setActiveActivity(nextActivity);
    localStorage.setItem('movex_activity', nextActivity);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('movex_token');
    localStorage.removeItem('movex_activity');
    setUser(null);
    setPartnerProfile(null);
    setActiveActivity('sender');
  };

  const switchActivity = async (target: 'sender' | 'partner') => {
    if (!user) return;
    if (user.role === 'admin') return;
    const { data } = await api.post('/auth/switch-activity', { targetActivity: target });
    setUser(data.user);
    setPartnerProfile(data.partnerProfile || null);
    setActiveActivity(target);
    localStorage.setItem('movex_activity', target);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        partnerProfile,
        activeActivity,
        loading,
        login,
        register,
        logout,
        switchActivity,
        refreshMe,
        setActiveActivity
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
