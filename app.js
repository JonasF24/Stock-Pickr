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
      (item) => `<section class="section-card glass"><div class="section-head"><h3>${item.title}</h3><span class="badge">${item.tag}</span></div><p class="mini-line">${item.time}</p></section>`
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
      (item) => `<section class="section-card glass"><div class="section-head"><h3>${item.question}</h3><span class="badge">${item.probability}</span></div></section>`
    )
    .join('');
}

function matchesCategory(stock, category) {
  if (category === 'all') return true;
  if (category === 'buffett') return stock.buffett;
  if (category === 'dividend') return stock.dividend;
  return stock.risk === category;
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
  return `<article class="stock-card"><h4>${stock.ticker} · ${stock.name}</h4><div class="stock-meta"><span>Mkt Cap ${money.format(
    stock.marketCap
  )}</span><span>${stock.risk.toUpperCase()} RISK</span></div><div class="stock-meta"><span>Rev ${fmtPercent(stock.revenueGrowth)}</span><span>EPS ${fmtPercent(
    stock.epsGrowth
  )}</span></div><div class="stock-meta"><span>Op Margin ${fmtPercent(stock.opMargin)}</span><span>Score ${scoreStock(stock).toFixed(
    1
  )}</span></div><div style="display:flex; gap:.4rem; margin-top:.55rem; flex-wrap:wrap;">${tags
    .map((tag) => `<span class="badge">${tag}</span>`)
    .join('')}</div></article>`;
}

function renderSections(stocks) {
  const sectionsRoot = document.getElementById('strategySections');
  if (!sectionsRoot) return;
  const grouped = {
    low: stocks.filter((s) => s.risk === 'low').sort((a, b) => scoreStock(b) - scoreStock(a)),
    mid: stocks.filter((s) => s.risk === 'mid').sort((a, b) => scoreStock(b) - scoreStock(a)),
    high: stocks.filter((s) => s.risk === 'high').sort((a, b) => scoreStock(b) - scoreStock(a)),
    buffett: stocks.filter((s) => s.buffett).sort((a, b) => scoreStock(b) - scoreStock(a)),
    dividend: stocks.filter((s) => s.dividend).sort((a, b) => scoreStock(b) - scoreStock(a))
  };

  sectionsRoot.innerHTML = strategyConfig
    .map((section) => {
      const picks = grouped[section.key].slice(0, 6);
      return `<section class="section-card glass"><div class="section-head"><div><h3>${section.title}</h3><small>${section.description}</small></div><span class="badge">${grouped[section.key].length} matches</span></div><div class="stock-grid">${
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
