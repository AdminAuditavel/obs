import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMAGES } from '../constants';

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/feed');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-between overflow-hidden px-6 py-12 bg-brand-neutral dark:bg-background-dark font-display antialiased">
      <div className="h-10"></div>

      <div className="flex flex-col items-center justify-center gap-8 w-full max-w-[375px]">
        <div className="relative flex items-center justify-center w-full px-4">
          <img src="/full-logo.png" alt="Observer" className="w-full max-w-[280px] h-auto object-contain" />
        </div>
        <p className="text-[#4a5568] dark:text-slate-400 text-base font-medium leading-relaxed max-w-[280px] mx-auto">
          Consciência situacional colaborativa
        </p>
      </div>


      <div className="flex flex-col items-center gap-6 w-full pb-8">
        <div className="relative flex items-center justify-center">
          <svg className="w-10 h-10 text-primary/10" viewBox="0 0 40 40">
            <circle cx="20" cy="20" fill="none" r="18" stroke="currentColor" strokeWidth="3"></circle>
          </svg>
          <svg className="absolute w-10 h-10 text-primary animate-spin-slow" viewBox="0 0 40 40">
            <circle cx="20" cy="20" fill="none" r="18" stroke="currentColor" strokeDasharray="80" strokeDashoffset="60" strokeLinecap="round" strokeWidth="3"></circle>
          </svg>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-[#0c121d] dark:text-slate-300 text-sm font-semibold tracking-wide uppercase">
            Autenticando
          </p>
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-primary rounded-full"></div>
            <div className="w-1 h-1 bg-primary/40 rounded-full"></div>
            <div className="w-1 h-1 bg-primary/20 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none">
        <div className="w-full h-full bg-center bg-no-repeat bg-cover" style={{ backgroundImage: `url('${IMAGES.splashBg}')` }}>
        </div>
      </div>
    </div >
  );
};

export default SplashScreen;