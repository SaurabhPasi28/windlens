import { useEffect, useState } from 'react'
import { PAGES } from './config'
import { shiftJanuaryDate, formatDateLabel } from './utils/date'
import { useForecastData } from './hooks/useForecastData'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DatePicker from './components/DatePicker'
import Overview from './pages/Overview'
import ForecastExplorer from './pages/ForecastExplorer'
import Accuracy from './pages/Accuracy'
import Monthly from './pages/Monthly'

export default function App() {
  const [page, setPage] = useState('overview')
  const [dark, setDark] = useState(false)
  const [date, setDate] = useState('2026-01-15')
  const { data, loading, error, summary, summaryLoading, points, peakValue } = useForecastData(date, page)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  function moveDate(delta) {
    setDate((current) => shiftJanuaryDate(current, delta))
  }

  const currentPage = PAGES.find((item) => item.id === page)

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900 selection:bg-emerald-200 dark:bg-[#07131c] dark:text-slate-100">
      <div className="pointer-events-none fixed -right-32 -top-40 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/10" />
      <div className="pointer-events-none fixed -bottom-40 -left-24 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl dark:bg-sky-900/10" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar page={page} setPage={setPage} />
        <main className="min-w-0 flex-1">
          <Header page={page} data={data} loading={loading} dark={dark} setDark={setDark} />
          <div className="mx-auto max-w-[1320px] space-y-6 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
            <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{formatDateLabel(date)}</p><h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl dark:text-white">Buy with a clearer view of the wind.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">A decision brief for UK day-ahead power trading — what the latest forecast says, how reliable it has been, and where uncertainty needs a buffer.</p></div>
              <DatePicker date={date} setDate={setDate} moveDate={moveDate} />
            </section>
            {error && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-amber-400 text-xs font-bold">!</span><div><strong>Data unavailable for this delivery date.</strong><p className="mt-1 text-xs opacity-80">{error}. The BMRS stream serves live data; January 2026 historical records require the archived export.</p></div></div>}
            {page === 'overview' && <Overview data={data} points={points} peakValue={peakValue} loading={loading} />}
            {page === 'forecast' && <ForecastExplorer data={data} points={points} peakValue={peakValue} loading={loading} />}
            {page === 'accuracy' && <Accuracy data={data} points={points} loading={loading} />}
            {page === 'monthly' && <Monthly summary={summary} summaryLoading={summaryLoading} setDate={setDate} setPage={setPage} />}
            {!currentPage && <p>Unknown page</p>}
          </div>
        </main>
      </div>
    </div>
  )
}
