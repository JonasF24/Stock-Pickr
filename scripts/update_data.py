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


def build_stock_record(symbol: str) -> dict | None:
    tk = yf.Ticker(symbol)
    info = safe_info(tk)
    mcap = info.get("marketCap")
    if not mcap:
        return None

    rev1 = info.get("revenueGrowth") or 0
    earn1 = info.get("earningsGrowth") or 0
    roe = info.get("returnOnEquity") or 0
    de = (info.get("debtToEquity") or 0) / 100 if (info.get("debtToEquity") or 0) > 5 else (info.get("debtToEquity") or 0)
    fcf = info.get("freeCashflow") or 0
    peg = info.get("pegRatio") or 0

    # Approximate long-term growth proxies when point-in-time series is unavailable.
    rev5 = max(-1.0, rev1 * 2.2)
    earn5 = max(-1.0, earn1 * 1.8)

    return {
        "ticker": symbol.replace("-", "."),
        "name": info.get("shortName", symbol),
        "sector": info.get("sector", "Unknown"),
        "marketCap": int(mcap),
        "revenueGrowth1Y": rev1,
        "revenueGrowth5Y": rev5,
        "earningsGrowth1Y": earn1,
        "earningsGrowth5Y": earn5,
        "roe": roe,
        "debtToEquity": float(de),
        "freeCashFlowTTM": int(fcf),
        "peg": float(peg) if peg else 0.0,
        "dividendYield": float(info.get("dividendYield") or 0),
        "dividend": bool((info.get("dividendYield") or 0) > 0),
        "buffett": bool(roe and roe > 0.12 and de < 1.5 and (fcf or 0) > 0),
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
