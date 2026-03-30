import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (name: string, email: string, password: string) =>
  api.post('/auth/register', { name, email, password }).then((r) => r.data);

export const logout = () => api.post('/auth/logout').then((r) => r.data);

// Account
export const linkAccount = (broker: string, server: string, accountNumber: string, password: string) =>
  api.post('/account/link', { broker, server, account_number: accountNumber, password }).then((r) => r.data);

export const getAccountStatus = () => api.get('/account/status').then((r) => r.data);

// License
export const validateLicense = (key: string) =>
  api.post('/license/validate', { license_key: key }).then((r) => r.data);

export const getLicenseStatus = () => api.get('/license/status').then((r) => r.data);

// Bot
export const startBot = () => api.post('/bot/start').then((r) => r.data);
export const stopBot = () => api.post('/bot/stop').then((r) => r.data);
export const getBotStatus = () => api.get('/bot/status').then((r) => r.data);

// Logs
export const getLogs = (page = 1, limit = 20) =>
  api.get('/logs', { params: { page, limit } }).then((r) => r.data);

// Settings
export const getSettings = () => api.get('/settings').then((r) => r.data);
export const updateSettings = (strategy_name: string, stop_loss: number, take_profit: number) =>
  api.post('/settings', { strategy_name, stop_loss, take_profit }).then((r) => r.data);

// WebSocket
export const createLiveLogsSocket = (token: string, onMessage: (data: any) => void): WebSocket => {
  const ws = new WebSocket(`${WS_URL}/logs/live?token=${token}`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };
  return ws;
};

export default api;
