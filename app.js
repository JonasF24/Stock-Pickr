const strategyConfig = [
  { key: 'low', title: 'Low Risk Stocks', description: 'Stable earnings, strong balance sheets, resilient margins.' },
  { key: 'mid', title: 'Mid Risk Stocks', description: 'Balanced upside with moderate volatility and cyclical exposure.' },
  { key: 'high', title: 'High Risk Stocks', description: 'Higher growth/turnaround potential with elevated drawdown risk.' },
  { key: 'buffett', title: 'Warren Buffett Style', description: 'Durable moat + profitability + cash flow + valuation discipline.' },
  { key: 'dividend', title: 'Dividend + Growth', description: 'Income streams supported by healthy earnings growth.' }
];

const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin'
};

const CRYPTO_META = {
  BTC: { name: 'Bitcoin' },
  ETH: { name: 'Ethereum' },
  SOL: { name: 'Solana' },
  BNB: { name: 'BNB' }
};

const newsItems = [
  { title: 'Mega-cap earnings beat supports broad index sentiment', tag: 'Earnings', time: '2h ago' },
  { title: 'Fed commentary cools rate-cut expectations', tag: 'Macro', time: '4h ago' },
  { title: 'Energy majors guide lower on commodity softness', tag: 'Sector', time: '5h ago' }
];

const predictionMarkets = [
  { question: 'US recession in next 12 months', probability: '33%' },
  { question: 'Fed cuts >= 2 times this year', probability: '58%' },
  { question: 'S&P 500 closes year above 5600', probability: '47%' }
];

const SHEETS_WEB_APP_URL = '';
const GOOGLE_CLIENT_ID = '';
const ACCOUNT_STORAGE_KEY = 'stock_pickr_account';
const THEME_STORAGE_KEY = 'stock_pickr_theme';
const PRICE_CACHE_KEY = 'stock_pickr_prices';
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const state = { stocks: [], search: '', category: 'all', livePrices: {} };
const money = new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 });

const fmtPercent = (value) => `${(value * 100).toFixed(1)}%`;
const escapeHTML = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// ─── Live Price Fetching ────────────────────────────────────────────────────

/**
 * Fetch live quotes for a list of tickers via Yahoo Finance's public
 * query2 endpoint. No API key required. Returns a map of ticker → { price, changePercent }.
 */
async function fetchLivePrices(tickers) {
  if (!tickers.length) return {};

  // Check cache first
  try {
    const cached = localStorage.getItem(PRICE_CACHE_KEY);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < PRICE_CACHE_TTL_MS) {
        const allCached = tickers.every((t) => t in data);
        if (allCached) return data;
      }
    }
  } catch {
    // ignore cache errors
  }

  const symbols = tickers.map((t) => t.replace('.', '-')).join(',');
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChangePercent`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Yahoo Finance responded ${res.status}`);
    const json = await res.json();
    const quotes = json?.quoteResponse?.result || [];
    const map = {};
    for (const q of quotes) {
      const ticker = (q.symbol || '').replace('-', '.');
      map[ticker] = {
        price: q.regularMarketPrice ?? null,
        changePercent: q.regularMarketChangePercent ?? null
      };
    }
    // Cache result
    try {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: map }));
    } catch {
      // ignore storage errors
    }
    return map;
  } catch (err) {
    console.warn('Live price fetch failed:', err);
    return {};
  }
}

/**
 * Fetch live crypto prices from CoinGecko's free public API.
 * Returns a map of symbol → { price, changePercent }.
 */
async function fetchLiveCryptoPrices() {
  const ids = Object.values(CRYPTO_IDS).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
    const json = await res.json();
    const map = {};
    for (const [sym, id] of Object.entries(CRYPTO_IDS)) {
      const data = json[id];
      if (data) {
        map[sym] = {
          price: data.usd ?? null,
          changePercent: data.usd_24h_change ?? null
        };
      }
    }
    return map;
  } catch (err) {
    console.warn('Crypto price fetch failed:', err);
    return {};
  }
}

function formatLivePrice(price) {
  if (price === null || price === undefined) return null;
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function formatChangePercent(pct) {
  if (pct === null || pct === undefined) return null;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function changePctClass(pct) {
  if (pct === null || pct === undefined) return '';
  return pct >= 0 ? 'price-up' : 'price-down';
}

// ─── Data Freshness Badge ───────────────────────────────────────────────────

async function renderFreshnessBadge() {
  const target = document.getElementById('freshnessBadge');
  if (!target) return;
  try {
    const res = await fetch('./data/update-meta.json');
    if (!res.ok) return;
    const meta = await res.json();
    const raw = meta.last_market_refresh;
    if (!raw) return;
    const date = new Date(raw);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    target.textContent = `Data as of ${formatted}`;
    target.hidden = false;
  } catch {
    // silently skip if not available
  }
}

// ─── Index Maps (from data/index-maps.json) ────────────────────────────────

async function renderMaps() {
  const target = document.getElementById('indexMaps');
  if (!target) return;

  // Show loading state
  target.innerHTML = '<article class="stat-card glass"><p>Loading index maps…</p></article>';

  let maps = [];
  try {
    const res = await fetch('./data/index-maps.json');
    if (!res.ok) throw new Error(`Failed to load index maps (${res.status})`);
    maps = await res.json();
  } catch (err) {
    target.innerHTML = `<article class="stat-card glass"><p>Index maps unavailable</p><small class="mini-line">${escapeHTML(err.message)}</small></article>`;
    return;
  }

  target.innerHTML = maps
    .map((item) => {
      const tiles = item.tiles || [];
      const tilesHtml = tiles
        .map((tile) => {
          const cls = tile.changePct >= 0 ? 'price-up' : 'price-down';
          const sign = tile.changePct >= 0 ? '+' : '';
          return `<span class="index-tile ${cls}">${escapeHTML(tile.ticker)} <em>${sign}${tile.changePct.toFixed(2)}%</em></span>`;
        })
        .join('');
      const overallPct = tiles.length
        ? tiles.reduce((sum, t) => sum + t.changePct * (t.weight / 100), 0)
        : null;
      const overallStr = overallPct !== null
        ? `<span class="${changePctClass(overallPct)} price-badge">${overallPct >= 0 ? '+' : ''}${overallPct.toFixed(2)}%</span>`
        : '';
      return `
        <article class="stat-card glass index-map-card">
          <div class="index-map-header">
            <p>${escapeHTML(item.name)}</p>
            ${overallStr}
          </div>
          <div class="index-tiles">${tilesHtml}</div>
          <small class="mini-line">As of ${escapeHTML(item.asOf || 'recent')}</small>
        </article>`;
    })
    .join('');
}

// ─── News ───────────────────────────────────────────────────────────────────

function renderNews() {
  const target = document.getElementById('newsFeed');
  if (!target) return;
  target.innerHTML = newsItems
    .map(
      (item) =>
        `<section class="section-card glass"><div class="section-head"><h3>${escapeHTML(item.title)}</h3><span class="badge">${escapeHTML(
          item.tag
        )}</span></div><p class="mini-line">${escapeHTML(item.time)}</p></section>`
    )
    .join('');
}

// ─── Crypto (live) ──────────────────────────────────────────────────────────

async function renderCrypto() {
  const target = document.getElementById('cryptoBoard');
  if (!target) return;

  // Render skeleton with static fallback data first
  const staticPrices = { BTC: '$83,140', ETH: '$4,210', SOL: '$196', BNB: '$684' };
  const staticChanges = { BTC: '+1.8%', ETH: '+1.2%', SOL: '+2.6%', BNB: '+0.7%' };

  const renderAssets = (livePrices) => {
    target.innerHTML = Object.entries(CRYPTO_META)
      .map(([symbol, meta]) => {
        const live = livePrices[symbol];
        const priceStr = live?.price != null ? formatLivePrice(live.price) : staticPrices[symbol];
        const changePct = live?.changePercent ?? null;
        const changeStr = changePct != null ? formatChangePercent(changePct) : staticChanges[symbol];
        const changeCls = changePct != null ? changePctClass(changePct) : '';
        const liveTag = live ? '<span class="live-dot" title="Live price"></span>' : '';
        return `<article class="stat-card glass">
          <p>${escapeHTML(symbol)} · ${escapeHTML(meta.name)} ${liveTag}</p>
          <strong>${escapeHTML(priceStr)}</strong>
          <small class="mini-line ${changeCls}">24h ${escapeHTML(changeStr)}</small>
        </article>`;
      })
      .join('');
  };

  // Render with static data immediately, then upgrade with live data
  renderAssets({});
  const livePrices = await fetchLiveCryptoPrices();
  renderAssets(livePrices);
}

// ─── Prediction Markets ─────────────────────────────────────────────────────

function renderPredictionMarkets() {
  const target = document.getElementById('predictionBoard');
  if (!target) return;
  target.innerHTML = predictionMarkets
    .map(
      (item) => {
        const pct = parseInt(item.probability, 10);
        return `<section class="section-card glass">
          <div class="section-head">
            <h3>${escapeHTML(item.question)}</h3>
            <span class="badge">${escapeHTML(item.probability)}</span>
          </div>
          <div class="prob-bar-track">
            <div class="prob-bar-fill" style="width:${pct}%"></div>
          </div>
        </section>`;
      }
    )
    .join('');
}

// ─── Stock Pick Logic ───────────────────────────────────────────────────────

function scoreStock(stock) {
  const growthScore = stock.revenueGrowth * 30 + stock.epsGrowth * 30;
  const profitabilityScore = stock.opMargin * 25;
  const cashFlowScore = stock.fcfTrend === 'up' ? 10 : stock.fcfTrend === 'stable' ? 5 : -8;
  const dividendScore = stock.dividend ? Math.min(stock.dividendYield * 300, 10) : 0;
  return growthScore + profitabilityScore + cashFlowScore + dividendScore;
}

function evaluateCategory(stock, category) {
  const score = scoreStock(stock);

  if (category === 'all') return { match: true };
  if (category === 'buffett') return { match: stock.buffett };
  if (category === 'dividend') return { match: stock.dividend };
  if (category === 'low' || category === 'mid') return { match: stock.risk === category };

  if (category === 'high') {
    if (stock.risk !== 'high') return { match: false };
    if (score < 35) return { match: false, reason: 'Risk score too low' };
    return { match: true };
  }

  return { match: false };
}

function matchesCategory(stock, category) {
  return evaluateCategory(stock, category).match;
}

function matchesSearch(stock, search) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return stock.ticker.toLowerCase().includes(needle) || stock.name.toLowerCase().includes(needle);
}

function filteredStocks() {
  return state.stocks.filter((stock) => matchesCategory(stock, state.category) && matchesSearch(stock, state.search));
}

function buildStats(stocks) {
  const statsGrid = document.getElementById('statsGrid');
  if (!statsGrid) return;
  const avgScore = stocks.length ? (stocks.reduce((sum, stock) => sum + scoreStock(stock), 0) / stocks.length).toFixed(1) : '0.0';
  const stats = [
    { label: 'Stocks displayed', value: stocks.length },
    { label: 'Universe baseline', value: 'Top 500 US' },
    { label: 'Avg strategy score', value: avgScore },
    { label: 'Dividend candidates', value: stocks.filter((s) => s.dividend).length }
  ];
  statsGrid.innerHTML = stats.map((item) => `<article class="stat-card glass"><p>${item.label}</p><strong>${item.value}</strong></article>`).join('');
}

function renderStockCard(stock) {
  const tags = [];
  if (stock.buffett) tags.push('Buffett fit');
  if (stock.dividend) tags.push('Dividend');

  const live = state.livePrices[stock.ticker];
  let priceHtml = '';
  if (live?.price != null) {
    const priceStr = formatLivePrice(live.price);
    const changePct = live.changePercent;
    const changeStr = changePct != null ? formatChangePercent(changePct) : '';
    const changeCls = changePctClass(changePct);
    priceHtml = `
      <div class="stock-live-price">
        <span class="live-price-value">${escapeHTML(priceStr)}</span>
        ${changeStr ? `<span class="live-price-change ${changeCls}">${escapeHTML(changeStr)}</span>` : ''}
        <span class="live-dot" title="Live price"></span>
      </div>`;
  }

  return `<article class="stock-card">
    <div class="stock-card-header">
      <h4>${escapeHTML(stock.ticker)} · ${escapeHTML(stock.name)}</h4>
      ${priceHtml}
    </div>
    <div class="stock-meta"><span>Mkt Cap ${escapeHTML(money.format(stock.marketCap))}</span><span>${escapeHTML(stock.risk.toUpperCase())} RISK</span></div>
    <div class="stock-meta"><span>Rev ${escapeHTML(fmtPercent(stock.revenueGrowth))}</span><span>EPS ${escapeHTML(fmtPercent(stock.epsGrowth))}</span></div>
    <div class="stock-meta"><span>Op Margin ${escapeHTML(fmtPercent(stock.opMargin))}</span><span>Score ${escapeHTML(scoreStock(stock).toFixed(1))}</span></div>
    <div style="display:flex; gap:.4rem; margin-top:.55rem; flex-wrap:wrap;">${tags.map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`).join('')}</div>
  </article>`;
}

function renderSections(stocks) {
  const sectionsRoot = document.getElementById('strategySections');
  if (!sectionsRoot) return;

  const sortByScoreDesc = (a, b) => scoreStock(b) - scoreStock(a);
  const getCategoryStocks = (category) => stocks.filter((s) => evaluateCategory(s, category).match).sort(sortByScoreDesc);

  const grouped = {
    low: getCategoryStocks('low'),
    mid: getCategoryStocks('mid'),
    high: getCategoryStocks('high'),
    buffett: getCategoryStocks('buffett'),
    dividend: getCategoryStocks('dividend')
  };

  sectionsRoot.innerHTML = strategyConfig
    .map((section) => {
      const picks = grouped[section.key].slice(0, 6);
      return `<section class="section-card glass"><div class="section-head"><div><h3>${escapeHTML(section.title)}</h3><small>${escapeHTML(
        section.description
      )}</small></div><span class="badge">${escapeHTML(grouped[section.key].length)} matches</span></div><div class="stock-grid">${
        picks.length ? picks.map((stock) => renderStockCard(stock)).join('') : '<p>No stocks match this filter.</p>'
      }</div></section>`;
    })
    .join('');
}

function wireFilters() {
  const search = document.getElementById('search');
  const categoryFilter = document.getElementById('categoryFilter');
  if (!search || !categoryFilter) return;
  search.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderStockPicks();
  });
  categoryFilter.addEventListener('change', (e) => {
    state.category = e.target.value;
    renderStockPicks();
  });
}

function renderStockPicks() {
  const stocks = filteredStocks();
  buildStats(stocks);
  renderSections(stocks);
}

async function initStockPicks() {
  const sectionsRoot = document.getElementById('strategySections');
  if (!sectionsRoot) return;

  const statsGrid = document.getElementById('statsGrid');
  const renderLoadError = (message) => {
    sectionsRoot.innerHTML = `<section class="section-card glass"><div class="section-head"><h3>Unable to load stock picks</h3></div><p>${message}</p><p class="mini-line">Please try refreshing the page. If the issue persists, verify the data source is available.</p></section>`;
    if (statsGrid) {
      statsGrid.innerHTML = `<article class="stat-card glass"><p>Stock picks status</p><strong>Data unavailable</strong><small class="mini-line">${message}</small></article>`;
    }
  };

  try {
    const res = await fetch('./data/stocks.json');
    if (!res.ok) {
      throw new Error(`Stock data request failed (${res.status} ${res.statusText || 'unknown status'})`);
    }
    state.stocks = await res.json();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize stock picks:', error);
    renderLoadError(`Stock data could not be loaded: ${detail}.`);
    return;
  }

  wireFilters();
  // Render immediately with static data
  renderStockPicks();

  // Fetch live prices for all tickers, then re-render with prices overlaid
  const tickers = state.stocks.map((s) => s.ticker);
  const livePrices = await fetchLivePrices(tickers);
  if (Object.keys(livePrices).length > 0) {
    state.livePrices = livePrices;
    renderStockPicks();
  }
}

// ─── Account / Auth ─────────────────────────────────────────────────────────

function getStoredAccount() {
  const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    return null;
  }
}

function saveAccount(account) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

function setTheme(nextTheme) {
  const html = document.documentElement;
  html.dataset.theme = nextTheme;
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function applyStoredTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    setTheme(storedTheme);
  }
}

async function saveSignupToSheet(payload) {
  if (!SHEETS_WEB_APP_URL) return;
  const response = await fetch(SHEETS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status}`);
  }
}

function parseJwtPayload(token) {
  const [, payloadPart] = token.split('.');
  if (!payloadPart) return null;
  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Unable to parse Google credential payload', error);
    return null;
  }
}

function setAvatar(avatarNode, account) {
  if (!avatarNode) return;
  avatarNode.style.backgroundImage = '';
  avatarNode.style.backgroundSize = '';
  avatarNode.style.backgroundPosition = '';

  if (!account) {
    avatarNode.textContent = '👤';
    return;
  }
  if (account.picture) {
    avatarNode.textContent = '';
    avatarNode.style.backgroundImage = `url(${account.picture})`;
    avatarNode.style.backgroundSize = 'cover';
    avatarNode.style.backgroundPosition = 'center';
    return;
  }
  avatarNode.textContent = account.fullName ? account.fullName[0].toUpperCase() : '👤';
}

function updateAccountUI() {
  const account = getStoredAccount();
  const avatar = document.getElementById('accountAvatar');
  const label = document.getElementById('accountLabel');
  const status = document.getElementById('accountStatus');
  const signOut = document.getElementById('signOutButton');

  if (!avatar || !label || !status || !signOut) return;

  if (account) {
    setAvatar(avatar, account);
    label.textContent = account.fullName || 'Account';
    status.textContent = `Connected as ${account.fullName} via ${account.authMethod === 'google' ? 'Google' : 'email + phone'}.`;
    signOut.hidden = false;
  } else {
    setAvatar(avatar, null);
    label.textContent = 'Account';
    status.textContent = 'No account connected.';
    signOut.hidden = true;
  }
}

function setupAccountMenu() {
  applyStoredTheme();

  const menuRoot = document.getElementById('accountMenuRoot');
  const menuButton = document.getElementById('accountMenuButton');
  const panel = document.getElementById('accountMenuPanel');
  const signupForm = document.getElementById('emailSignupForm');
  const message = document.getElementById('signupMessage');
  const googleConfigHint = document.getElementById('googleConfigHint');
  const googleSigninButton = document.getElementById('googleSigninButton');
  const phone = document.getElementById('phone');
  const themeButton = document.getElementById('menuThemeToggle');
  const signOutButton = document.getElementById('signOutButton');

  if (!menuRoot || !menuButton || !panel || !signupForm || !message || !googleConfigHint || !googleSigninButton || !phone || !themeButton || !signOutButton) {
    return;
  }

  phone.required = true;

  menuButton.addEventListener('click', () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    menuButton.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (event) => {
    if (!menuRoot.contains(event.target)) {
      panel.hidden = true;
      menuButton.setAttribute('aria-expanded', 'false');
    }
  });

  themeButton.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(current);
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(signupForm);
    const account = {
      authMethod: 'email_phone',
      fullName: String(formData.get('fullName')).trim(),
      email: String(formData.get('email')).trim(),
      phone: String(formData.get('phone')).trim(),
      createdAt: new Date().toISOString()
    };
    if (!account.fullName || !account.email) {
      message.textContent = 'Please complete your name and email.';
      return;
    }
    if (!account.phone) {
      message.textContent = 'Phone is required for Email + phone sign up.';
      return;
    }
    try {
      await saveSignupToSheet(account);
      saveAccount(account);
      updateAccountUI();
      message.textContent = SHEETS_WEB_APP_URL
        ? 'Account created and saved to Google Sheets.'
        : 'Account created locally. Add your Google Sheets Web App URL in app.js to sync signups.';
      signupForm.reset();
    } catch (error) {
      message.textContent = 'Account created locally, but syncing to Google Sheets failed.';
      saveAccount(account);
      updateAccountUI();
      console.error(error);
    }
  });

  signOutButton.addEventListener('click', () => {
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    updateAccountUI();
    message.textContent = 'Signed out.';
  });

  const handleGoogleCredentialResponse = async (response) => {
    const claims = parseJwtPayload(response.credential || '');
    if (!claims || !claims.email) {
      message.textContent = 'Google sign-in failed: invalid credential payload.';
      return;
    }
    const account = {
      authMethod: 'google',
      fullName: claims.name || claims.given_name || 'Google User',
      email: claims.email,
      phone: '',
      picture: claims.picture || '',
      createdAt: new Date().toISOString()
    };
    try {
      await saveSignupToSheet(account);
      saveAccount(account);
      updateAccountUI();
      message.textContent = SHEETS_WEB_APP_URL
        ? 'Google account connected and saved to Google Sheets.'
        : 'Google account connected locally. Add your Google Sheets Web App URL in app.js to sync signups.';
    } catch (error) {
      saveAccount(account);
      updateAccountUI();
      message.textContent = 'Google account connected locally, but syncing to Google Sheets failed.';
      console.error(error);
    }
  };

  const renderGoogleButton = (attempt = 0) => {
    if (!GOOGLE_CLIENT_ID) {
      googleConfigHint.textContent = 'Set GOOGLE_CLIENT_ID in app.js to enable Google Sign-In.';
      return;
    }
    if (!window.google?.accounts?.id) {
      if (attempt < 6) {
        window.setTimeout(() => renderGoogleButton(attempt + 1), 500);
        return;
      }
      googleConfigHint.textContent = 'Google Identity Services failed to load. Please refresh the page.';
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse
    });
    window.google.accounts.id.renderButton(googleSigninButton, {
      theme: 'outline',
      size: 'medium',
      shape: 'pill',
      text: 'continue_with',
      width: 260
    });
    googleConfigHint.textContent = 'Google Sign-In ready.';
  };

  renderGoogleButton();
  updateAccountUI();
}

// ─── Boot ────────────────────────────────────────────────────────────────────

async function init() {
  setupAccountMenu();
  renderFreshnessBadge();
  renderMaps();
  renderNews();
  renderCrypto();
  renderPredictionMarkets();
  await initStockPicks();
}

init();
