import { useMemo, useState } from 'react'
import { CARD_CLASS, LABEL_CLASS, SKELETON_CLASS } from '../config'
import { downloadForecastCsv } from '../utils/forecast'
import InteractiveChart, { ChartLegend } from '../components/Chart'

export default function ForecastExplorer({ data, points, peakValue, loading }) {
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() => filter === 'over' ? points.filter((point) => point.error > 0) : filter === 'under' ? points.filter((point) => point.error < 0) : points, [points, filter])
  return <section className={`${CARD_CLASS} overflow-hidden`}>
    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-end sm:p-8 dark:border-slate-800"><div><p className={LABEL_CLASS}>Forecast explorer</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Day-ahead wind generation</h2><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{data?.source ?? 'No API response'} · {data?.intervalCount ?? 0} matched 30-min intervals</p></div><button onClick={() => downloadForecastCsv(points, data?.deliveryDate)} disabled={!points.length} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Download CSV ↓</button></div>
    <div className="p-6 sm:p-8">{loading ? <div className={`${SKELETON_CLASS} h-64`} /> : <InteractiveChart points={points} peakValue={peakValue} />}<ChartLegend /><div className="mt-8 flex gap-2">{[['all', 'All intervals'], ['over', 'Over-forecast'], ['under', 'Under-forecast']].map(([id, text]) => <button key={id} onClick={() => setFilter(id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>{text}</button>)}</div><ForecastTable points={filtered} loading={loading} /></div>
  </section>
}

function ForecastTable({ points, loading }) {
  return <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400 dark:border-slate-700"><th className="pb-3">Time (UTC)</th><th className="pb-3">Forecast MW</th><th className="pb-3">Actual MW</th><th className="pb-3 text-right">Error MW</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="py-10 text-center text-slate-400">Loading…</td></tr> : points.length ? points.map((point) => <tr key={point.startTime} className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"><td className="py-3 font-medium text-slate-600 dark:text-slate-300">{point.time}</td><td className="py-3 text-slate-500">{Math.round(point.forecast).toLocaleString()}</td><td className="py-3 text-slate-500">{Math.round(point.actual).toLocaleString()}</td><td className={`py-3 text-right font-semibold ${point.error <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{point.error > 0 ? '+' : ''}{Math.round(point.error)} MW</td></tr>) : <tr><td colSpan="4" className="py-10 text-center text-slate-400">No intervals match the current filter.</td></tr>}</tbody></table></div>
}
