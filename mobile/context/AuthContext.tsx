import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/api';

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync('jwt_token');
        const storedUser = await SecureStore.getItemAsync('user_data');
        if (stored && storedUser) {
          setToken(stored);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    await SecureStore.setItemAsync('jwt_token', data.access_token);
    const u: User = { user_id: data.user_id, name: data.name, email: data.email };
    await SecureStore.setItemAsync('user_data', JSON.stringify(u));
    setToken(data.access_token);
    setUser(u);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiRegister(name, email, password);
    await SecureStore.setItemAsync('jwt_token', data.access_token);
    const u: User = { user_id: data.user_id, name: data.name, email: data.email };
    await SecureStore.setItemAsync('user_data', JSON.stringify(u));
    setToken(data.access_token);
    setUser(u);
  };

  const logout = async () => {
    try { await apiLogout(); } catch {}
    await SecureStore.deleteItemAsync('jwt_token');
    await SecureStore.deleteItemAsync('user_data');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
