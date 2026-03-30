export interface User {
  user_id: string;
  name: string;
  email: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

export interface BotStatus {
  is_active: boolean;
  balance: number;
  equity: number;
  open_trades_count: number;
  strategy: string;
}

export interface AccountStatus {
  linked: boolean;
  broker?: string;
  server?: string;
  account_number?: string;
}

export interface LicenseStatus {
  active: boolean;
  status?: string;
  expires_at?: string;
  license_key_masked?: string;
}

export interface LogEntry {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  status: 'OPEN' | 'CLOSED' | 'TP_HIT' | 'SL_HIT';
  log_message: string;
  created_at: string;
}

export interface BotSettings {
  strategy_name: string;
  stop_loss: number;
  take_profit: number;
  two_factor_enabled: boolean;
}

export interface LiveLog {
  message: string;
  timestamp: string;
}
