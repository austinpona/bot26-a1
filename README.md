# Bot 26 A1 — Automated Trading Bot

Full-stack mobile trading bot: React Native (Expo) + Python FastAPI backend.

---

## Quick Start

### 1. Backend (Docker)

```bash
cd bot26-a1

# Generate a Fernet key (run once)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Add the key to docker-compose.yml FERNET_KEY env var, then:
docker-compose up --build
```

Backend runs at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### 2. Backend (Manual)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, FERNET_KEY

uvicorn app.main:app --reload --port 8000
```

### 3. Mobile App

```bash
cd mobile
npm install

cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL to your backend IP
# e.g. EXPO_PUBLIC_API_URL=http://192.168.1.x:8000

npx expo start
```

Scan the QR code with Expo Go (iOS/Android).

---

## Architecture

```
mobile/          React Native + Expo Router
backend/
  app/
    main.py          FastAPI entry point
    models/          SQLAlchemy models
    routers/         API route handlers
    services/
      trading_engine.py    Async bot loop
      broker_connector.py  Simulated + MT5 connectors
    utils/
      indicators.py    RSI, SMA, EMA, Bollinger Bands
      security.py      JWT, bcrypt, Fernet
    websocket.py       Real-time log push
docker-compose.yml   PostgreSQL + backend
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Login, get JWT |
| POST | /auth/logout | Invalidate session |
| POST | /account/link | Link broker account |
| GET | /account/status | Check linked account |
| POST | /license/validate | Activate license key |
| GET | /license/status | Check license |
| POST | /bot/start | Start trading engine |
| POST | /bot/stop | Stop trading engine |
| GET | /bot/status | Balance, equity, trades |
| GET | /logs | Paginated trade history |
| WS | /logs/live?token= | Real-time log stream |
| GET | /settings | Get bot settings |
| POST | /settings | Update strategy/SL/TP |

---

## Trading Engine

Runs as an async background task. Every 10 seconds:

1. Fetches candles for EURUSD, GBPUSD, USDJPY, XAUUSD
2. Calculates RSI(14), SMA(10), SMA(50)
3. **Scalping RSI**: BUY if RSI < 30 + uptrend, SELL if RSI > 70 + downtrend
4. Places order with SL/TP (in pips, always enforced)
5. Checks positions for SL/TP hits
6. Pushes all activity via WebSocket

Default broker: **SimulatedConnector** (no real account needed).
Live trading: set `MT5Connector` in `trading_engine.py` (requires Windows + MT5).

---

## License Keys

For development, any key ≥ 10 characters is accepted.
Replace `services/license_service.py` with real validation logic for production.

---

## Security

- Passwords: bcrypt
- JWTs: HS256, 24h expiry
- Broker credentials: Fernet (AES-128-CBC) encrypted at rest
- All secrets via environment variables — never hardcoded
