import { CARD_CLASS, LABEL_CLASS, SKELETON_CLASS } from '../config'
import { formatTime } from '../utils/date'
import { getPeakForecast } from '../utils/forecast'
import InteractiveChart, { ChartLegend } from '../components/Chart'
import { MetricCard } from '../components/MetricCard'

export default function Overview({ data, points, peakValue, loading }) {
  const metrics = data?.metrics
  const peak = getPeakForecast(points)
  const source = data?.source || '—'
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
    <section className={`${CARD_CLASS} overflow-hidden p-6 sm:p-8 xl:row-span-2`}>
      <div className="flex items-start justify-between"><div><p className={LABEL_CLASS}>Latest day-ahead view</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Wind generation forecast</h2></div><StatusPill loading={loading} data={data} /></div>
      <div className="mt-10 flex items-end gap-3">{loading ? <div className={`${SKELETON_CLASS} h-12 w-40`} /> : <><strong className="text-5xl font-semibold tracking-[-0.06em] text-slate-950 dark:text-white">{data ? Math.round(points.at(-1)?.forecast ?? 0).toLocaleString() : '—'}</strong><span className="mb-2 text-base text-slate-400">MW</span></>}</div>
      <p className="mt-2 text-xs text-slate-400">{source}{data?.decisionCutoff && <><span className="px-1.5">·</span>Decision cutoff {formatTime(data.decisionCutoff)}</>}</p>
      {loading ? <div className={`${SKELETON_CLASS} mt-8 h-64`} /> : <InteractiveChart points={points} peakValue={peakValue} />}
      <ChartLegend />
    </section>
    <MetricCard label="Forecast accuracy" value={metrics ? `${metrics.accuracy}%` : '—'} detail="Normalised from MAE vs UK wind capacity" icon="↗" />
    <MetricCard label="Mean absolute error" value={metrics ? `${metrics.mae} MW` : '—'} detail="Average absolute deviation from actuals" icon="≈" tone="violet" />
    <section className={`${CARD_CLASS} p-6 xl:col-start-2`}><p className={LABEL_CLASS}>Decision signal</p><h3 className="mt-3 text-lg font-semibold tracking-tight">{peak.forecast ? `Peak wind around ${peak.time}` : 'Waiting for data'}</h3><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{peak.forecast ? `${Math.round(peak.forecast).toLocaleString()} MW peak forecast. Use the measured MAE${metrics ? ` of ${metrics.mae} MW` : ''} when sizing the non-wind procurement buffer.` : 'Signal will be calculated once API data is loaded.'}</p><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />{source}</div></section>
    <section className={`${CARD_CLASS} p-6 xl:col-span-2`}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className={LABEL_CLASS}>Decision rule</p><h3 className="mt-2 text-lg font-semibold tracking-tight">Latest forecast available before gate closure</h3><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">For each 30-minute delivery interval, WindLens selects the newest <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">WINDFOR</code> publication at or before <strong>16:00 UTC</strong> on the day before delivery, then compares it with <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">FUELHH</code> WIND actuals.</p></div><div className="rounded-xl bg-slate-50 px-5 py-4 dark:bg-slate-800"><span className={LABEL_CLASS}>Gate cutoff</span><strong className="mt-1 block text-2xl text-emerald-600">16:00 <small className="text-xs font-medium text-slate-400">UTC</small></strong></div></div></section>
  </div>
}

function StatusPill({ loading, data }) {
  const isDemo = data?.source?.includes('demo') || data?.source?.includes('fallback')
  if (loading) return <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800">Loading</span>
  return <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isDemo ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}`}><span className={`h-1.5 w-1.5 animate-pulse rounded-full ${isDemo ? 'bg-amber-400' : 'bg-emerald-500'}`} />{data ? (isDemo ? 'Demo' : 'Live') : 'No data'}</span>
}
