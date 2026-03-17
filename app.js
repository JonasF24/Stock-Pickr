const strategyConfig = [
  { key: 'low', title: 'Low Risk Stocks', description: 'Strict quality/value rules with lower leverage and strong profitability.' },
  { key: 'mid', title: 'Mid Risk Stocks', description: 'Balanced growth + quality profile with valuation discipline.' },
  { key: 'high', title: 'High Risk Stocks', description: 'Full-throttle growth profile with looser leverage tolerance.' },
  { key: 'buffett', title: 'Warren Buffett Style', description: 'Durable moat + profitability + cash flow + valuation discipline.' },
  { key: 'dividend', title: 'Dividend + Growth', description: 'Income streams supported by healthy earnings growth.' }
];

const excludedSectors = new Set(['Financial Services', 'Basic Materials', 'Energy', 'Utilities', 'Real Estate']);

const fallbackIndexMaps = [
  { name: 'S&P 500', tiles: [] },
  { name: 'Dow Jones', tiles: [] },
  { name: 'Russell 2000', tiles: [] },
  { name: 'Nasdaq 100', tiles: [] },
  { name: 'S&P 400 MidCap', tiles: [] }
];

const newsItems = [
  { title: 'US markets coverage', source: 'Reuters', href: 'https://www.reuters.com/markets/us/' },
  { title: 'Latest market headlines', source: 'CNBC', href: 'https://www.cnbc.com/markets/' },
  { title: 'Global markets coverage', source: 'Bloomberg', href: 'https://www.bloomberg.com/markets' },
  { title: 'Finance & markets desk', source: 'Wall Street Journal', href: 'https://www.wsj.com/finance' }
];

const cryptoAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$68,420', change: '+2.1%' },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,640', change: '+1.6%' },
  { symbol: 'SOL', name: 'Solana', price: '$172', change: '+3.7%' },
  { symbol: 'BNB', name: 'BNB', price: '$612', change: '+0.9%' }
];

const predictionMarkets = [
  { title: 'Will the Fed cut rates by July?', probability: '58% Yes', href: 'https://polymarket.com/' },
  { title: 'Will Bitcoin hit a new all-time high this year?', probability: '62% Yes', href: 'https://polymarket.com/' },
  { title: 'Will the U.S. enter a recession in 2026?', probability: '33% Yes', href: 'https://polymarket.com/' },
  { title: 'Will S&P 500 close above 6000 this year?', probability: '47% Yes', href: 'https://polymarket.com/' }
];

const state = { stocks: [], search: '', category: 'all', indexMaps: fallbackIndexMaps, meta: null };
const money = new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 });
const fmtPercent = (value) => `${(value * 100).toFixed(1)}%`;

const asNumber = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);

function scoreStock(stock) {
  const growthScore = asNumber(stock.revenueGrowth1Y) * 20 + asNumber(stock.earningsGrowth1Y) * 20;
  const profitabilityScore = asNumber(stock.roe) * 20;
  const fcfScore = asNumber(stock.freeCashFlowTTM) > 0 ? 15 : -10;
  const valuationScore = asNumber(stock.peg) > 0 && asNumber(stock.peg) < 2 ? 10 : -8;
  return growthScore + profitabilityScore + fcfScore + valuationScore;
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
  if (change > 2) return 'tile-pos-strong';
  if (change > 0) return 'tile-pos';
  if (change < -2) return 'tile-neg-strong';
  if (change < 0) return 'tile-neg';
  return 'tile-flat';
}

function renderMaps() {
  const target = document.getElementById('indexMaps');
  if (!target) return;

  target.innerHTML = state.indexMaps
    .map(
      (idx) => `
      <section class="section-card glass">
        <div class="section-head"><h3>${idx.name}</h3><span class="badge">as of ${idx.asOf || 'latest close'}</span></div>
        <div class="heatmap-grid">
          ${idx.tiles
            .map(
              (tile) => `<a class="map-tile ${tileColor(tile.changePct)}" style="flex:${tile.weight}" href="https://finance.yahoo.com/quote/${tile.ticker}" target="_blank" rel="noopener noreferrer"><strong>${
                tile.ticker
              }</strong><span>${tile.changePct > 0 ? '+' : ''}${tile.changePct.toFixed(2)}%</span></a>`
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

function isExcludedSector(stock) {
  return excludedSectors.has(stock.sector || '');
}

function evaluateCategory(stock, key) {
  if (isExcludedSector(stock) && ['low', 'mid', 'high'].includes(key)) {
    return { inside: false, borderline: false, failedMetric: 'Excluded sector' };
  }

  const m = {
    rev5y: asNumber(stock.revenueGrowth5Y),
    rev1y: asNumber(stock.revenueGrowth1Y),
    earn5y: asNumber(stock.earningsGrowth5Y),
    earn1y: asNumber(stock.earningsGrowth1Y),
    roe: asNumber(stock.roe),
    debtToEquity: asNumber(stock.debtToEquity, 999),
    fcf: asNumber(stock.freeCashFlowTTM),
    peg: asNumber(stock.peg, 999),
    buffett: !!stock.buffett,
    dividend: !!stock.dividend
  };

  const fail = (metric) => ({ inside: false, borderline: true, failedMetric: metric });

  if (key === 'high') {
    if (!(m.rev5y > 1)) return fail('Revenue Growth (5Y) > 1');
    if (!(m.rev1y > 0.2)) return fail('Revenue Growth (1Y,TTM) > 0.2');
    if (!(m.debtToEquity >= 0 && m.debtToEquity < 5)) return fail('Debt/Equity < 5');
    if (!(m.peg > 0 && m.peg < 2)) return fail('PEG (5Y Exp-Mean) < 2');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'mid') {
    if (!(m.rev5y > 0.5)) return fail('Revenue Growth (5Y) > 0.5');
    if (!(m.rev1y > 0.05)) return fail('Revenue Growth (1Y,TTM) > 0.05');
    if (!(m.earn5y > 0.1)) return fail('Earnings Growth (5Y) > 0.1');
    if (!(m.roe > 0.15)) return fail('ROE > 0.15');
    if (!(m.debtToEquity >= 0 && m.debtToEquity < 1)) return fail('Debt/Equity < 1');
    if (!(m.fcf > 0)) return fail('Free Cash Flow (TTM) > 0');
    if (!(m.peg > 0 && m.peg < 2)) return fail('PEG (5Y Exp-Mean) < 2');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'low') {
    if (!(m.rev5y > 0.5)) return fail('Revenue Growth (5Y) > 0.5');
    if (!(m.rev1y > 0.05)) return fail('Revenue Growth (1Y,TTM) > 0.05');
    if (!(m.earn1y > 0.05)) return fail('Earnings Growth (1Y,TTM) > 0.05');
    if (!(m.roe > 0.15)) return fail('ROE > 0.15');
    if (!(m.debtToEquity >= 0 && m.debtToEquity < 1)) return fail('Debt/Equity < 1');
    if (!(m.fcf > 0)) return fail('Free Cash Flow (TTM) > 0');
    if (!(m.peg > 0 && m.peg < 1)) return fail('PEG (5Y Exp-Mean) < 1');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'buffett') {
    if (!m.buffett) return fail('Buffett fit rules');
    if (!(m.roe > 0.12)) return fail('ROE > 0.12');
    if (!(m.debtToEquity < 1.5)) return fail('Debt/Equity < 1.5');
    return { inside: true, borderline: false, failedMetric: null };
  }

  if (key === 'dividend') {
    if (!m.dividend) return fail('Dividend policy');
    if (!(asNumber(stock.dividendYield) > 0.01)) return fail('Dividend Yield > 1%');
    if (!(m.earn1y > 0)) return fail('Earnings Growth (1Y,TTM) > 0');
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

function renderDataStatus() {
  const node = document.getElementById('dataStatus');
  if (!node || !state.meta) return;
  node.textContent = `Data refresh: daily market close ${state.meta.last_market_refresh || '-'} • weekly rebalance ${state.meta.last_weekly_rebalance || '-'} • earnings sync ${state.meta.last_earnings_sync || '-'}`;
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
    : '<span class="metric-badge metric-badge-green">Inside criteria</span>';

  return `<article class="stock-card ${isBorderline ? 'stock-card-borderline' : ''}">
      <h4>${stock.ticker} · ${stock.name}</h4>
      <div class="stock-meta"><span>${stock.sector || 'N/A'}</span><span>Mkt Cap ${money.format(stock.marketCap)}</span></div>
      <div class="stock-meta"><span>Rev 1Y ${fmtPercent(asNumber(stock.revenueGrowth1Y))}</span><span>Earn 1Y ${fmtPercent(asNumber(stock.earningsGrowth1Y))}</span></div>
      <div class="stock-meta"><span>ROE ${fmtPercent(asNumber(stock.roe))}</span><span>D/E ${asNumber(stock.debtToEquity).toFixed(2)}</span></div>
      <div class="stock-meta"><span>PEG ${asNumber(stock.peg).toFixed(2)}</span><span>Score ${scoreStock(stock).toFixed(1)}</span></div>
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
      return `<details class="section-card glass category-details" open>
          <summary class="section-head">
            <div><h3>${section.title}</h3><small>${section.description}</small></div>
            <span class="badge">${grouped.inside.length} inside • ${grouped.borderline.length} borderline</span>
          </summary>
          <div class="drop-group">
            <h4 class="subhead">Inside category</h4>
            <div class="stock-grid">${grouped.inside.length ? grouped.inside.map((entry) => renderStockCard(entry, false)).join('') : '<p>No inside matches.</p>'}</div>
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

async function loadJson(path, fallback) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`failed ${path}`);
    return await res.json();
  } catch (_) {
    return fallback;
  }
}

async function initStockPicks() {
  if (!document.getElementById('strategySections')) return;
  state.stocks = await loadJson('./data/stocks.json', []);
  state.meta = await loadJson('./data/update-meta.json', null);
  renderDataStatus();
  wireFilters();
  renderStockPicks();
}

async function initMaps() {
  state.indexMaps = await loadJson('./data/index-maps.json', fallbackIndexMaps);
  renderMaps();
}

async function init() {
  setupThemeToggle();
  await initMaps();
  renderNews();
  renderCrypto();
  renderPredictionMarkets();
  await initStockPicks();
}

init();
