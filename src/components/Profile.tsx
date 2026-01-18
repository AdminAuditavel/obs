import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { IMAGES } from '../constants';

import { supabase } from '../supabaseClient';
import AvatarUpload from './AvatarUpload';
import { UserBadge } from './UserBadge';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, favoriteAirports, toggleFavorite, setSelectedAirport } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCallsign, setEditCallsign] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('registered');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      // Initialize with context data first to avoid flickering
      setEditName(user.name);
      setEditCallsign(user.callsign || '');
      setEditPhone(user.phone || '');
      setEditJobTitle(user.job_title || 'registered');

      // Then fetch fresh data from DB
      fetchLatestProfile();
    }
  }, [user]);

  const fetchLatestProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_uid', user.id)
        .single();

      if (error) {
        console.error('Error fetching latest profile:', error);
        return;
      }

      if (data) {
        setEditName(data.full_name || '');
        setEditCallsign(data.callsign || '');
        setEditPhone(data.phone || '');
        setEditJobTitle(data.job_title || 'registered');
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleAvatarUpdate = async (url: string) => {
    if (!user) return;
    try {
      // Upsert here to ensure row exists
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          auth_uid: user.id,
          avatar_url: url,
          updated_at: new Date()
        }, { onConflict: 'auth_uid', ignoreDuplicates: false });

      if (error) throw error;
      alert('Avatar atualizado! Recarregue para ver em todo o app.');
    } catch (e: any) {
      alert('Erro ao atualizar avatar: ' + e.message);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          auth_uid: user.id,
          full_name: editName,
          callsign: editCallsign,
          phone: editPhone,
          job_title: editJobTitle,
          updated_at: new Date()
        }, { onConflict: 'auth_uid' });

      if (error) throw error;

      alert('Perfil atualizado com sucesso!');
      setIsEditing(false);
      // Force reload to refresh context
      window.location.reload();
    } catch (e: any) {
      alert('Erro ao salvar perfil: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <h1 className="text-xl font-bold">Você não está logado</h1>
        <button onClick={() => navigate('/login')} className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg">Entrar / Cadastrar</button>
        <button onClick={() => navigate(-1)} className="text-slate-500 text-sm">Voltar</button>
      </div>
    )
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <header className="sticky top-0 z-10 flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex size-10 shrink-0 items-center justify-center cursor-pointer" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
        </div>
        <h1 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">Perfil e Ajustes</h1>

        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-primary font-bold text-sm">Editar</button>
        ) : (
          <button onClick={handleSaveProfile} disabled={saving} className="text-primary font-bold text-sm">
            {saving ? '...' : 'Salvar'}
          </button>
        )}
      </header>

      <main className="max-w-md mx-auto pb-10">
        <section className="flex p-6 @container">
          <div className="flex w-full flex-col gap-6 items-center">
            <div className="flex gap-4 flex-col items-center">

              <AvatarUpload
                url={user.avatar}
                onUpload={handleAvatarUpdate}
                editable={true}
              />

              <div className="flex flex-col items-center justify-center w-full gap-2">
                {isEditing ? (
                  <input
                    className="text-primary font-medium text-base text-center bg-gray-100 dark:bg-gray-800 rounded px-2 w-full max-w-[150px]"
                    value={editCallsign}
                    onChange={e => setEditCallsign(e.target.value)}
                    placeholder="Callsign (Ex: PT-ABC)"
                  />
                ) : (
                  <p className="text-primary font-bold text-lg leading-normal text-center">{user.callsign || 'Sem Callsign'}</p>
                )}

                <div className="flex items-center gap-1 mt-1">
                  {isEditing ? (
                    <select
                      className="text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded px-2 w-full max-w-[150px] appearance-none text-center"
                      value={editJobTitle}
                      onChange={e => setEditJobTitle(e.target.value)}
                    >
                      <option value="registered">Entusiasta / Spotter</option>
                      <option value="ground">Equipe de Solo</option>
                      <option value="mech">Mecânico</option>
                      <option value="met">Meteorologia (PMET, OEA)</option>
                      <option value="atc">Navegação Aérea (ATC, OEA, AIS)</option>
                      <option value="pilot">Piloto/Comandante</option>
                      <option value="staff">Staff / Admin</option>
                    </select>
                  ) : (
                    <div className="flex items-center justify-center mt-1">
                      <UserBadge job_title={user.job_title} className="text-sm px-2 py-1" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Contact Info */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-slate-100 dark:border-slate-800">

              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">person</span>
                <div className="flex flex-col w-full">
                  <span className="text-xs text-slate-500 font-bold uppercase">Nome Completo</span>
                  {isEditing ? (
                    <input
                      className="text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded px-1 w-full"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Nome Completo"
                    />
                  ) : (
                    <span className="text-sm font-medium">{user.name}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-slate-400">mail</span>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-bold uppercase">E-mail</span>
                  <span className="text-sm font-medium">{user.email || 'Não informado'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-slate-400">call</span>
                <div className="flex flex-col w-full">
                  <span className="text-xs text-slate-500 font-bold uppercase">Telefone</span>
                  {isEditing ? (
                    <input
                      className="text-sm font-medium bg-gray-100 dark:bg-gray-800 rounded px-1 w-full"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="Adicionar telefone"
                    />
                  ) : (
                    <span className="text-sm font-medium">{user.phone || 'Não informado'}</span>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <button onClick={() => setIsEditing(false)} className="text-red-500 text-sm font-medium underline">Cancelar Edição</button>
            )}

          </div>
        </section>

        <section className="mt-4">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-4 pb-2 pt-4">Aeroportos Favoritos</h3>
          <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
            {favoriteAirports && favoriteAirports.length > 0 ? (
              favoriteAirports.map(ap => (
                <AirportToggle
                  key={ap.id}
                  code={ap.icao}
                  name={ap.city}
                  defaultChecked={true}
                  onChange={() => toggleFavorite(ap)}
                  onSelect={() => {
                    setSelectedAirport(ap);
                    navigate('/feed');
                  }}
                />
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500 text-center">Nenhum favorito selecionado.</p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-4 pb-2 pt-4">Notificações</h3>
          <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
            <SettingsToggle icon="notifications_active" label="Alertas de Proximidade" defaultChecked />
            <SettingsToggle icon="cloud" label="Atualizações Meteorológicas" defaultChecked />
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-4 pb-2 pt-4">Minha Conta</h3>
          <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
            <div
              onClick={() => {
                if (user.role === 'registered') return alert('Apenas Colaboradores podem gerenciar posts.');
                navigate('/my-posts');
              }}
              className={`flex items-center gap-4 px-4 min-h-[56px] justify-between border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors ${user.role === 'registered' ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="text-orange-600 flex items-center justify-center rounded-lg bg-orange-100 shrink-0 size-10">
                  <span className="material-symbols-outlined">article</span>
                </div>
                <p className="text-base font-medium">Meus Posts</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </div>
          </div>
        </section>

        {user.role === 'admin' && (
          <section className="mt-6">
            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider px-4 pb-2 pt-4">Administração</h3>
            <div className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
              <div onClick={() => navigate('/users')} className="flex items-center gap-4 px-4 min-h-[56px] justify-between border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-purple-600 flex items-center justify-center rounded-lg bg-purple-100 shrink-0 size-10">
                    <span className="material-symbols-outlined">manage_accounts</span>
                  </div>
                  <p className="text-base font-medium">Gerenciar Usuários</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </div>
              <div onClick={() => navigate('/admin-posts')} className="flex items-center gap-4 px-4 min-h-[56px] justify-between border-b border-slate-100 dark:border-slate-800 last:border-b-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-blue-600 flex items-center justify-center rounded-lg bg-blue-100 shrink-0 size-10">
                    <span className="material-symbols-outlined">list_alt</span>
                  </div>
                  <p className="text-base font-medium">Listas de Posts (Debug)</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
              </div>
            </div>
          </section>
        )}

        <section className="mt-10 px-4">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 h-14 rounded-xl bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 text-red-500 font-bold active:bg-red-50 dark:active:bg-red-900/10 transition-colors">
            <span className="material-symbols-outlined">logout</span>
            Sair da Conta
          </button>
          <p className="text-center text-slate-400 text-xs mt-6 font-medium">Versão 2.4.0 (Build 892)</p>
        </section>
      </main>
    </div>
  );
};

const AirportToggle = ({ code, name, defaultChecked, onChange, onSelect }: any) => (
  <div className="flex items-center gap-4 px-4 min-h-[56px] justify-between border-b border-slate-100 dark:border-slate-800 last:border-b-0">
    <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={onSelect}>
      <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
        <span className="material-symbols-outlined">flight_takeoff</span>
      </div>
      <p className="text-base font-medium flex-1 truncate">{code} - {name}</p>
    </div>
    <div className="shrink-0">
      <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center">
        <input defaultChecked={defaultChecked} onChange={onChange} className="ios-switch invisible absolute peer" type="checkbox" />
        <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 peer-checked:bg-primary">
          <div className="absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform duration-200"></div>
        </div>
      </label>
    </div>
  </div>
)

const SettingsToggle = ({ icon, label, defaultChecked }: any) => (
  <div className="flex items-center gap-4 px-4 min-h-[56px] justify-between border-b border-slate-100 dark:border-slate-800 last:border-b-0">
    <div className="flex items-center gap-4">
      <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="text-base font-medium">{label}</p>
    </div>
    <div className="shrink-0">
      <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center">
        <input defaultChecked={defaultChecked} className="ios-switch invisible absolute peer" type="checkbox" />
        <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-700 transition-colors duration-200 peer-checked:bg-primary">
          <div className="absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform duration-200"></div>
        </div>
      </label>
    </div>
  </div>
)

export default Profile;