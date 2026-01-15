import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IMAGES } from '../constants';
import { useApp } from '../AppContext';
import { supabase } from '../supabaseClient';
import AvatarUpload from './AvatarUpload';

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const emailFromUrl = searchParams.get('email') || '';
  const phoneFromUrl = searchParams.get('phone') || '';

  const { user, signIn } = useApp(); // Used to check if logged in
  const [token, setToken] = useState(tokenFromUrl);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(emailFromUrl);
  const [phone, setPhone] = useState(phoneFromUrl);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If user is already logged in, we might just want to confirm the upgrade
  const isTargetingUpgrade = !!user;

  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
    if (emailFromUrl) setEmail(emailFromUrl);
    if (phoneFromUrl) setPhone(phoneFromUrl);
  }, [tokenFromUrl, emailFromUrl, phoneFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setEmailError(null);
    setPhoneError(null);

    try {
      // Prepare headers (if upgrading, we need the auth token)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const body: any = { token };

      if (!isTargetingUpgrade) {
        // New user fields
        body.email = email;
        body.password = password;
        body.full_name = fullName;
        body.phone = phone;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/acceptInvite`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific duplication errors
        if (result.error && (result.error.includes("telefone") || result.error.includes("Phone"))) {
          setPhoneError("Este telefone já está em uso.");
          throw new Error("Verifique os campos em vermelho.");
        }
        if (result.error && (result.error.includes("email") || result.error.includes("Email"))) {
          setEmailError("Este e-mail já está em uso.");
          throw new Error("Verifique os campos em vermelho.");
        }
        if (response.status === 409) {
          if (result.error?.toLowerCase().includes("cadastrado") || result.details?.includes("cadastrado")) {
            // Try to guess which field if generic
            if (phone) setPhoneError("Pode estar em uso.");
            else setEmailError("Pode estar em uso.");
          }
        }

        let errorMessage = result.error || "Falha ao aceitar convite";
        if (result.details) {
          if (typeof result.details === 'string') {
            errorMessage = result.details;
          } else {
            errorMessage = JSON.stringify(result.details);
          }
        } else {
          errorMessage = typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : String(errorMessage);
        }

        throw new Error(errorMessage);
      }

      // If success
      if (isTargetingUpgrade) {
        alert(`Perfil atualizado com sucesso! Novo cargo: ${result.role}`);
        navigate('/profile');
      } else {
        // New user created.
        alert('Conta criada com sucesso! Fazendo login...');
        if (result.user?.email && password) {
          // Auto login to smooth persistence
          await signIn(result.user.email, password);
        }
        navigate('/feed');
      }

    } catch (err: any) {
      console.error("AcceptInvite Catch Error:", err);
      if (typeof err.message === 'object') {
        setErrorMsg(JSON.stringify(err.message));
      } else {
        setErrorMsg(String(err.message || err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-[#0c121d] dark:text-white">
      <header className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="text-[#0c121d] dark:text-white flex size-12 shrink-0 items-center cursor-pointer" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </div>
        <h2 className="text-[#0c121d] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Aceitar Convite</h2>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        <div className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cover bg-center border-2 border-primary/20"
              style={{ backgroundImage: `url('${IMAGES.avatar1}')` }}>
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[#0c121d] dark:text-white text-base font-bold leading-tight">
                    {isTargetingUpgrade ? `Olá, ${user?.name}` : 'Você foi convidado'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {isTargetingUpgrade ? 'Upgrade de Cargo' : 'Novo Membro'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Token do convite</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-warning-orange/10 text-warning-orange rounded-lg">
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Cole seu token aqui"
                className="bg-transparent border-none outline-none text-xs font-bold w-full"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800 break-words">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* If user is already logged in, we don't need these fields */}
          {!isTargetingUpgrade && (
            <>
              <div className="flex justify-center mb-2">
                <AvatarUpload
                  url={avatarUrl}
                  onUpload={(url) => setAvatarUrl(url)}
                  editable={true}
                />
              </div>

              <label className="flex flex-col w-full">
                <p className="text-[#0c121d] dark:text-gray-200 text-sm font-semibold leading-normal pb-2">Nome Completo</p>
                <input
                  className="form-input flex w-full rounded-lg text-[#0c121d] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 h-14 placeholder:text-gray-400 p-[15px] text-base font-normal"
                  placeholder="Digite seu nome completo"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col w-full">
                <p className="text-[#0c121d] dark:text-gray-200 text-sm font-semibold leading-normal pb-2">E-mail</p>
                <div className={`flex w-full items-stretch rounded-lg shadow-sm border ${emailError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-700'}`}>
                  <input
                    className={`form-input flex w-full rounded-lg rounded-r-none border-none bg-white dark:bg-gray-800 h-14 p-[15px] text-base font-medium text-gray-900 dark:text-white`}
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    required
                  />
                  <div className="text-gray-400 flex bg-gray-50 dark:bg-gray-800 items-center justify-center pr-[15px] rounded-r-lg">
                    <span className={`material-symbols-outlined text-[20px] ${emailError ? 'text-red-500' : ''}`}>{emailError ? 'error' : 'mail'}</span>
                  </div>
                </div>
                {emailError && <span className="text-red-500 text-xs font-bold mt-1 ml-1">{emailError}</span>}
              </label>

              <label className="flex flex-col w-full">
                <p className="text-[#0c121d] dark:text-gray-200 text-sm font-semibold leading-normal pb-2">Telefone (Opcional)</p>
                <input
                  className={`form-input flex w-full rounded-lg text-[#0c121d] dark:text-white focus:outline-0 focus:ring-2 ${phoneError ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:ring-primary/50'} bg-white dark:bg-gray-800 h-14 placeholder:text-gray-400 p-[15px] text-base font-normal`}
                  placeholder="(11) 99999-9999"
                  type="tel"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    setPhoneError(null);
                  }}
                />
                {phoneError && <span className="text-red-500 text-xs font-bold mt-1 ml-1">{phoneError}</span>}
              </label>

              <label className="flex flex-col w-full">
                <p className="text-[#0c121d] dark:text-gray-200 text-sm font-semibold leading-normal pb-2">Criar Senha</p>
                <div className="flex w-full items-stretch rounded-lg">
                  <input
                    className="form-input flex w-full rounded-lg text-[#0c121d] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 h-14 placeholder:text-gray-400 p-[15px] rounded-r-none border-r-0 text-base font-normal"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <div className="text-primary flex border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer">
                    <span className="material-symbols-outlined text-[22px]">visibility</span>
                  </div>
                </div>
              </label>
            </>
          )}

          {isTargetingUpgrade && (
            <div className="p-4 bg-primary/10 rounded-xl text-primary text-sm">
              Você está logado como <strong>{user.name}</strong>. Ao aceitar este convite, suas permissões serão atualizadas.
            </div>
          )}

          <div className="flex items-start gap-3 px-1 mt-2">
            <input className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary bg-white dark:bg-gray-800 cursor-pointer" id="terms" type="checkbox" required />
            <label className="text-sm text-gray-600 dark:text-gray-400 leading-tight" htmlFor="terms">
              Eu li e aceito os <a className="text-primary font-medium underline" href="#">Termos de Uso</a> e a <a className="text-primary font-medium underline" href="#">Política de Privacidade</a> da plataforma Observer.
            </label>
          </div>

          <div className="mt-4">
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">check_circle</span>}
              {isTargetingUpgrade ? 'Confirmar Upgrade' : 'Criar conta e aceitar'}
            </button>
          </div>
        </form>

        <footer className="mt-auto py-6">
          <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg flex gap-3 border border-gray-200 dark:border-gray-700">
            <span className="material-symbols-outlined text-gray-400">info</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
              Este convite é exclusivo. Se você não reconhece o remetente, entre em contato com o suporte.
            </p>
          </div>
        </footer>
      </main>
      <div className="h-8 bg-background-light dark:bg-background-dark"></div>
    </div>
  );
};

export default AcceptInvite;