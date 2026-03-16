const strategyConfig = [
  { key: 'low', title: 'Low Risk Stocks', description: 'Stable earnings, strong balance sheets, resilient margins.' },
  { key: 'mid', title: 'Mid Risk Stocks', description: 'Balanced upside with moderate volatility and cyclical exposure.' },
  { key: 'high', title: 'High Risk Stocks', description: 'Higher growth/turnaround potential with elevated drawdown risk.' },
  { key: 'buffett', title: 'Warren Buffett Style', description: 'Durable moat + profitability + cash flow + valuation discipline.' },
  { key: 'dividend', title: 'Dividend + Growth', description: 'Income streams supported by healthy earnings growth.' }
];

const indexMaps = [
  {
    name: 'S&P 500',
    tiles: [
      { t: 'MSFT', w: 10, c: 1.3 }, { t: 'AAPL', w: 9, c: 0.9 }, { t: 'NVDA', w: 9, c: 2.1 },
      { t: 'AMZN', w: 6, c: 0.7 }, { t: 'GOOGL', w: 6, c: -0.4 }, { t: 'BRK.B', w: 5, c: 0.5 },
      { t: 'LLY', w: 4, c: 1.1 }, { t: 'JPM', w: 4, c: 0.2 }
    ]
  },
  {
    name: 'Dow Jones',
    tiles: [
      { t: 'UNH', w: 7, c: -0.8 }, { t: 'MSFT', w: 7, c: 1.3 }, { t: 'HD', w: 6, c: 0.1 },
      { t: 'MCD', w: 5, c: 0.4 }, { t: 'JPM', w: 5, c: 0.2 }, { t: 'V', w: 5, c: 0.6 }
    ]
  },
  {
    name: 'Russell 2000',
    tiles: [
      { t: 'SMCI', w: 7, c: 3.2 }, { t: 'PLTR', w: 6, c: 2.7 }, { t: 'INTC', w: 5, c: -1.6 },
      { t: 'PFE', w: 5, c: -0.9 }, { t: 'OXY', w: 4, c: -0.5 }, { t: 'AMD', w: 6, c: 1.8 }
    ]
  },
  {
    name: 'Nasdaq 100',
    tiles: [
      { t: 'NVDA', w: 10, c: 2.1 }, { t: 'MSFT', w: 9, c: 1.3 }, { t: 'AAPL', w: 8, c: 0.9 },
      { t: 'AMD', w: 5, c: 1.8 }, { t: 'ADBE', w: 4, c: 1.1 }, { t: 'NFLX', w: 4, c: 0.8 }
    ]
  },
  {
    name: 'S&P 400 MidCap',
    tiles: [
      { t: 'OXY', w: 6, c: -0.5 }, { t: 'PFE', w: 5, c: -0.9 }, { t: 'INTC', w: 5, c: -1.6 },
      { t: 'SMCI', w: 6, c: 3.2 }, { t: 'PLTR', w: 6, c: 2.7 }, { t: 'COST', w: 5, c: 0.4 }
    ]
  }
];

const newsItems = [
  {
    title: 'US stocks end mixed as investors parse latest inflation and policy signals',
    source: 'Reuters',
    href: 'https://www.reuters.com/markets/us/'
  },
  {
    title: 'Dow closes at record as market rotates into cyclicals',
    source: 'CNBC',
    href: 'https://www.cnbc.com/markets/'
  },
  {
    title: 'Earnings season preview: margins and AI capex in focus',
    source: 'Bloomberg',
    href: 'https://www.bloomberg.com/markets'
  },
  {
    title: 'Bond yields and Fed path: what it means for equity valuations',
    source: 'Wall Street Journal',
    href: 'https://www.wsj.com/finance'
  }
];

const cryptoAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$68,420', change: '+2.1%' },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,640', change: '+1.6%' },
  { symbol: 'SOL', name: 'Solana', price: '$172', change: '+3.7%' },
  { symbol: 'BNB', name: 'BNB', price: '$612', change: '+0.9%' }
];

const predictionMarkets = [
  {
    title: 'Will the Fed cut rates by July?',
    probability: '58% Yes',
    href: 'https://polymarket.com/'
  },
  {
    title: 'Will Bitcoin hit a new all-time high this year?',
    probability: '62% Yes',
    href: 'https://polymarket.com/'
  },
  {
    title: 'Will the U.S. enter a recession in 2026?',
    probability: '33% Yes',
    href: 'https://polymarket.com/'
  },
  {
    title: 'Will S&P 500 close above 6000 this year?',
    probability: '47% Yes',
    href: 'https://polymarket.com/'
  }
];

const state = { stocks: [], search: '', category: 'all' };
const money = new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 });
const fmtPercent = (value) => `${(value * 100).toFixed(1)}%`;

function scoreStock(stock) {
  const growthScore = stock.revenueGrowth * 30 + stock.epsGrowth * 30;
  const profitabilityScore = stock.opMargin * 25;
  const cashFlowScore = stock.fcfTrend === 'up' ? 10 : stock.fcfTrend === 'stable' ? 5 : -8;
  const dividendScore = stock.dividend ? Math.min(stock.dividendYield * 300, 10) : 0;
  return growthScore + profitabilityScore + cashFlowScore + dividendScore;
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = current;
    themeToggle.textContent = current === 'dark' ? '🌙' : '☀️';
  });
}

function tileColor(change) {
  if (change > 1.5) return 'tile-pos-strong';
  if (change > 0) return 'tile-pos';
  if (change < -1.0) return 'tile-neg-strong';
  if (change < 0) return 'tile-neg';
  return 'tile-flat';
}

function renderMaps() {
  const target = document.getElementById('indexMaps');
  if (!target) return;
  target.innerHTML = indexMaps
    .map(
      (idx) => `
      <section class="section-card glass">
        <div class="section-head"><h3>${idx.name}</h3></div>
        <div class="heatmap-grid">
          ${idx.tiles
            .map(
              (tile) => `<a class="map-tile ${tileColor(tile.c)}" style="flex:${tile.w}" href="https://finance.yahoo.com/quote/${tile.t}" target="_blank" rel="noopener noreferrer"><strong>${
                tile.t
              }</strong><span>${tile.c > 0 ? '+' : ''}${tile.c.toFixed(1)}%</span></a>`
            )
            .join('')}
        </div>
      </section>`
    )
    .join('');
}

function renderNews() {
  const target = document.getElementById('newsFeed');
  if (!target) return;
  target.innerHTML = newsItems
    .map(
      (item) => `<a class="section-card glass clickable-card" href="${item.href}" target="_blank" rel="noopener noreferrer"><div class="section-head"><h3>${item.title}</h3><span class="badge">${item.source}</span></div><p class="mini-line">Open article ↗</p></a>`
    )
    .join('');
}

function renderCrypto() {
  const target = document.getElementById('cryptoBoard');
  if (!target) return;
  target.innerHTML = cryptoAssets
    .map(
      (asset) => `<article class="stat-card glass"><p>${asset.symbol} · ${asset.name}</p><strong>${asset.price}</strong><small class="mini-line">24h ${asset.change}</small></article>`
    )
    .join('');
}

function renderPredictionMarkets() {
  const target = document.getElementById('predictionBoard');
  if (!target) return;
  target.innerHTML = predictionMarkets
    .map(
      (item) => `<a class="section-card glass clickable-card" href="${item.href}" target="_blank" rel="noopener noreferrer"><div class="section-head"><h3>${item.title}</h3><span class="badge">${item.probability}</span></div><p class="mini-line">Trade on Polymarket ↗</p></a>`
    )
    .join('');
}

function matchesSearch(stock, search) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return stock.ticker.toLowerCase().includes(needle) || stock.name.toLowerCase().includes(needle);
}

function evaluateCategory(stock, key) {
  const metrics = {
    revenueGrowth: stock.revenueGrowth,
    epsGrowth: stock.epsGrowth,
    opMargin: stock.opMargin,
    fcfTrend: stock.fcfTrend,
    dividendYield: stock.dividendYield,
    buffett: stock.buffett,
    dividend: stock.dividend,
    score: scoreStock(stock)
  };

  const fail = (name) => ({ inside: false, borderline: true, failedMetric: name });

  if (key === 'low') {
    if (metrics.revenueGrowth < 0.02) return fail('Revenue growth');
    if (metrics.epsGrowth < 0.03) return fail('EPS growth');
    if (metrics.opMargin < 0.12) return fail('Operating margin');
    if (metrics.fcfTrend === 'down') return fail('Free cash flow trend');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'mid') {
    if (metrics.revenueGrowth < 0.03) return fail('Revenue growth');
    if (metrics.epsGrowth < 0.06) return fail('EPS growth');
    if (metrics.opMargin < 0.07) return fail('Operating margin');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'high') {
    if (metrics.score > 35) return fail('Risk score too low');
    if (metrics.revenueGrowth < -0.15) return fail('Revenue contraction depth');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'buffett') {
    if (!metrics.buffett) return fail('Buffett fit rules');
    if (metrics.opMargin < 0.15) return fail('Operating margin');
    if (metrics.fcfTrend === 'down') return fail('Free cash flow trend');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'dividend') {
    if (!metrics.dividend) return fail('Dividend policy');
    if (metrics.dividendYield < 0.01) return fail('Dividend yield');
    if (metrics.epsGrowth < 0.03) return fail('EPS growth');
    return { inside: true, borderline: false, failedMetric: null };
  }

  return { inside: false, borderline: false, failedMetric: null };
}

function groupByCategory(stocks, key) {
  const inside = [];
  const borderline = [];

  stocks.forEach((stock) => {
    const result = evaluateCategory(stock, key);
    if (result.inside) inside.push({ stock, failedMetric: null });
    else if (result.borderline) borderline.push({ stock, failedMetric: result.failedMetric });
  });

  inside.sort((a, b) => scoreStock(b.stock) - scoreStock(a.stock));
  borderline.sort((a, b) => scoreStock(b.stock) - scoreStock(a.stock));

  return { inside, borderline };
}

function categoryFilteredStocks() {
  const base = state.stocks.filter((stock) => matchesSearch(stock, state.search));
  if (state.category === 'all') return base;
  return base.filter((stock) => evaluateCategory(stock, state.category).inside);
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

function renderStockCard(entry, isBorderline) {
  const stock = entry.stock;
  const tags = [];
  if (stock.buffett) tags.push('Buffett fit');
  if (stock.dividend) tags.push('Dividend');
  if (isBorderline) tags.push('Borderline');

  const metricBadge = isBorderline
    ? `<span class="metric-badge metric-badge-red">Outside: ${entry.failedMetric}</span>`
    : `<span class="metric-badge metric-badge-green">Inside criteria</span>`;

  return `<article class="stock-card ${isBorderline ? 'stock-card-borderline' : ''}">
      <h4>${stock.ticker} · ${stock.name}</h4>
      <div class="stock-meta"><span>Mkt Cap ${money.format(stock.marketCap)}</span><span>${stock.risk.toUpperCase()} RISK</span></div>
      <div class="stock-meta"><span>Rev ${fmtPercent(stock.revenueGrowth)}</span><span>EPS ${fmtPercent(stock.epsGrowth)}</span></div>
      <div class="stock-meta"><span>Op Margin ${fmtPercent(stock.opMargin)}</span><span>Score ${scoreStock(stock).toFixed(1)}</span></div>
      <div style="display:flex; gap:.4rem; margin-top:.55rem; flex-wrap:wrap;">${tags.map((tag) => `<span class="badge">${tag}</span>`).join('')}</div>
      <div style="margin-top:.55rem;">${metricBadge}</div>
    </article>`;
}

function renderSections(stocks) {
  const sectionsRoot = document.getElementById('strategySections');
  if (!sectionsRoot) return;

  sectionsRoot.innerHTML = strategyConfig
    .map((section) => {
      const grouped = groupByCategory(stocks, section.key);
      const previewInside = grouped.inside;
      return `<details class="section-card glass category-details" open>
          <summary class="section-head">
            <div><h3>${section.title}</h3><small>${section.description}</small></div>
            <span class="badge">${grouped.inside.length} inside • ${grouped.borderline.length} borderline</span>
          </summary>
          <div class="drop-group">
            <h4 class="subhead">Inside category</h4>
            <div class="stock-grid">${previewInside.length ? previewInside.map((entry) => renderStockCard(entry, false)).join('') : '<p>No inside matches.</p>'}</div>
          </div>
          <div class="drop-group">
            <h4 class="subhead">Borderline (just outside)</h4>
            <div class="stock-grid">${grouped.borderline.length ? grouped.borderline.map((entry) => renderStockCard(entry, true)).join('') : '<p>No borderline names.</p>'}</div>
          </div>
        </details>`;
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
  const stocks = categoryFilteredStocks();
  buildStats(stocks);
  renderSections(stocks);
}

async function initStockPicks() {
  if (!document.getElementById('strategySections')) return;
  const res = await fetch('./data/stocks.json');
  state.stocks = await res.json();
  wireFilters();
  renderStockPicks();
}

async function init() {
  setupThemeToggle();
  renderMaps();
  renderNews();
  renderCrypto();
  renderPredictionMarkets();
  await initStockPicks();
}

init();
