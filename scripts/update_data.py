#!/usr/bin/env python3
"""Refresh stock classifications and index heatmap data.

Schedule:
- Daily (after market close): update index map prices/chg.
- Weekly: refresh category universe for top 500 US names.
- Frequent: sync earnings-release signals by re-pulling fundamentals.
"""

from __future__ import annotations

import datetime as dt
import json
import math
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

EXCLUDED = {"Financial Services", "Basic Materials", "Energy", "Utilities", "Real Estate"}
INDEX_DEFS = {
    "S&P 500": ["MSFT", "AAPL", "NVDA", "AMZN", "GOOGL", "META", "BRK-B", "LLY"],
    "Dow Jones": ["UNH", "MSFT", "HD", "MCD", "JPM", "V", "AAPL", "PG"],
    "Russell 2000": ["SMCI", "PLTR", "INTC", "PFE", "OXY", "AMD", "RBLX", "SOFI"],
    "Nasdaq 100": ["NVDA", "MSFT", "AAPL", "AMD", "ADBE", "NFLX", "AMZN", "GOOGL"],
    "S&P 400 MidCap": ["OXY", "PFE", "INTC", "SMCI", "PLTR", "COST", "MCD", "HD"],
}


def _norm_symbol(sym: str) -> str:
    return sym.replace(".", "-")


def fetch_sp500_symbols() -> list[str]:
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    tables = pd.read_html(url)
    df = tables[0]
    return [_norm_symbol(s) for s in df["Symbol"].tolist()][:500]


def safe_info(ticker: yf.Ticker) -> dict:
    try:
        return ticker.info or {}
    except Exception:
        return {}


def _num(value: object, default: float = 0.0) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(n) or math.isinf(n):
        return default
    return n


def _normalize_debt_to_equity(value: object) -> float:
    de = _num(value, 0.0)
    return de / 100 if de > 5 else de


def _derive_fcf_trend(ticker: yf.Ticker, info: dict, revenue_growth: float, op_margin: float) -> str:
    candidates = [
        "Free Cash Flow",
        "Operating Cash Flow",
        "Total Cash From Operating Activities",
    ]

    for table_name in ("cashflow", "quarterly_cashflow"):
        table = getattr(ticker, table_name, None)
        if table is None or table.empty:
            continue
        for row in candidates:
            if row not in table.index:
                continue
            series = table.loc[row].dropna()
            values = [_num(v) for v in series.tolist() if _num(v) != 0.0]
            if len(values) < 2:
                continue
            latest, prev = values[0], values[1]
            if prev == 0:
                return "up" if latest > 0 else "down"
            delta = (latest - prev) / abs(prev)
            if delta > 0.1:
                return "up"
            if delta < -0.1:
                return "down"
            return "stable"

    # Deterministic fallback when cash-flow history is unavailable.
    fcf = _num(info.get("freeCashflow"), 0.0)
    if fcf > 0 and revenue_growth >= 0 and op_margin >= 0.15:
        return "up"
    if fcf > 0:
        return "stable"
    return "down"


def _classify_risk(info: dict, revenue_growth: float, eps_growth: float, op_margin: float, debt_to_equity: float) -> str:
    beta = _num(info.get("beta"), 1.1)
    score = 0

    if beta > 1.4:
        score += 2
    elif beta > 1.1:
        score += 1

    if debt_to_equity > 2:
        score += 2
    elif debt_to_equity > 1:
        score += 1

    if op_margin < 0.08:
        score += 2
    elif op_margin < 0.15:
        score += 1

    if eps_growth < 0:
        score += 2
    elif eps_growth < 0.05:
        score += 1

    if revenue_growth < 0:
        score += 2
    elif revenue_growth < 0.04:
        score += 1

    if score <= 2:
        return "low"
    if score <= 5:
        return "mid"
    return "high"


def build_stock_record(symbol: str) -> dict | None:
    tk = yf.Ticker(symbol)
    info = safe_info(tk)
    mcap = info.get("marketCap")
    if not mcap:
        return None

    rev_growth = _num(info.get("revenueGrowth"), 0.0)
    eps_growth = _num(info.get("earningsGrowth"), 0.0)
    op_margin = _num(info.get("operatingMargins"), 0.0)
    roe = _num(info.get("returnOnEquity"), 0.0)
    de = _normalize_debt_to_equity(info.get("debtToEquity"))
    dividend_yield = max(0.0, _num(info.get("dividendYield"), 0.0))
    fcf_trend = _derive_fcf_trend(tk, info, rev_growth, op_margin)
    risk = _classify_risk(info, rev_growth, eps_growth, op_margin, de)

    return {
        "ticker": symbol.replace("-", "."),
        "name": info.get("shortName", symbol),
        "sector": info.get("sector", "Unknown"),
        "marketCap": int(mcap),
        "risk": risk,
        "revenueGrowth": rev_growth,
        "epsGrowth": eps_growth,
        "opMargin": op_margin,
        "fcfTrend": fcf_trend,
        "dividend": dividend_yield > 0,
        "dividendYield": dividend_yield,
        "buffett": bool(roe > 0.12 and de < 1.5 and op_margin > 0.15 and fcf_trend != "down"),
    }


def build_index_maps() -> list[dict]:
    out = []
    as_of = dt.date.today().isoformat()
    for idx, members in INDEX_DEFS.items():
        tiles = []
        for sym in members:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period="5d", interval="1d")
            if hist.empty or len(hist) < 2:
                continue
            prev_close = float(hist["Close"].iloc[-2])
            close = float(hist["Close"].iloc[-1])
            if prev_close <= 0:
                continue
            change = (close - prev_close) / prev_close * 100
            info = safe_info(ticker)
            weight = max(3, min(10, int((info.get("marketCap") or 10_000_000_000) / 500_000_000_000) + 3))
            tiles.append({"ticker": sym.replace("-", "."), "weight": weight, "changePct": round(change, 2)})

        out.append({"name": idx, "asOf": as_of, "tiles": tiles})
    return out


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)

    symbols = fetch_sp500_symbols()
    stocks = []
    for i, symbol in enumerate(symbols, start=1):
        rec = build_stock_record(symbol)
        if rec and rec["sector"] not in EXCLUDED:
            stocks.append(rec)
        if i % 50 == 0:
            print(f"Processed {i}/{len(symbols)}")

    stocks = sorted(stocks, key=lambda s: s["marketCap"], reverse=True)[:500]
    stocks = [{k: v for k, v in s.items() if k != "sector"} for s in stocks]

    (DATA / "stocks.json").write_text(json.dumps(stocks, indent=2))
    (DATA / "index-maps.json").write_text(json.dumps(build_index_maps(), indent=2))

    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    meta = {
        "last_market_refresh": now,
        "last_weekly_rebalance": now,
        "last_earnings_sync": now,
        "notes": "Auto-updated by GitHub Actions schedule."
    }
    (DATA / "update-meta.json").write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
