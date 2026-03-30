from typing import List


def _closes(candles: List[dict]) -> List[float]:
    return [c["close"] for c in candles]


def calculate_rsi(candles: List[dict], period: int = 14) -> float:
    closes = _closes(candles)
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [d if d > 0 else 0.0 for d in deltas[-period:]]
    losses = [-d if d < 0 else 0.0 for d in deltas[-period:]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def calculate_sma(candles: List[dict], period: int) -> float:
    closes = _closes(candles)
    if len(closes) < period:
        return closes[-1] if closes else 0.0
    return sum(closes[-period:]) / period


def calculate_ema(candles: List[dict], period: int) -> float:
    closes = _closes(candles)
    if len(closes) < period:
        return closes[-1] if closes else 0.0
    k = 2.0 / (period + 1)
    ema = sum(closes[:period]) / period
    for price in closes[period:]:
        ema = price * k + ema * (1 - k)
    return ema


def calculate_bollinger_bands(
    candles: List[dict], period: int = 20, std_dev: float = 2.0
) -> tuple[float, float, float]:
    closes = _closes(candles)
    if len(closes) < period:
        price = closes[-1] if closes else 0.0
        return price, price, price
    window = closes[-period:]
    middle = sum(window) / period
    variance = sum((p - middle) ** 2 for p in window) / period
    std = variance ** 0.5
    return middle + std_dev * std, middle, middle - std_dev * std
