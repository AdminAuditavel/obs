import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { supabase } from '../supabaseClient'; // Import supabase directly for table fetch
import { User, Invite } from '../types';

const ManageInvites = () => {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [role, setRole] = useState<'Contributor' | 'Moderator'>('Contributor');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  // Check availability when input changes (debounced) or on blur
  const checkAvailability = async (val: string) => {
    if (!val || val.length < 5) return;
    setInputError(null);

    const isEmail = val.includes('@');

    // Check User Profiles
    const { data: userExists } = await supabase
      .from('user_profiles')
      .select('id')
      .eq(isEmail ? 'email' : 'phone', val)
      .maybeSingle();

    if (userExists) {
      setInputError('Usuário já cadastrado!');
      return;
    }

    // Check Active Invites
    // Note: This requires RLS allowing read on invites for admins
    const { data: inviteExists } = await supabase
      .from('invites')
      .select('id')
      .eq('revoked', false)
      .gt('uses_left', 0)
      .gt('expires_at', new Date().toISOString())
      .eq(isEmail ? 'invited_email' : 'invited_phone', val)
      .maybeSingle();

    if (inviteExists) {
      setInputError('Convite já enviado e ativo!');
      return;
    }
  };

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching invites:", error);
      setErrorMsg(`Erro ao carregar convites: ${error.message}`);
    } else {
      setInvites(data || []);
    }
  };

  const handleCreate = async () => {
    if (!inputValue || inputError) return;
    setLoading(true);
    setErrorMsg(null);
    setGeneratedLink(null);
    setInputError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Determine if email or phone
      const isEmail = inputValue.includes('@');
      const payload: any = {
        role_id: role.toLowerCase(),
        expires_in_seconds: 86400 * 2 // 2 days default
      };

      if (isEmail) {
        payload.invited_email = inputValue;
      } else {
        payload.invited_phone = inputValue.replace(/\D/g, ''); // Send clean phone
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateInvite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Falha ao criar convite");
      }

      // Refresh list
      await fetchInvites();
      setInputValue('');

      // Generate Link
      let link = `${window.location.origin}/#/accept-invite?token=${result.token}`;
      if (isEmail) link += `&email=${encodeURIComponent(inputValue)}`;
      else link += `&phone=${encodeURIComponent(inputValue)}`;

      setGeneratedLink(link);

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from('invites').delete().eq('id', id);
    if (!error) fetchInvites();
  }

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const [listCopyId, setListCopyId] = useState<string | null>(null);

  const getInviteLink = (invite: Invite) => {
    let link = `${window.location.origin}/#/accept-invite?token=${invite.token}`;
    if (invite.invited_email) link += `&email=${encodeURIComponent(invite.invited_email)}`;
    else if (invite.invited_phone) link += `&phone=${encodeURIComponent(invite.invited_phone)}`;
    return link;
  };

  const copyListInvite = (invite: Invite) => {
    const link = getInviteLink(invite);
    navigator.clipboard.writeText(link);
    setListCopyId(invite.id);
    setTimeout(() => setListCopyId(null), 2000);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-primary">arrow_back_ios</span>
            <h1 className="text-lg font-bold tracking-tight">Gerenciar Convites</h1>
          </div>
          <button className="flex items-center gap-1 text-primary font-semibold text-sm">
            <span className="material-symbols-outlined text-sm">history_edu</span>
            Logs
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        <section className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Novo Convite</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
            {errorMsg && <p className="text-red-500 text-sm mb-2">{errorMsg}</p>}

            {!generatedLink ? (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Contato (E-mail ou Telefone)</label>
                  <input
                    className={`w-full h-12 rounded-lg border ${inputError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-primary'} bg-slate-50 dark:bg-slate-800 px-4 text-sm focus:ring-2 outline-none transition-all`}
                    placeholder="email@exemplo.com ou (11) 99999-9999"
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setGeneratedLink(null);
                      setInputError(null);
                    }}
                    onBlur={(e) => checkAvailability(e.target.value)}
                  />
                  {inputError && (
                    <p className="text-red-500 text-xs font-bold mt-1 ml-1">{inputError}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Cargo</label>
                  <div className="flex h-11 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button onClick={() => setRole('Contributor')} className={`flex-1 rounded-md text-sm font-semibold transition-all ${role === 'Contributor' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Contributor</button>
                    <button onClick={() => setRole('Moderator')} className={`flex-1 rounded-md text-sm font-semibold transition-all ${role === 'Moderator' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Moderator</button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Expiração</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    <button className="shrink-0 px-4 py-2 rounded-full border border-primary bg-primary/10 text-primary text-xs font-bold">48 HORAS</button>
                  </div>
                </div>
                <button onClick={handleCreate} disabled={loading || !inputValue || !!inputError} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-lg">link</span>}
                  {loading ? 'Gerando...' : 'Gerar Link de Convite'}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-green-600 text-3xl">check</span>
                  </div>
                  <h4 className="text-lg font-bold">Convite Gerado!</h4>
                  <p className="text-xs text-gray-500 mb-4">Envie este link para o {role === 'Moderator' ? 'moderador' : 'colaborador'}</p>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center gap-2 mb-2">
                    <p className="text-xs font-mono truncate flex-1 text-slate-600 dark:text-slate-300">{generatedLink}</p>
                  </div>

                  <div className="flex w-full gap-2">
                    <button onClick={copyToClipboard} className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${copyFeedback ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>
                      <span className="material-symbols-outlined">{copyFeedback ? 'check' : 'content_copy'}</span>
                      {copyFeedback ? 'Copiado!' : 'Copiar Link'}
                    </button>
                    <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Aqui está seu convite para o Observer: ${generatedLink}`)}`, '_blank')} className="h-12 w-12 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-6 h-6 contrast-200 brightness-200" alt="WA" />
                    </button>
                  </div>

                  <button onClick={() => setGeneratedLink(null)} className="mt-4 text-sm text-gray-500 font-medium hover:text-gray-700 dark:hover:text-gray-300 underline">
                    Gerar outro convite
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 px-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Convites Ativos</h3>
          <div className="space-y-3">
            {invites.map(invite => {
              const isExpired = new Date(invite.expires_at) < new Date();
              const isRevoked = invite.revoked;
              const noUses = invite.uses_left <= 0;

              let status = 'active';
              if (isRevoked) status = 'revoked';
              else if (isExpired) status = 'expired';
              else if (noUses) status = 'used';

              const statusLabel = {
                active: 'Ativo',
                revoked: 'Revogado',
                expired: 'Expirado',
                used: 'Esgotado'
              }[status];

              const statusColor = {
                active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                revoked: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                expired: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                used: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }[status];

              return (
                <div key={invite.id} className={`rounded-xl p-4 border flex items-center justify-between ${status !== 'active' ? 'bg-white/60 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 opacity-80' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="truncate font-semibold text-sm text-slate-900 dark:text-slate-100">{invite.invited_email || invite.invited_phone || 'Sem contato'}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>{statusLabel}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Expira: {new Date(invite.expires_at).toLocaleDateString()} {new Date(invite.expires_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'active' && invite.token && (
                      <button onClick={() => copyListInvite(invite)} className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${listCopyId === invite.id ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                        {listCopyId === invite.id ? (
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        ) : (
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        )}
                        {listCopyId === invite.id ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                    {status === 'active' && !invite.token && (
                      <span className="text-gray-400 text-[10px] italic pr-2" title="Convites antigos não possuem token salvo">Sem token</span>
                    )}
                    {status === 'active' ? (
                      <button onClick={() => handleRevoke(invite.id)} className="px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/30 text-red-500 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Revogar</button>
                    ) : (
                      <button className="px-3 py-1.5 rounded-lg text-slate-400 text-xs font-bold pointer-events-none">Inativo</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ManageInvites;