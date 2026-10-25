import { LABEL_CLASS, PAGES } from '../config'

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200/70 bg-white/80 px-5 py-7 backdrop-blur-xl lg:flex lg:flex-col dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 rotate-[-4deg] place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-700 text-xl font-black text-white shadow-lg shadow-emerald-900/20 transition hover:rotate-3 hover:scale-105">W</div>
        <div><strong className="block text-base tracking-tight">WindLens</strong><span className="text-[11px] text-slate-400">Energy intelligence</span></div>
      </div>
      <div className="mt-10">
        <p className={LABEL_CLASS}>Workspace</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />UK power trading<span className="ml-auto text-slate-400">⌄</span>
        </div>
      </div>
      <nav className="mt-8 space-y-1.5">
        {PAGES.map((item) => (
          <button key={item.id} onClick={() => setPage(item.id)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition hover:translate-x-1 ${page === item.id ? 'bg-emerald-50 text-emerald-800 shadow-sm dark:bg-emerald-950/50 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-lg text-base ${page === item.id ? 'bg-white text-emerald-600 dark:bg-emerald-900' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{item.icon}</span>
            {item.label}
            {item.badge && <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] uppercase text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{item.badge}</span>}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#183b70] text-sm font-bold text-white">E</span><div><strong className="block text-xs">Elexon BMRS</strong><span className="text-[10px] text-slate-400">FUELHH + WINDFOR</span></div></div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Source configured</div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800"><div className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">TR</div><div><strong className="block text-xs">Trading desk</strong><span className="text-[10px] text-slate-400">Day-ahead analyst</span></div><span className="ml-auto text-slate-400">⌄</span></div>
      </div>
    </aside>
  )
}
