export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/forecast')
  .replace(/\/api\/forecast$/, '')

export const FORECAST_URL = `${API_BASE_URL}/api/forecast`
export const SUMMARY_URL = `${API_BASE_URL}/api/summary`
export const JANUARY_START = '2026-01-01'
export const JANUARY_END = '2026-01-31'

export const PAGES = [
  { id: 'overview', label: 'Decision brief', icon: '⌂' },
  { id: 'forecast', label: 'Forecast explorer', icon: '⌁' },
  { id: 'accuracy', label: 'Accuracy analysis', icon: '◒', badge: 'Core' },
  { id: 'monthly', label: 'Monthly trends', icon: '▦' },
]

export const CARD_CLASS = 'rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_50px_-28px_rgba(15,23,42,0.3)] transition duration-300 dark:border-slate-700/70 dark:bg-slate-900 dark:shadow-none'
export const LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500'
export const SKELETON_CLASS = 'animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800'
