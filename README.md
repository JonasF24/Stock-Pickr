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
- Account + settings menu with:
  - blank profile icon before signup
  - Google Sign-In (GIS button)
  - email + phone signup form
  - in-menu light/dark toggle
- Search/category filters, responsive layout, dark and light mode.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Google Sign-In setup (GIS)

1. In Google Cloud Console, create/use a project.
2. Configure the OAuth consent screen.
3. Create OAuth Client ID credentials for a **Web application**.
4. Add authorized JavaScript origins (including your local/dev origin).
5. Copy your client ID into `GOOGLE_CLIENT_ID` in `app.js`.

The GIS script is already included in every page header:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

> Important: the client currently decodes the ID token payload for UI/profile display. For production auth, send the ID token to your backend and verify it server-side with Google's libraries before creating a trusted session.

## Google Sheets signup sync

Set `SHEETS_WEB_APP_URL` in `app.js` to your deployed Google Apps Script Web App endpoint.

The signup sync payload intentionally excludes password and only sends:
- `authMethod`
- `fullName`
- `email`
- `phone`
- `picture` (for Google sign-in when present)
- `createdAt`
