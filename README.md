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
- Search/category filters, responsive layout, dark and light mode.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project.
2. In GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` branch and `/ (root)` folder.
5. Your site URL will be:

```text
https://<your-github-username>.github.io/<your-repo-name>/
```
