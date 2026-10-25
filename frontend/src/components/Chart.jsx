import { useState } from 'react'

export default function InteractiveChart({ points, peakValue }) {
  const [hover, setHover] = useState(null)
  const visible = points.length ? points : Array.from({ length: 12 }, (_, index) => ({ time: `${String(index * 2).padStart(2, '0')}:00`, forecast: 0, actual: 0, error: 0 }))
  const width = 800
  const height = 230
  const toX = (index) => (index / Math.max(visible.length - 1, 1)) * width
  const toY = (value) => height - 10 - ((value || 0) / peakValue) * (height - 20)
  const forecastPoints = visible.map((point, index) => `${toX(index)},${toY(point.forecast)}`).join(' ')
  const actualPoints = visible.map((point, index) => `${toX(index)},${toY(point.actual)}`).join(' ')
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((factor) => Math.round(peakValue * factor))

  return (
    <div className="mt-8">
      <div className="relative h-64 pl-10">
        <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-slate-400">{[...gridLines].reverse().map((value) => <span key={value}>{value.toLocaleString()}</span>)}</div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Wind generation forecast versus actual chart" onMouseLeave={() => setHover(null)}>
          <defs><linearGradient id="wind-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".25" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
          {gridLines.map((value) => <line key={value} x1="0" y1={toY(value)} x2={width} y2={toY(value)} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" />)}
          <polygon points={`0,${height} ${forecastPoints} ${width},${height}`} fill="url(#wind-fill)" />
          <polyline points={actualPoints} fill="none" className="stroke-slate-400" strokeWidth="2" strokeDasharray="5 7" />
          <polyline points={forecastPoints} fill="none" className="stroke-emerald-500" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {visible.map((point, index) => <rect key={point.startTime || point.time} x={toX(index) - width / visible.length / 2} y="0" width={width / visible.length} height={height} fill="transparent" onMouseEnter={() => setHover({ ...point, x: toX(index), yForecast: toY(point.forecast), yActual: toY(point.actual) })} />)}
          {hover && <><line x1={hover.x} y1="0" x2={hover.x} y2={height} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" /><circle cx={hover.x} cy={hover.yForecast} r="4" fill="#10b981" /><circle cx={hover.x} cy={hover.yActual} r="4" fill="#94a3b8" /></>}
        </svg>
        {hover && <div className="pointer-events-none absolute top-2 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900" style={{ left: `${Math.min(65, (hover.x / width) * 100)}%`, transform: 'translateX(-50%)' }}><strong className="block text-slate-700 dark:text-slate-200">{hover.time} UTC</strong><span className="block text-emerald-600">Forecast: {Math.round(hover.forecast).toLocaleString()} MW</span><span className="block text-slate-400">Actual: {Math.round(hover.actual).toLocaleString()} MW</span><span className={`block font-semibold ${hover.error > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>Error: {hover.error > 0 ? '+' : ''}{Math.round(hover.error)} MW</span></div>}
      </div>
      <div className="ml-10 mt-2 flex justify-between text-[10px] text-slate-400">{visible.filter((_, index) => index % Math.max(1, Math.floor(visible.length / 8)) === 0).map((point) => <span key={point.time}>{point.time}</span>)}</div>
    </div>
  )
}

export function ChartLegend() {
  return <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400"><span><i className="mr-2 inline-block h-0.5 w-4 rounded bg-emerald-500" />Forecast</span><span><i className="mr-2 inline-block h-0.5 w-4 border-t-2 border-dashed border-slate-400" />Actual</span><span className="ml-auto">48 half-hour slots · hover for detail</span></div>
}
