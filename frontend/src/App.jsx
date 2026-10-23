import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/forecast'

const navItems = [
  ['overview', 'Overview', '⌂'],
  ['forecast', 'Forecast explorer', '⌁'],
  ['accuracy', 'Accuracy analysis', '◒'],
]

function Icon({ children, size = 18 }) {
  return <span className="icon" style={{ fontSize: size }}>{children}</span>
}

function App() {
  const [activePage, setActivePage] = useState('overview')
  const [darkMode, setDarkMode] = useState(false)
  const [selectedDate, setSelectedDate] = useState('2026-01-15')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  function changeDate(date) {
    setLoading(true)
    setSelectedDate(date)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_URL}?delivery_date=${selectedDate}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load the latest forecast')
        return response.json()
      })
      .then((result) => {
        setData(result)
        setApiError('')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setApiError('Live API unavailable — showing the latest cached forecast.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [selectedDate])

  const forecast = useMemo(() => data?.forecast ?? [], [data])
  const maxValue = useMemo(() => Math.max(...forecast.map((point) => point.actual), 1), [forecast])
  const latest = forecast[forecast.length - 1]

  return (
    <div className="app-shell bg-slate-50 dark:bg-slate-900">
      <aside className="sidebar dark:bg-slate-800">
        <div className="brand">
          <div className="brand-mark"><span>W</span></div>
          <div><strong>WindLens</strong><small>Energy intelligence</small></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-select"><span className="status-dot" /> UK power trading <span className="chevron">⌄</span></div>
        <nav>
          {navItems.map(([id, label, symbol]) => (
            <button key={id} className={activePage === id ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(id)}>
              <Icon>{symbol}</Icon>{label}{id === 'accuracy' && <span className="new-badge">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="data-source"><span className="source-icon">E</span><div><strong>Elexon BMRS</strong><small>Connected · updated 8m ago</small></div><span className="connected-dot" /></div>
          <button className="nav-item"><Icon>?</Icon> Help & documentation</button>
          <div className="user-card"><div className="avatar">AS</div><div><strong>Alex Smith</strong><small>Energy analyst</small></div><span className="chevron">⌄</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar dark:bg-slate-800">
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{activePage === 'overview' ? 'Overview' : navItems.find((item) => item[0] === activePage)?.[1]}</strong></div>
          <div className="top-actions"><span className="last-sync"><span className="connected-dot" /> Live data</span><button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle dark mode">{darkMode ? '☀' : '☾'}</button><button className="notification" aria-label="Notifications">♧<i /></button></div>
        </header>

        <div className="content-wrap">
          <section className="page-intro">
            <div><p className="eyebrow">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</p><h1>Good morning, Alex <span>✦</span></h1><p className="intro-copy">Make confident decisions with a clear view of forecasted wind generation.</p></div>
            <div className="date-control"><label>DELIVERY DATE</label><div><button onClick={() => changeDate('2026-01-14')}>‹</button><strong>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong><button onClick={() => changeDate('2026-01-16')}>›</button></div></div>
          </section>

          {apiError && <div className="api-notice"><span>i</span>{apiError}</div>}
          {activePage === 'overview' && <Overview forecast={forecast} maxValue={maxValue} latest={latest} loading={loading} />}
          {activePage === 'forecast' && <ForecastPage forecast={forecast} maxValue={maxValue} />}
          {activePage === 'accuracy' && <AccuracyPage data={data} />}
        </div>
      </main>
    </div>
  )
}

function Overview({ forecast, maxValue, latest, loading }) {
  const points = forecast.length ? forecast : Array.from({ length: 12 }, (_, index) => ({ time: `${String(index * 2).padStart(2, '0')}:00`, forecast: 0, actual: 0 }))
  return <div className="dashboard-grid">
    <section className="hero-card card reveal">
      <div className="card-heading"><div><span className="section-kicker">LATEST FORECAST</span><h2>Wind generation</h2></div><span className="live-pill"><i /> LIVE</span></div>
      <div className="hero-value">{loading ? '—' : <>{Math.round(latest?.forecast ?? 0).toLocaleString()} <small>MW</small></>}</div>
      <div className="value-caption">Latest available day-ahead prediction <span>·</span> Published 07:00 UTC</div>
      <div className="chart-wrap">
        <div className="chart-labels"><span>1,600</span><span>1,200</span><span>800</span><span>400</span><span>0</span></div>
        <svg className="forecast-chart" viewBox="0 0 800 220" preserveAspectRatio="none" role="img" aria-label="Wind generation forecast chart">
          <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#39c7a1" stopOpacity=".28" /><stop offset="1" stopColor="#39c7a1" stopOpacity="0" /></linearGradient></defs>
          {[0, 55, 110, 165, 220].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} className="grid-line" />)}
          <polyline points={linePoints(points, 'actual', maxValue)} className="actual-line" />
          <polygon points={`0,220 ${linePoints(points, 'forecast', maxValue)} 800,220`} className="area-fill" />
          <polyline points={linePoints(points, 'forecast', maxValue)} className="forecast-line" />
        </svg>
        <div className="x-labels">{points.filter((_, index) => index % 3 === 0).map((point) => <span key={point.time}>{point.time}</span>)}</div>
      </div>
      <div className="legend"><span><i className="legend-forecast" /> Forecast</span><span><i className="legend-actual" /> Actuals</span><span className="chart-note">Half-hourly intervals</span></div>
    </section>
    <section className="side-stack">
      <div className="metric-card card reveal"><div className="metric-icon green">↗</div><div><span className="section-kicker">FORECAST ACCURACY</span><strong>92.4%</strong><p><span className="positive">↑ 2.1%</span> vs last week</p></div><span className="mini-chart green-chart">⌁</span></div>
      <div className="metric-card card reveal"><div className="metric-icon purple">≈</div><div><span className="section-kicker">MEAN ABSOLUTE ERROR</span><strong>84 <small>MW</small></strong><p><span className="positive">↓ 12 MW</span> vs last week</p></div><span className="mini-chart purple-chart">⌁</span></div>
      <div className="metric-card card reveal"><div className="metric-icon amber">◷</div><div><span className="section-kicker">NEXT DECISION WINDOW</span><strong>09:30 <small>UTC</small></strong><p>In <span className="neutral">2h 14m</span></p></div><span className="mini-chart amber-chart">◷</span></div>
    </section>
    <section className="insight-card card"><div className="insight-icon">✦</div><div><span className="section-kicker">TODAY'S INSIGHT</span><h3>Wind is expected to pick up this evening</h3><p>Forecasts indicate a <strong>18% increase</strong> in generation between 18:00–21:00. Consider adjusting your procurement position before the 16:00 gate closure.</p></div><button className="arrow-btn">→</button></section>
    <section className="activity-card card"><div className="card-heading"><div><span className="section-kicker">RECENT ACTIVITY</span><h2>Forecast updates</h2></div><button className="text-button">View all →</button></div><div className="activity-row"><span className="activity-dot green-dot" /><div><strong>Forecast refreshed</strong><p>January 15, 2026 at 07:00 UTC</p></div><span className="activity-value">+3.2%</span></div><div className="activity-row"><span className="activity-dot purple-dot" /><div><strong>Accuracy report generated</strong><p>January 14, 2026 at 18:30 UTC</p></div><span className="activity-value">92.4%</span></div></section>
  </div>
}

function ForecastPage({ forecast, maxValue }) {
  return <section className="full-card card"><div className="card-heading"><div><span className="section-kicker">FORECAST EXPLORER</span><h2>Day-ahead wind generation</h2></div><button className="outline-button">Download CSV ↓</button></div><div className="large-chart"><svg viewBox="0 0 1000 360" preserveAspectRatio="none"><polyline points={linePoints(forecast, 'actual', maxValue)} className="actual-line" /><polyline points={linePoints(forecast, 'forecast', maxValue)} className="forecast-line" /></svg></div><div className="table-wrap"><table><thead><tr><th>Delivery time</th><th>Forecast (MW)</th><th>Actual (MW)</th><th>Variance</th></tr></thead><tbody>{forecast.slice(0, 8).map((row) => <tr key={row.time}><td>{row.time}</td><td>{Math.round(row.forecast).toLocaleString()}</td><td>{Math.round(row.actual).toLocaleString()}</td><td className={row.actual - row.forecast > 0 ? 'positive' : 'negative'}>{Math.round(row.actual - row.forecast)} MW</td></tr>)}</tbody></table></div></section>
}

function AccuracyPage({ data }) {
  const metrics = data?.metrics ?? { mae: 84, rmse: 121, accuracy: 92.4, bias: -18 }
  return <section className="accuracy-layout"><div className="full-card card"><span className="section-kicker">JANUARY 2026 PERFORMANCE</span><h2>Forecast accuracy</h2><p className="muted">Quantifying error helps traders size a confident procurement position.</p><div className="accuracy-metrics"><div><span>Accuracy</span><strong>{metrics.accuracy}%</strong></div><div><span>MAE</span><strong>{metrics.mae} MW</strong></div><div><span>RMSE</span><strong>{metrics.rmse} MW</strong></div><div><span>Bias</span><strong>{metrics.bias} MW</strong></div></div></div><div className="full-card card explanation"><div className="insight-icon">i</div><div><h3>How to read this</h3><p><strong>MAE</strong> is the average absolute difference between predicted and actual wind generation. A lower number means less uncertainty when buying from the day-ahead market.</p><p><strong>Bias</strong> shows the direction of the error. A negative bias means the forecast tends to slightly over-predict generation.</p></div></div></section>
}

function linePoints(points, key, maxValue) {
  if (!points.length) return ''
  return points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 800},${210 - (point[key] / maxValue) * 185}`).join(' ')
}

export default App
