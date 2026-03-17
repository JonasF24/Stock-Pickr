const strategyConfig = [
  { key: 'low', title: 'Low Risk Stocks', description: 'Stable earnings, strong balance sheets, resilient margins.' },
  { key: 'mid', title: 'Mid Risk Stocks', description: 'Balanced upside with moderate volatility and cyclical exposure.' },
  { key: 'high', title: 'High Risk Stocks', description: 'Higher growth/turnaround potential with elevated drawdown risk.' },
  { key: 'buffett', title: 'Warren Buffett Style', description: 'Durable moat + profitability + cash flow + valuation discipline.' },
  { key: 'dividend', title: 'Dividend + Growth', description: 'Income streams supported by healthy earnings growth.' }
];

const indexMaps = [
  { name: 'S&P 500', tickers: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'], change: '+0.8%' },
  { name: 'Dow Jones', tickers: ['UNH', 'MSFT', 'HD', 'MCD', 'JPM'], change: '+0.3%' },
  { name: 'Russell 2000', tickers: ['SMCI', 'PLTR', 'INTC', 'PFE', 'OXY'], change: '-0.2%' },
  { name: 'Nasdaq 100', tickers: ['NVDA', 'MSFT', 'AAPL', 'AMD', 'ADBE'], change: '+1.2%' },
  { name: 'S&P 400 MidCap', tickers: ['OXY', 'PFE', 'INTC', 'PLTR', 'SMCI'], change: '+0.1%' }
];

const newsItems = [
  { title: 'Mega-cap earnings beat supports broad index sentiment', tag: 'Earnings', time: '2h ago' },
  { title: 'Fed commentary cools rate-cut expectations', tag: 'Macro', time: '4h ago' },
  { title: 'Energy majors guide lower on commodity softness', tag: 'Sector', time: '5h ago' }
];

const cryptoAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$68,420', change: '+2.1%' },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,640', change: '+1.6%' },
  { symbol: 'SOL', name: 'Solana', price: '$172', change: '+3.7%' },
  { symbol: 'BNB', name: 'BNB', price: '$612', change: '+0.9%' }
];

const predictionMarkets = [
  { question: 'US recession in next 12 months', probability: '33%' },
  { question: 'Fed cuts >= 2 times this year', probability: '58%' },
  { question: 'S&P 500 closes year above 5600', probability: '47%' }
];

const SHEETS_WEB_APP_URL = '';
const ACCOUNT_STORAGE_KEY = 'stock_pickr_account';
const THEME_STORAGE_KEY = 'stock_pickr_theme';

const state = { stocks: [], search: '', category: 'all' };
const money = new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 });

const fmtPercent = (value) => `${(value * 100).toFixed(1)}%`;
const escapeHTML = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

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

function updateAccountUI() {
  const account = getStoredAccount();
  const avatar = document.getElementById('accountAvatar');
  const label = document.getElementById('accountLabel');
  const status = document.getElementById('accountStatus');
  const signOut = document.getElementById('signOutButton');

  if (!avatar || !label || !status || !signOut) return;

  if (account) {
    avatar.textContent = account.fullName ? account.fullName[0].toUpperCase() : '👤';
    label.textContent = account.fullName || 'Account';
    status.textContent = `Connected as ${account.fullName} via ${account.authMethod === 'google' ? 'Google' : 'email + phone'}.`;
    signOut.hidden = false;
  } else {
    avatar.textContent = '👤';
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
  const signupForm = document.getElementById('signupForm');
  const message = document.getElementById('signupMessage');
  const authMethod = document.getElementById('authMethod');
  const phone = document.getElementById('phone');
  const password = document.getElementById('password');
  const themeButton = document.getElementById('menuThemeToggle');
  const signOutButton = document.getElementById('signOutButton');

  if (!menuRoot || !menuButton || !panel || !signupForm || !message || !authMethod || !phone || !password || !themeButton || !signOutButton) {
    return;
  }

  const updateMethodRequirements = () => {
    const isEmailPhone = authMethod.value === 'email_phone';
    phone.required = isEmailPhone;
    password.required = isEmailPhone;
    password.placeholder = isEmailPhone ? 'Create password' : 'Not needed for Google sign up';
  };

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

  authMethod.addEventListener('change', updateMethodRequirements);

  themeButton.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(current);
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(signupForm);
    const account = {
      authMethod: String(formData.get('authMethod')),
      fullName: String(formData.get('fullName')).trim(),
      email: String(formData.get('email')).trim(),
      phone: String(formData.get('phone')).trim(),
      createdAt: new Date().toISOString()
    };

    if (!account.fullName || !account.email) {
      message.textContent = 'Please complete your name and email.';
      return;
    }

    if (account.authMethod === 'email_phone' && !account.phone) {
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
      updateMethodRequirements();
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

  updateMethodRequirements();
  updateAccountUI();
}

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

function renderMaps() {
  const target = document.getElementById('indexMaps');
  if (!target) return;
  target.innerHTML = indexMaps
    .map(
      (item) => `
      <article class="stat-card glass">
        <p>${item.name}</p>
        <strong>${item.change}</strong>
        <small class="mini-line">Top names: ${item.tickers.join(', ')}</small>
      </article>`
    )
    .join('');
}

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

function renderCrypto() {
  const target = document.getElementById('cryptoBoard');
  if (!target) return;
  target.innerHTML = cryptoAssets
    .map(
      (asset) =>
        `<article class="stat-card glass"><p>${escapeHTML(asset.symbol)} · ${escapeHTML(asset.name)}</p><strong>${escapeHTML(
          asset.price
        )}</strong><small class="mini-line">24h ${escapeHTML(asset.change)}</small></article>`
    )
    .join('');
}

function renderPredictionMarkets() {
  const target = document.getElementById('predictionBoard');
  if (!target) return;
  target.innerHTML = predictionMarkets
    .map(
      (item) =>
        `<section class="section-card glass"><div class="section-head"><h3>${escapeHTML(item.question)}</h3><span class="badge">${escapeHTML(
          item.probability
        )}</span></div></section>`
    )
    .join('');
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
  return `<article class="stock-card"><h4>${escapeHTML(stock.ticker)} · ${escapeHTML(stock.name)}</h4><div class="stock-meta"><span>Mkt Cap ${escapeHTML(
    money.format(stock.marketCap)
  )}</span><span>${escapeHTML(stock.risk.toUpperCase())} RISK</span></div><div class="stock-meta"><span>Rev ${escapeHTML(
    fmtPercent(stock.revenueGrowth)
  )}</span><span>EPS ${escapeHTML(fmtPercent(stock.epsGrowth))}</span></div><div class="stock-meta"><span>Op Margin ${escapeHTML(
    fmtPercent(stock.opMargin)
  )}</span><span>Score ${escapeHTML(scoreStock(stock).toFixed(1))}</span></div><div style="display:flex; gap:.4rem; margin-top:.55rem; flex-wrap:wrap;">${tags
    .map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`)
    .join('')}</div></article>`;
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
  renderStockPicks();
}

async function init() {
  setupAccountMenu();
  renderMaps();
  renderNews();
  renderCrypto();
  renderPredictionMarkets();
  await initStockPicks();
}

init();
