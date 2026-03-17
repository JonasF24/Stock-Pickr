# Stock Pickr Strategies

A modern, green-glow multi-page investing dashboard inspired by strategy-screen experiences.

## Pages

- `index.html` → Stock picks (default)
- `maps.html` → Index maps for top 5 indexes:
  - S&P 500
  - Dow Jones
  - Russell 2000
  - Nasdaq 100
  - S&P 400 MidCap
- `news.html` → Market news feed
- `crypto.html` → Crypto board
- `prediction-markets.html` → Prediction market probabilities

## Features

- US large-cap stock strategy board (top-500 baseline).
- Categories:
  - Low risk
  - Mid risk
  - High risk
  - Warren Buffett style
  - Dividend + Growth
- Earnings-report-driven scoring inputs:
  - Revenue growth
  - EPS growth
  - Operating margin
  - Free cash flow trend
  - Dividend quality signal
- Top banner navigation across all pages.
- Account + settings menu with blank profile icon until signup, Google/email+phone signup form, and in-menu light/dark toggle.
- Search/category filters, responsive layout, dark and light mode.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```


## Google Sheets signup sync

Set `SHEETS_WEB_APP_URL` in `app.js` to your deployed Google Apps Script Web App endpoint. The signup flow stores `authMethod`, name, email, phone, and timestamp only (password is intentionally excluded).
