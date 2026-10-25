import { PAGES } from '../config'

export default function Header({ page, data, loading, dark, setDark }) {
  const currentPage = PAGES.find((item) => item.id === page)
  const isDemo = data?.source?.includes('demo') || data?.source?.includes('fallback')
  const badgeClass = loading
    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
    : isDemo
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/70 bg-[#f4f8f8]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-12 dark:border-slate-800/80 dark:bg-[#07131c]/90">
      <div className="flex items-center gap-2 text-xs text-slate-500"><span>Workspace</span><span className="text-slate-300 dark:text-slate-700">/</span><span className="font-semibold text-slate-800 dark:text-slate-100">{currentPage?.label}</span></div>
      <div className="flex items-center gap-3">
        <span className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold sm:flex ${badgeClass}`}><span className={`h-1.5 w-1.5 animate-pulse rounded-full ${loading ? 'bg-slate-300' : isDemo ? 'bg-amber-400' : 'bg-emerald-500'}`} />{loading ? 'Loading…' : data ? (isDemo ? 'Demo data' : 'Elexon source') : 'No data'}</span>
        <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:-rotate-12 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">{dark ? '☀' : '☾'}</button>
      </div>
    </header>
  )
}
