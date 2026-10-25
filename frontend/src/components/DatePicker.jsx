import { useState } from 'react'
import { JANUARY_END, JANUARY_START, LABEL_CLASS } from '../config'
import { formatShortDate } from '../utils/date'

export default function DatePicker({ date, setDate, moveDate }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState(date)

  function commit(value) {
    setEditing(false)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= JANUARY_START && value <= JANUARY_END) setDate(value)
    else setRaw(date)
  }

  return (
    <div className="shrink-0">
      <p className={`${LABEL_CLASS} mb-2`}>Delivery date</p>
      <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button onClick={() => moveDate(-1)} disabled={date === JANUARY_START} className="px-3 py-2.5 text-slate-400 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
        {editing ? <input autoFocus type="date" min={JANUARY_START} max={JANUARY_END} value={raw} onChange={(event) => setRaw(event.target.value)} onBlur={(event) => commit(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commit(raw); if (event.key === 'Escape') setEditing(false) }} className="w-36 bg-transparent text-center text-xs font-semibold outline-none dark:text-white" /> : <button onClick={() => { setRaw(date); setEditing(true) }} title="Click to type a date" className="min-w-28 text-center text-xs font-semibold hover:text-emerald-600">{formatShortDate(date)}</button>}
        <button onClick={() => moveDate(1)} disabled={date === JANUARY_END} className="px-3 py-2.5 text-slate-400 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30">›</button>
      </div>
      <p className="mt-1 text-center text-[9px] text-slate-400">January 2026 only · click date to type</p>
    </div>
  )
}
