import { useEffect, useMemo, useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/forecast')
  .replace(/\/api\/forecast$/, '') // normalise to base
const FORECAST_URL = `${BASE_URL}/api/forecast`
const SUMMARY_URL = `${BASE_URL}/api/summary`

const JANUARY_START = '2026-01-01'
const JANUARY_END = '2026-01-31'

const pages = [
  { id: 'overview',  label: 'Decision brief',    icon: '⌂', badge: null },
  { id: 'forecast',  label: 'Forecast explorer',  icon: '⌁', badge: null },
  { id: 'accuracy',  label: 'Accuracy analysis',  icon: '◒', badge: 'Core' },
  { id: 'monthly',   label: 'Monthly trends',     icon: '▦', badge: null },
]

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------
const card = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_50px_-28px_rgba(15,23,42,0.3)] transition duration-300 dark:border-slate-700/70 dark:bg-slate-900 dark:shadow-none'
const label = 'text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500'
const skeleton = 'animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800'

// ---------------------------------------------------------------------------
// Top-level App
// ---------------------------------------------------------------------------
export default function App() {
  const [page, setPage]           = useState('overview')
  const [dark, setDark]           = useState(false)
  const [date, setDate]           = useState('2026-01-15')
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [summary, setSummary]     = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Dark-mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Fetch per-day forecast when date changes
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError('')
    fetch(`${FORECAST_URL}?delivery_date=${date}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : r.json().then(b => Promise.reject(new Error(b.detail || 'Request failed'))))
      .then(setData)
      .catch(e => { if (e.name !== 'AbortError') { setData(null); setError(e.message) } })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [date])

  // Fetch monthly summary when Monthly tab is selected
  useEffect(() => {
    if (page !== 'monthly' || summary) return
    setSummaryLoading(true)
    fetch(SUMMARY_URL)
      .then(r => r.ok ? r.json() : r.json().then(b => Promise.reject(new Error(b.detail || 'Summary failed'))))
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [page, summary])

  const points   = useMemo(() => data?.forecast ?? [], [data])
  const peakVal  = useMemo(() => Math.max(...points.map(p => Math.max(p.actual, p.forecast)), 1), [points])
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
  const currentPage = pages.find(p => p.id === page)

  function moveDate(delta) {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() + delta)
    const next = d.toISOString().slice(0, 10)
    if (next >= JANUARY_START && next <= JANUARY_END) {
      setDate(next)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900 selection:bg-emerald-200 dark:bg-[#07131c] dark:text-slate-100">
      {/* Decorative glow */}
      <div className="pointer-events-none fixed -right-32 -top-40 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/10" />
      <div className="pointer-events-none fixed -bottom-40 -left-24 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl dark:bg-sky-900/10" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar page={page} setPage={setPage} />

        <main className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/70 bg-[#f4f8f8]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-12 dark:border-slate-800/80 dark:bg-[#07131c]/90">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Workspace</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{currentPage.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <LiveBadge source={data?.source} loading={loading} />
              <button
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:-rotate-12 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                onClick={() => setDark(d => !d)}
                aria-label="Toggle dark mode"
              >
                {dark ? '☀' : '☾'}
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1320px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
            {/* Hero section */}
            <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className={label}>{dateLabel}</p>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl dark:text-white">
                  Buy with a clearer view of the wind.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  A decision brief for UK day-ahead power trading — what the latest forecast says, how reliable it has been, and where uncertainty needs a buffer.
                </p>
              </div>
              <DatePicker date={date} setDate={setDate} moveDate={moveDate} />
            </section>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-amber-400 text-xs font-bold">!</span>
                <div>
                  <strong>Data unavailable for this delivery date.</strong>
                  <p className="mt-1 text-xs opacity-80">{error}. The BMRS stream serves live data; January 2026 historical records require the archived export.</p>
                </div>
              </div>
            )}

            {/* Page views */}
            {page === 'overview'  && <Overview  data={data} points={points} peakVal={peakVal} loading={loading} />}
            {page === 'forecast'  && <ForecastExplorer data={data} points={points} peakVal={peakVal} loading={loading} />}
            {page === 'accuracy'  && <Accuracy  data={data} points={points} loading={loading} />}
            {page === 'monthly'   && <Monthly   summary={summary} summaryLoading={summaryLoading} setDate={setDate} setPage={setPage} />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar({ page, setPage }) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200/70 bg-white/80 px-5 py-7 backdrop-blur-xl lg:flex lg:flex-col dark:border-slate-800/80 dark:bg-slate-950/70">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 rotate-[-4deg] place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-700 text-xl font-black text-white shadow-lg shadow-emerald-900/20 transition hover:rotate-3 hover:scale-105">W</div>
        <div>
          <strong className="block text-base tracking-tight">WindLens</strong>
          <span className="text-[11px] text-slate-400">Energy intelligence</span>
        </div>
      </div>

      {/* Workspace */}
      <div className="mt-10">
        <p className={label}>Workspace</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          UK power trading
          <span className="ml-auto text-slate-400">⌄</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-8 space-y-1.5">
        {pages.map(p => (
          <button
            key={p.id}
            onClick={() => setPage(p.id)}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition hover:translate-x-1 ${
              page === p.id
                ? 'bg-emerald-50 text-emerald-800 shadow-sm dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
            }`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-lg text-base ${
              page === p.id ? 'bg-white text-emerald-600 dark:bg-emerald-900' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}>{p.icon}</span>
            {p.label}
            {p.badge && (
              <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] uppercase text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                {p.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#183b70] font-bold text-white text-sm">E</span>
            <div>
              <strong className="block text-xs">Elexon BMRS</strong>
              <span className="text-[10px] text-slate-400">FUELHH + WINDFOR</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Source configured
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">TR</div>
          <div>
            <strong className="block text-xs">Trading desk</strong>
            <span className="text-[10px] text-slate-400">Day-ahead analyst</span>
          </div>
          <span className="ml-auto text-slate-400">⌄</span>
        </div>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// LiveBadge
// ---------------------------------------------------------------------------
function LiveBadge({ source, loading }) {
  const isDemo = source?.includes('demo') || source?.includes('fallback')
  const color = loading ? 'border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500'
    : isDemo ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
    : 'border-emerald-200 bg-white/70 text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300'
  const dot = loading ? 'bg-slate-300' : isDemo ? 'bg-amber-400' : 'bg-emerald-500'
  const text = loading ? 'Loading…' : isDemo ? 'Demo data' : 'Elexon source'
  return (
    <span className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:flex ${color}`}>
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${dot}`} />
      {text}
    </span>
  )
}

// ---------------------------------------------------------------------------
// DatePicker – arrow nav + direct text input
// ---------------------------------------------------------------------------
function DatePicker({ date, setDate, moveDate }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState(date)
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

  function commit(value) {
    setEditing(false)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= JANUARY_START && value <= JANUARY_END) {
      setDate(value)
    } else {
      setRaw(date)
    }
  }

  return (
    <div className="shrink-0">
      <p className={`${label} mb-2`}>Delivery date</p>
      <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button onClick={() => moveDate(-1)} disabled={date === JANUARY_START} className="px-3 py-2.5 text-slate-400 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
        {editing ? (
          <input
            autoFocus
            type="date"
            min={JANUARY_START}
            max={JANUARY_END}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(raw); if (e.key === 'Escape') setEditing(false) }}
            className="w-36 bg-transparent text-center text-xs font-semibold outline-none dark:text-white"
          />
        ) : (
          <button onClick={() => { setRaw(date); setEditing(true) }} title="Click to type a date" className="min-w-28 text-center text-xs font-semibold hover:text-emerald-600">
            {formatted}
          </button>
        )}
        <button onClick={() => moveDate(1)} disabled={date === JANUARY_END} className="px-3 py-2.5 text-slate-400 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30">›</button>
      </div>
      <p className="mt-1 text-center text-[9px] text-slate-400">January 2026 only · click date to type</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview page
// ---------------------------------------------------------------------------
function Overview({ data, points, peakVal, loading }) {
  const metrics = data?.metrics
  const peak = points.reduce((best, p) => p.forecast > best.forecast ? p : best, { forecast: 0, time: '—' })
  const source = data?.source || '—'
  const cutoff = data?.decisionCutoff ? fmtTime(data.decisionCutoff) : null

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
      {/* Main chart card */}
      <section className={`${card} overflow-hidden p-6 sm:p-8 xl:row-span-2`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={label}>Latest day-ahead view</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Wind generation forecast</h2>
          </div>
          <StatusPill loading={loading} data={data} />
        </div>
        <div className="mt-10 flex items-end gap-3">
          {loading
            ? <div className={`${skeleton} h-12 w-40`} />
            : <>
                <strong className="text-5xl font-semibold tracking-[-0.06em] text-slate-950 dark:text-white">
                  {data ? Math.round(points.at(-1)?.forecast ?? 0).toLocaleString() : '—'}
                </strong>
                <span className="mb-2 text-base text-slate-400">MW</span>
              </>
          }
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {source}
          {cutoff && <><span className="px-1.5">·</span>Decision cutoff {cutoff}</>}
        </p>
        {loading ? <div className={`${skeleton} mt-8 h-64`} /> : <InteractiveChart points={points} peakVal={peakVal} />}
        <ChartLegend />
      </section>

      {/* KPI cards */}
      <MetricCard label="Forecast accuracy" value={metrics ? `${metrics.accuracy}%` : '—'} detail="Normalised from MAE vs UK wind capacity" icon="↗" tone="emerald" />
      <MetricCard label="Mean absolute error" value={metrics ? `${metrics.mae} MW` : '—'} detail="Average absolute deviation from actuals" icon="≈" tone="violet" />

      {/* Decision signal */}
      <section className={`${card} p-6 xl:col-start-2`}>
        <p className={label}>Decision signal</p>
        <h3 className="mt-3 text-lg font-semibold tracking-tight">
          {peak.forecast ? `Peak wind around ${peak.time}` : 'Waiting for data'}
        </h3>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {peak.forecast
            ? `${Math.round(peak.forecast).toLocaleString()} MW peak forecast. Use the measured MAE${metrics ? ` of ${metrics.mae} MW` : ''} when sizing the non-wind procurement buffer.`
            : 'Signal will be calculated once API data is loaded.'}
        </p>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />{source}
        </div>
      </section>

      {/* Decision rule */}
      <section className={`${card} p-6 xl:col-span-2`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className={label}>Decision rule</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">Latest forecast available before gate closure</h3>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              For each 30-minute delivery interval, WindLens selects the newest <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">WINDFOR</code> publication at or before <strong>16:00 UTC</strong> on the day before delivery, then compares it with <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">FUELHH</code> WIND actuals.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-5 py-4 dark:bg-slate-800">
            <span className={label}>Gate cutoff</span>
            <strong className="mt-1 block text-2xl text-emerald-600">16:00 <small className="text-xs font-medium text-slate-400">UTC</small></strong>
          </div>
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Forecast Explorer page
// ---------------------------------------------------------------------------
function ForecastExplorer({ data, points, peakVal, loading }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'over')  return points.filter(p => p.error > 0)
    if (filter === 'under') return points.filter(p => p.error < 0)
    return points
  }, [points, filter])

  function downloadCsv() {
    if (!points.length) return
    const csv = [
      'startTime,forecastMW,actualMW,errorMW',
      ...points.map(p => `${p.startTime},${p.forecast},${p.actual},${p.error}`)
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `windlens-${data?.deliveryDate ?? 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-end sm:p-8 dark:border-slate-800">
        <div>
          <p className={label}>Forecast explorer</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Day-ahead wind generation</h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {data?.source ?? 'No API response'} · {data?.intervalCount ?? 0} matched 30-min intervals
          </p>
        </div>
        <button
          onClick={downloadCsv}
          disabled={!points.length}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Download CSV ↓
        </button>
      </div>

      <div className="p-6 sm:p-8">
        {loading ? <div className={`${skeleton} h-64`} /> : <InteractiveChart points={points} peakVal={peakVal} />}
        <ChartLegend />

        {/* Filter tabs */}
        <div className="mt-8 flex gap-2">
          {[['all','All intervals'],['over','Over-forecast'],['under','Under-forecast']].map(([id,l]) => (
            <button key={id} onClick={() => setFilter(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter===id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>{l}</button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 dark:border-slate-700">
                <th className="pb-3">Time (UTC)</th>
                <th className="pb-3">Forecast MW</th>
                <th className="pb-3">Actual MW</th>
                <th className="pb-3 text-right">Error MW</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan="4" className="py-10 text-center text-slate-400">Loading…</td></tr>
                : filtered.length
                  ? filtered.map(p => (
                      <tr key={p.startTime} className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                        <td className="py-3 font-medium text-slate-600 dark:text-slate-300">{p.time}</td>
                        <td className="py-3 text-slate-500">{Math.round(p.forecast).toLocaleString()}</td>
                        <td className="py-3 text-slate-500">{Math.round(p.actual).toLocaleString()}</td>
                        <td className={`py-3 text-right font-semibold ${p.error <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {p.error > 0 ? '+' : ''}{Math.round(p.error)} MW
                        </td>
                      </tr>
                    ))
                  : <tr><td colSpan="4" className="py-10 text-center text-slate-400">No intervals match the current filter.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Accuracy Analysis page
// ---------------------------------------------------------------------------
function Accuracy({ data, points, loading }) {
  const metrics = data?.metrics
  const quality = metrics ? Math.min(100, Math.max(0, metrics.accuracy)) : 0

  const errorDist = useMemo(() => {
    if (!points.length) return []
    const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${(i-5)*100} to ${(i-4)*100}`, count: 0, i }))
    const max = Math.max(...points.map(p => Math.abs(p.error)), 1)
    return points.reduce((acc, p) => {
      const idx = Math.min(9, Math.max(0, Math.floor((p.error + max) / (2 * max) * 10)))
      acc[idx].count++
      return acc
    }, bins)
  }, [points])

  const maxBin = Math.max(...errorDist.map(b => b.count), 1)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      {/* Metrics */}
      <section className={`${card} p-6 sm:p-8`}>
        <p className={label}>Quantitative evaluation</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Can traders trust the forecast?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Metrics computed from {data?.intervalCount ?? '—'} matched 30-minute forecast/actual pairs for January 2026.
        </p>

        {loading
          ? <div className={`${skeleton} mt-8 h-40`} />
          : (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <MetricTile label="Accuracy score" value={metrics ? `${metrics.accuracy}%` : '—'} desc="100 − (MAE / 1200 MW) × 100" />
              <MetricTile label="MAE" value={metrics ? `${metrics.mae} MW` : '—'} desc="Mean absolute error" />
              <MetricTile label="RMSE" value={metrics ? `${metrics.rmse} MW` : '—'} desc="Penalises large spikes more" />
              <MetricTile label="MAPE" value={metrics ? `${metrics.mape}%` : '—'} desc="Mean absolute % error (excl. near-zero)" />
              <MetricTile label="Bias" value={metrics ? `${metrics.bias} MW` : '—'} desc="+ve = over-forecast (too much wind)" colSpan />
            </div>
          )
        }

        {/* Error interpretation */}
        {metrics && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <strong className="block mb-1 text-slate-800 dark:text-slate-200">Procurement implication</strong>
            {metrics.bias > 0
              ? `The model over-predicts wind by ${metrics.bias} MW on average. The desk should hold an additional procurement buffer of at least ${Math.round(metrics.mae)} MW to cover the expected shortfall.`
              : `The model under-predicts wind by ${Math.abs(metrics.bias)} MW on average. Purchased volumes may slightly exceed actual renewable availability.`
            }
          </div>
        )}
      </section>

      {/* Confidence gauge + error distribution */}
      <div className="flex flex-col gap-5">
        <section className={`${card} flex flex-col items-center p-6 sm:p-8`}>
          <p className={label}>Confidence view</p>
          <div className="mt-8">
            <div
              className="grid h-44 w-44 place-items-center rounded-full border-[14px] border-slate-100 dark:border-slate-800"
              style={{ background: `conic-gradient(#10b981 ${quality * 3.6}deg, transparent 0)` }}
            >
              <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center dark:bg-slate-900">
                <strong className="text-3xl">{metrics ? `${metrics.accuracy}%` : '—'}</strong>
                <span className="text-[10px] text-slate-400">{points.length} intervals</span>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
            {loading ? 'Loading…' : metrics
              ? 'Higher score & lower MAE = less buffer needed for procurement.'
              : 'Appears once backend returns observations.'}
          </p>
        </section>

        {/* Error distribution bar chart */}
        {points.length > 0 && (
          <section className={`${card} p-5`}>
            <p className={label}>Error distribution</p>
            <p className="mt-1 text-[10px] text-slate-400">Forecast − Actual (MW) · {points.length} slots</p>
            <div className="mt-4 flex items-end gap-1 h-24">
              {errorDist.map(b => (
                <div key={b.i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${(b.count / maxBin) * 88}px`,
                      background: b.i < 5 ? '#10b981' : b.i > 5 ? '#f43f5e' : '#94a3b8'
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-slate-400">
              <span>Under-forecast</span><span>Zero</span><span>Over-forecast</span>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Monthly Trends page
// ---------------------------------------------------------------------------
function Monthly({ summary, summaryLoading, setDate, setPage }) {
  if (summaryLoading) return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }, (_, i) => <div key={i} className={`${skeleton} h-20`} />)}
    </div>
  )

  if (!summary) return (
    <div className={`${card} p-10 text-center text-sm text-slate-400`}>
      Monthly summary unavailable. Check the backend connection.
    </div>
  )

  const days = summary.days ?? []
  const maxMae = Math.max(...days.map(d => d.mae), 1)

  function goToDay(d) {
    setDate(d.date)
    setPage('overview')
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      {/* MAE trend */}
      <section className={`${card} p-6 sm:p-8`}>
        <p className={label}>January 2026 · {days.length} days</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Monthly accuracy trend</h2>
        <div className="mt-2 flex flex-wrap gap-6 text-sm">
          <Stat label="Avg MAE"      value={`${summary.averageMae} MW`} />
          <Stat label="Avg MAPE"     value={`${summary.averageMape}%`} />
          <Stat label="Avg Accuracy" value={`${summary.averageAccuracy}%`} />
        </div>

        {/* Bar chart */}
        <div className="mt-8 flex items-end gap-1 h-32">
          {days.map(d => {
            const h = Math.max(4, (d.mae / maxMae) * 120)
            const acc = d.accuracy
            const color = acc >= 80 ? '#10b981' : acc >= 60 ? '#f59e0b' : '#f43f5e'
            return (
              <button
                key={d.date}
                title={`${d.date}\nMAE: ${d.mae} MW\nAccuracy: ${d.accuracy}%`}
                onClick={() => goToDay(d)}
                className="flex-1 rounded-t transition-all hover:opacity-80 cursor-pointer"
                style={{ height: `${h}px`, background: color }}
              />
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-slate-400">
          <span>Jan 1</span><span>Jan 16</span><span>Jan 31</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">Click a bar to view that day's detail · colour: green ≥80%, amber ≥60%, red &lt;60% accuracy</p>
      </section>

      {/* Day list */}
      <section className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <p className={label}>Daily breakdown</p>
        </div>
        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {days.map(d => (
            <button key={d.date} onClick={() => goToDay(d)} className="flex w-full items-center justify-between px-5 py-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{new Date(`${d.date}T12:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span>
              <span className="text-slate-400">{d.mae} MW MAE</span>
              <span className={`font-bold ${d.accuracy>=80?'text-emerald-600':d.accuracy>=60?'text-amber-500':'text-rose-500'}`}>{d.accuracy}%</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interactive SVG Chart with hover tooltip
// ---------------------------------------------------------------------------
function InteractiveChart({ points, peakVal }) {
  const [hover, setHover] = useState(null)
  const visible = points.length
    ? points
    : Array.from({ length: 12 }, (_, i) => ({ time: `${String(i * 2).padStart(2,'0')}:00`, forecast: 0, actual: 0, error: 0 }))

  const W = 800, H = 230, PAD = 10
  function toX(i) { return (i / Math.max(visible.length - 1, 1)) * W }
  function toY(v) { return H - PAD - ((v || 0) / peakVal) * (H - 2 * PAD) }

  const forecastPts = visible.map((p, i) => `${toX(i)},${toY(p.forecast)}`).join(' ')
  const actualPts   = visible.map((p, i) => `${toX(i)},${toY(p.actual)}`).join(' ')
  const fillPts     = `0,${H} ${forecastPts} ${W},${H}`

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(peakVal * f))

  return (
    <div className="mt-8">
      <div className="relative h-64 pl-10">
        {/* Y-axis labels */}
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-slate-400">
          {[...gridLines].reverse().map(v => <span key={v}>{v.toLocaleString()}</span>)}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label="Wind generation forecast vs actual chart"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="wind-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor="#10b981" stopOpacity=".25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0"   />
            </linearGradient>
          </defs>

          {/* Grid */}
          {gridLines.map(v => (
            <line key={v} x1="0" y1={toY(v)} x2={W} y2={toY(v)} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />
          ))}

          {/* Fill + lines */}
          <polygon points={fillPts} fill="url(#wind-fill)" />
          <polyline points={actualPts}   fill="none" className="stroke-slate-400" strokeWidth="2" strokeDasharray="5 7" />
          <polyline points={forecastPts} fill="none" className="stroke-emerald-500" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />

          {/* Invisible hover zones */}
          {visible.map((p, i) => (
            <rect
              key={i}
              x={toX(i) - W / visible.length / 2}
              y={0}
              width={W / visible.length}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover({ ...p, x: toX(i), yF: toY(p.forecast), yA: toY(p.actual) })}
            />
          ))}

          {/* Hover indicator */}
          {hover && (
            <>
              <line x1={hover.x} y1={0} x2={hover.x} y2={H} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={hover.x} cy={hover.yF} r="4" fill="#10b981" />
              <circle cx={hover.x} cy={hover.yA} r="4" fill="#94a3b8" />
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900"
            style={{ left: `${Math.min(65, (hover.x / W) * 100)}%`, transform: 'translateX(-50%)' }}
          >
            <strong className="block text-slate-700 dark:text-slate-200">{hover.time} UTC</strong>
            <span className="block text-emerald-600">Forecast: {Math.round(hover.forecast).toLocaleString()} MW</span>
            <span className="block text-slate-400">Actual:   {Math.round(hover.actual).toLocaleString()} MW</span>
            <span className={`block font-semibold ${hover.error > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              Error: {hover.error > 0 ? '+' : ''}{Math.round(hover.error)} MW
            </span>
          </div>
        )}
      </div>

      {/* X-axis */}
      <div className="ml-10 mt-2 flex justify-between text-[10px] text-slate-400">
        {visible.filter((_, i) => i % Math.max(1, Math.floor(visible.length / 8)) === 0).map(p => (
          <span key={p.time}>{p.time}</span>
        ))}
      </div>
    </div>
  )
}

function ChartLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <span><i className="mr-2 inline-block h-0.5 w-4 rounded bg-emerald-500" />Forecast</span>
      <span><i className="mr-2 inline-block h-0.5 w-4 border-t-2 border-dashed border-slate-400" />Actual</span>
      <span className="ml-auto">48 half-hour slots · hover for detail</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric tiles / cards
// ---------------------------------------------------------------------------
function MetricCard({ label: lbl, value, detail, icon, tone }) {
  const colors = tone === 'violet'
    ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300'
    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
  return (
    <section className={`${card} group p-6 hover:-translate-y-1 hover:shadow-xl`}>
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${colors}`}>{icon}</span>
        <span className="text-2xl text-slate-200 transition group-hover:translate-x-1 dark:text-slate-700">⌁</span>
      </div>
      <p className={`${label} mt-6`}>{lbl}</p>
      <strong className="mt-2 block text-3xl tracking-tight text-slate-900 dark:text-white">{value}</strong>
      <p className="mt-2 text-[11px] text-slate-400">{detail}</p>
    </section>
  )
}

function MetricTile({ label: lbl, value, desc, colSpan }) {
  return (
    <div className={`rounded-2xl bg-slate-50 p-5 dark:bg-slate-800 ${colSpan ? 'sm:col-span-2' : ''}`}>
      <span className={label}>{lbl}</span>
      <strong className="mt-3 block text-2xl tracking-tight">{value}</strong>
      <p className="mt-1 text-[10px] text-slate-400">{desc}</p>
    </div>
  )
}

function Stat({ label: lbl, value }) {
  return (
    <div>
      <span className={label}>{lbl}</span>
      <strong className="mt-1 block text-lg">{value}</strong>
    </div>
  )
}

function StatusPill({ loading, data }) {
  const isDemo = data?.source?.includes('demo') || data?.source?.includes('fallback')
  if (loading) return <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800">Loading</span>
  return (
    <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
      isDemo ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
    }`}>
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${isDemo ? 'bg-amber-400' : 'bg-emerald-500'}`} />
      {data ? (isDemo ? 'Demo' : 'Live') : 'No data'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'UTC' }) + ' UTC'
}
