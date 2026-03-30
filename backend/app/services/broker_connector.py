from abc import ABC, abstractmethod
from typing import List, Optional
import random
import asyncio
from datetime import datetime


class BrokerConnector(ABC):
    @abstractmethod
    async def connect(self, server: str, account: str, password: str) -> bool: ...

    @abstractmethod
    async def get_balance(self) -> dict: ...

    @abstractmethod
    async def get_candles(self, symbol: str, timeframe: str, count: int) -> List[dict]: ...

    @abstractmethod
    async def place_order(self, symbol: str, action: str, lot_size: float, sl: float, tp: float) -> dict: ...

    @abstractmethod
    async def close_order(self, ticket: str) -> bool: ...

    @abstractmethod
    async def get_positions(self) -> List[dict]: ...


# Base prices for simulation
BASE_PRICES = {
    "EURUSD": 1.0850,
    "GBPUSD": 1.2650,
    "USDJPY": 149.50,
    "XAUUSD": 2020.00,
}


class SimulatedConnector(BrokerConnector):
    def __init__(self):
        self._connected = False
        self._balance = 10000.0
        self._equity = 10000.0
        self._positions: List[dict] = []
        self._prices = {k: v for k, v in BASE_PRICES.items()}

    async def connect(self, server: str, account: str, password: str) -> bool:
        await asyncio.sleep(0.2)
        self._connected = True
        return True

    def _next_price(self, symbol: str) -> float:
        base = self._prices.get(symbol, 1.0)
        spread = base * 0.0002
        self._prices[symbol] = base + random.uniform(-spread, spread)
        return self._prices[symbol]

    async def get_balance(self) -> dict:
        pnl = sum(p.get("pnl", 0.0) for p in self._positions)
        self._equity = self._balance + pnl
        return {
            "balance": round(self._balance, 2),
            "equity": round(self._equity, 2),
            "open_trades": len(self._positions),
        }

    async def get_candles(self, symbol: str, timeframe: str, count: int) -> List[dict]:
        price = self._prices.get(symbol, BASE_PRICES.get(symbol, 1.0))
        candles = []
        for i in range(count):
            volatility = price * 0.001
            open_p = price + random.uniform(-volatility, volatility)
            close_p = open_p + random.uniform(-volatility, volatility)
            high_p = max(open_p, close_p) + abs(random.uniform(0, volatility))
            low_p = min(open_p, close_p) - abs(random.uniform(0, volatility))
            candles.append({"open": open_p, "high": high_p, "low": low_p, "close": close_p})
            price = close_p
        return candles

    async def place_order(self, symbol: str, action: str, lot_size: float, sl: float, tp: float) -> dict:
        price = self._next_price(symbol)
        pip = 0.0001 if "JPY" not in symbol else 0.01
        if symbol == "XAUUSD":
            pip = 0.1
        sl_price = price - sl * pip if action == "BUY" else price + sl * pip
        tp_price = price + tp * pip if action == "BUY" else price - tp * pip
        ticket = f"SIM-{random.randint(100000, 999999)}"
        position = {
            "ticket": ticket,
            "symbol": symbol,
            "action": action,
            "lot_size": lot_size,
            "entry_price": price,
            "sl_price": sl_price,
            "tp_price": tp_price,
            "pnl": 0.0,
            "opened_at": datetime.utcnow().isoformat(),
        }
        self._positions.append(position)
        return position

    async def close_order(self, ticket: str) -> bool:
        self._positions = [p for p in self._positions if p["ticket"] != ticket]
        return True

    async def get_positions(self) -> List[dict]:
        current = []
        for p in self._positions:
            price = self._next_price(p["symbol"])
            pip_val = 10.0 * p["lot_size"]
            pip = 0.0001 if "JPY" not in p["symbol"] else 0.01
            if p["symbol"] == "XAUUSD":
                pip = 0.1
                pip_val = 1.0 * p["lot_size"]
            diff = (price - p["entry_price"]) if p["action"] == "BUY" else (p["entry_price"] - price)
            p["pnl"] = round((diff / pip) * pip_val, 2)
            p["current_price"] = price
            current.append(p)
        return current

    async def check_sl_tp(self) -> List[dict]:
        """Returns list of positions that hit SL or TP."""
        closed = []
        remaining = []
        for p in self._positions:
            price = self._next_price(p["symbol"])
            hit = None
            if p["action"] == "BUY":
                if price <= p["sl_price"]:
                    hit = "SL_HIT"
                elif price >= p["tp_price"]:
                    hit = "TP_HIT"
            else:
                if price >= p["sl_price"]:
                    hit = "SL_HIT"
                elif price <= p["tp_price"]:
                    hit = "TP_HIT"
            if hit:
                pip = 0.0001 if "JPY" not in p["symbol"] else 0.01
                if p["symbol"] == "XAUUSD":
                    pip = 0.1
                pip_val = 10.0 * p["lot_size"]
                diff = (price - p["entry_price"]) if p["action"] == "BUY" else (p["entry_price"] - price)
                p["pnl"] = round((diff / pip) * pip_val, 2)
                self._balance += p["pnl"]
                p["status"] = hit
                p["close_price"] = price
                closed.append(p)
            else:
                remaining.append(p)
        self._positions = remaining
        return closed


class MetaApiConnector(BrokerConnector):
    """Cloud MT5 connector via MetaApi — works on Linux/Railway."""

    def __init__(self):
        self._api = None
        self._account = None
        self._connection = None
        self._api_token = None

    async def connect(self, server: str, account: str, password: str) -> bool:
        try:
            from metaapi_cloud_sdk import MetaApi
            import os
            self._api_token = os.environ.get("METAAPI_TOKEN", "")
            if not self._api_token:
                return False
            self._api = MetaApi(self._api_token)
            accounts = await self._api.metatrader_account_api.get_accounts_with_infinite_scroll_pagination()
            # Find existing account or create new one
            existing = next((a for a in accounts if a.login == account and a.type == "cloud"), None)
            if existing:
                self._account = existing
            else:
                self._account = await self._api.metatrader_account_api.create_account({
                    "name": f"Bot26A1-{account}",
                    "type": "cloud",
                    "login": account,
                    "password": password,
                    "server": server,
                    "platform": "mt5",
                    "magic": 260001,
                })
            await self._account.deploy()
            await self._account.wait_connected()
            self._connection = self._account.get_rpc_connection()
            await self._connection.connect()
            await self._connection.wait_synchronized()
            return True
        except Exception as e:
            print(f"MetaApi connect error: {e}")
            return False

    async def get_balance(self) -> dict:
        try:
            info = await self._connection.get_account_information()
            positions = await self._connection.get_positions()
            return {
                "balance": info["balance"],
                "equity": info["equity"],
                "open_trades": len(positions),
            }
        except Exception:
            return {"balance": 0, "equity": 0, "open_trades": 0}

    async def get_candles(self, symbol: str, timeframe: str, count: int) -> List[dict]:
        try:
            candles = await self._connection.get_historical_candles(symbol, timeframe, count=count)
            return [{"open": c["open"], "high": c["high"], "low": c["low"], "close": c["close"]} for c in candles]
        except Exception:
            return []

    async def place_order(self, symbol: str, action: str, lot_size: float, sl: float, tp: float) -> dict:
        try:
            price_data = await self._connection.get_symbol_price(symbol)
            price = price_data["ask"] if action == "BUY" else price_data["bid"]
            spec = await self._connection.get_symbol_specification(symbol)
            pip = spec.get("pipSize", 0.0001)
            sl_price = round(price - sl * pip, 5) if action == "BUY" else round(price + sl * pip, 5)
            tp_price = round(price + tp * pip, 5) if action == "BUY" else round(price - tp * pip, 5)
            if action == "BUY":
                result = await self._connection.create_market_buy_order(symbol, lot_size, sl_price, tp_price)
            else:
                result = await self._connection.create_market_sell_order(symbol, lot_size, sl_price, tp_price)
            return {
                "ticket": str(result.get("orderId", "")),
                "entry_price": price,
                "action": action,
                "symbol": symbol,
                "sl_price": sl_price,
                "tp_price": tp_price,
            }
        except Exception as e:
            raise Exception(f"MetaApi place_order error: {e}")

    async def close_order(self, ticket: str) -> bool:
        try:
            await self._connection.close_position(ticket)
            return True
        except Exception:
            return False

    async def get_positions(self) -> List[dict]:
        try:
            positions = await self._connection.get_positions()
            return [
                {
                    "ticket": p["id"],
                    "symbol": p["symbol"],
                    "action": "BUY" if p["type"] == "POSITION_TYPE_BUY" else "SELL",
                    "lot_size": p["volume"],
                    "entry_price": p["openPrice"],
                    "pnl": p.get("profit", 0),
                    "current_price": p.get("currentPrice", p["openPrice"]),
                }
                for p in positions
            ]
        except Exception:
            return []


class MT5Connector(BrokerConnector):
    """Live MT5 connector — requires MetaTrader5 package and Windows."""

    def __init__(self):
        self._mt5 = None

    async def connect(self, server: str, account: str, password: str) -> bool:
        import MetaTrader5 as mt5
        self._mt5 = mt5
        if not mt5.initialize():
            return False
        return mt5.login(int(account), password=password, server=server)

    async def get_balance(self) -> dict:
        info = self._mt5.account_info()
        if not info:
            return {"balance": 0, "equity": 0, "open_trades": 0}
        positions = self._mt5.positions_get()
        return {
            "balance": info.balance,
            "equity": info.equity,
            "open_trades": len(positions) if positions else 0,
        }

    async def get_candles(self, symbol: str, timeframe: str, count: int) -> List[dict]:
        import MetaTrader5 as mt5
        tf_map = {"M1": mt5.TIMEFRAME_M1, "M5": mt5.TIMEFRAME_M5, "H1": mt5.TIMEFRAME_H1}
        tf = tf_map.get(timeframe, mt5.TIMEFRAME_M5)
        rates = self._mt5.copy_rates_from_pos(symbol, tf, 0, count)
        if rates is None:
            return []
        return [{"open": r["open"], "high": r["high"], "low": r["low"], "close": r["close"]} for r in rates]

    async def place_order(self, symbol: str, action: str, lot_size: float, sl: float, tp: float) -> dict:
        import MetaTrader5 as mt5
        info = self._mt5.symbol_info(symbol)
        price = info.ask if action == "BUY" else info.bid
        pip = info.point * 10
        order_type = mt5.ORDER_TYPE_BUY if action == "BUY" else mt5.ORDER_TYPE_SELL
        sl_price = price - sl * pip if action == "BUY" else price + sl * pip
        tp_price = price + tp * pip if action == "BUY" else price - tp * pip
        req = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": lot_size,
            "type": order_type,
            "price": price,
            "sl": round(sl_price, info.digits),
            "tp": round(tp_price, info.digits),
            "magic": 260001,
            "comment": "Bot26A1",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        result = self._mt5.order_send(req)
        return {"ticket": str(result.order), "entry_price": price, "action": action, "symbol": symbol}

    async def close_order(self, ticket: str) -> bool:
        import MetaTrader5 as mt5
        pos = self._mt5.positions_get(ticket=int(ticket))
        if not pos:
            return False
        p = pos[0]
        order_type = mt5.ORDER_TYPE_SELL if p.type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
        info = self._mt5.symbol_info(p.symbol)
        price = info.bid if order_type == mt5.ORDER_TYPE_SELL else info.ask
        req = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": p.symbol,
            "volume": p.volume,
            "type": order_type,
            "position": p.ticket,
            "price": price,
            "magic": 260001,
            "comment": "Bot26A1 close",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        result = self._mt5.order_send(req)
        return result.retcode == mt5.TRADE_RETCODE_DONE

    async def get_positions(self) -> List[dict]:
        positions = self._mt5.positions_get()
        if not positions:
            return []
        return [
            {
                "ticket": str(p.ticket),
                "symbol": p.symbol,
                "action": "BUY" if p.type == 0 else "SELL",
                "lot_size": p.volume,
                "entry_price": p.price_open,
                "pnl": p.profit,
                "current_price": p.price_current,
            }
            for p in positions
        ]
