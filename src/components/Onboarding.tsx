import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants';

const Onboarding = () => {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-[#0c121d] dark:text-white">
      {/* TopAppBar */}
      <div className="flex items-center bg-transparent p-4 pb-2 justify-between shrink-0">
        <div className="text-[#0c121d] dark:text-white flex size-12 shrink-0 items-center justify-center cursor-pointer" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </div>
        <h2 className="text-[#0c121d] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Passo 1 de 3</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="@container px-4 py-3">
          <div className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-primary/10 dark:bg-primary/5 rounded-xl min-h-64 border border-primary/20"
            style={{ backgroundImage: `url('${IMAGES.cockpit}')` }}>
          </div>
        </div>

        <div className="flex w-full flex-row items-center justify-center gap-3 py-4">
          <div className="h-2 w-2 rounded-full bg-primary"></div>
          <div className="h-2 w-2 rounded-full bg-[#cdd7ea] dark:bg-gray-700"></div>
          <div className="h-2 w-2 rounded-full bg-[#cdd7ea] dark:bg-gray-700"></div>
        </div>

        <h2 className="text-[#0c121d] dark:text-white tracking-light text-[28px] font-bold leading-tight px-6 text-center pb-6 pt-2">Como funciona</h2>

        <div className="space-y-1 px-2">
          <FeatureItem icon="radar" title="Monitoramento em Tempo Real" desc="Acompanhe aeronaves e equipes em solo instantaneamente." />
          <FeatureItem icon="notifications_active" title="Alertas Inteligentes" desc="Receba notificações de proximidade e segurança operacional." />
          <FeatureItem icon="hub" title="Comunicação Integrada" desc="Conecte-se com a central e outros operadores de forma ágil." />
        </div>
      </div>

      <div className="fixed bottom-0 max-w-[480px] w-full bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 pb-8 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="flex items-center justify-center">
            <input
              className="h-6 w-6 rounded border-gray-300 text-primary focus:ring-primary bg-white dark:bg-gray-800 dark:border-gray-600"
              id="privacy-check"
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
          </div>
          <label className="text-sm text-[#4567a1] dark:text-gray-400 leading-tight" htmlFor="privacy-check">
            Li e aceito os termos da <a className="text-primary font-medium hover:underline inline-flex items-center" href="#">Política de Privacidade (LGPD)</a>
          </label>
        </div>
        <button
          onClick={() => navigate('/login', { replace: true })}
          disabled={!accepted}
          className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${accepted
              ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
              : 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
        >
          <span>Começar</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc }: any) => (
  <div className="flex items-center gap-4 bg-transparent px-4 min-h-[72px] py-2">
    <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-12">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <div className="flex flex-col justify-center">
      <p className="text-[#0c121d] dark:text-white text-base font-semibold leading-normal">{title}</p>
      <p className="text-[#4567a1] dark:text-gray-400 text-sm font-normal leading-normal">{desc}</p>
    </div>
  </div>
);

export default Onboarding;