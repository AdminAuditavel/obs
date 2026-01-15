import React from 'react';
import { useApp } from '../AppContext';

const ModerationQueue = () => {
  const { reports, resolveReport, user } = useApp();

  if (!user || user.role === 'contributor' || user.role === 'registered') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <span className="material-symbols-outlined text-4xl mb-2">lock</span>
        <p className="font-bold">Acesso Restrito</p>
        <p className="text-sm">Apenas Moderadores e Admins podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">shield_person</span>
            <h1 className="text-lg font-bold tracking-tight">Fila de Reports</h1>
          </div>
          <button className="text-primary text-sm font-semibold px-3 py-1 rounded-full hover:bg-primary/10 transition-colors">
            Editar
          </button>
        </div>

        <div className="px-4">
          <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between">
            <TabLink label="Todos" active />
            <TabLink label="Prioridade" dotColor="bg-danger" />
            <TabLink label="Resolvidos" />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-32">
        <div className="flex flex-col gap-px bg-slate-200 dark:bg-slate-800">
          {reports.length === 0 && <div className="p-10 text-center text-slate-500">Tudo limpo!</div>}
          {reports.map(report => (
            <div key={report.id} className="bg-card-light dark:bg-card-dark px-4 py-4 flex flex-col gap-3 group">
              <div className="flex items-start gap-3">
                <div className="flex size-6 mt-1 items-center justify-center">
                  <input className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 border-2 bg-transparent text-primary checked:bg-primary focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer" type="checkbox" />
                </div>
                <div className="size-16 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                  <img className="w-full h-full object-cover" src={report.image} alt="Report evidence" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${report.tagColor}`}>{report.tag}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs">{report.timeAgo}</span>
                  </div>
                  <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm line-clamp-1">{report.title}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{report.subtitle}</p>
                </div>
              </div>
              <div className="flex gap-2 pl-9">
                <button onClick={() => resolveReport(report.id)} className="flex-1 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-active active:scale-95 border border-slate-200 dark:border-slate-700">
                  Ignorar
                </button>
                <button onClick={() => resolveReport(report.id)} className="flex-1 h-9 rounded-lg bg-danger/10 text-danger text-xs font-bold transition-active active:scale-95 border border-danger/20">
                  Remover post
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-24 right-4 z-20">
          <button className="size-14 rounded-full bg-primary text-white shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </main>
    </div>
  );
};

const TabLink = ({ label, active, dotColor }: any) => (
  <a href="#" className={`flex flex-col items-center justify-center border-b-[3px] pb-[10px] pt-2 flex-1 ${active ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400'}`}>
    <div className="flex items-center gap-1">
      <p className="text-sm font-bold tracking-wide">{label}</p>
      {dotColor && <span className={`size-2 rounded-full ${dotColor}`}></span>}
    </div>
  </a>
)

export default ModerationQueue;