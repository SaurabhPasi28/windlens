import { CARD_CLASS, LABEL_CLASS } from '../config'

export function MetricCard({ label, value, detail, icon, tone = 'emerald' }) {
  const colors = tone === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
  return <section className={`${CARD_CLASS} group p-6 hover:-translate-y-1 hover:shadow-xl`}><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${colors}`}>{icon}</span><span className="text-2xl text-slate-200 transition group-hover:translate-x-1 dark:text-slate-700">⌁</span></div><p className={`${LABEL_CLASS} mt-6`}>{label}</p><strong className="mt-2 block text-3xl tracking-tight text-slate-900 dark:text-white">{value}</strong><p className="mt-2 text-[11px] text-slate-400">{detail}</p></section>
}

export function MetricTile({ label, value, desc, colSpan = false }) {
  return <div className={`rounded-2xl bg-slate-50 p-5 dark:bg-slate-800 ${colSpan ? 'sm:col-span-2' : ''}`}><span className={LABEL_CLASS}>{label}</span><strong className="mt-3 block text-2xl tracking-tight">{value}</strong><p className="mt-1 text-[10px] text-slate-400">{desc}</p></div>
}

export function Stat({ label, value }) {
  return <div><span className={LABEL_CLASS}>{label}</span><strong className="mt-1 block text-lg">{value}</strong></div>
}
