import React from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import { IMAGES } from './constants';

// Pages
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';
import AcceptInvite from './components/AcceptInvite';
import Feed from './components/Feed';
import MapView from './components/MapView';
import CreateObservation from './components/CreateObservation';
import DetailView from './components/DetailView';
import OfficialDetails from './components/OfficialDetails';
import ManageInvites from './components/ManageInvites';
import ModerationQueue from './components/ModerationQueue';
import Profile from './components/Profile';
import Login from './components/Login';
import Register from './components/Register';
import UserList from './components/UserList';
import UserPostList from './components/UserPostList';
import AdminPostList from './components/AdminPostList';

// Navigation Wrapper
const AppLayout = ({ children }: React.PropsWithChildren) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useApp();

  // Routes where the bottom nav should appear
  const showNav = ['/feed', '/map', '/invites', '/moderation', '/profile'].includes(location.pathname);

  // Permissions
  const canInvite = user?.role === 'admin';
  const canModerate = user?.role === 'admin' || user?.role === 'moderator';

  // Handlers for restricted clicks
  const handleInviteClick = () => {
    if (!canInvite) return;
    navigate('/invites');
  };

  const handleModerationClick = () => {
    if (!canModerate) return;
    navigate('/moderation');
  };

  const handleMapClick = () => {
    if (!user) {
      navigate('/onboarding');
      return;
    }
    navigate('/map');
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark max-w-[480px] mx-auto relative shadow-2xl overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {children}
      </div>

      {showNav && (
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-card-dark/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 pb-6 pt-2">
          <div className="flex justify-between items-center">
            <NavBtn icon="radar" label="Awareness" active={location.pathname === '/feed'} onClick={() => navigate('/feed')} />
            <NavBtn icon="map" label="Mapa" active={location.pathname === '/map'} onClick={handleMapClick} />
            <NavBtn
              icon="mail"
              label="Convites"
              active={location.pathname === '/invites'}
              onClick={handleInviteClick}
              filled={location.pathname === '/invites'}
              restricted={!canInvite}
            />
            <NavBtn
              icon="admin_panel_settings"
              label="Moderador"
              active={location.pathname === '/moderation'}
              onClick={handleModerationClick}
              restricted={!canModerate}
            />
            <NavBtn
              icon="person"
              label="Perfil"
              active={location.pathname === '/profile'}
              onClick={() => navigate('/profile')}
              avatar={user?.avatar}
            />
          </div>
        </nav>
      )}
    </div>
  );
};

const NavBtn = ({ icon, label, active = false, onClick, filled = false, restricted = false, avatar }: any) => (
  <div className="group relative flex flex-col items-center">
    {restricted && (
      <div className="absolute bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-center z-50 pointer-events-none after:content-[''] after:absolute after:top-100% after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900">
        Este recurso está disponível apenas para colaboradores. Continue participando para desbloquear!
      </div>
    )}
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-slate-400'} ${restricted ? 'opacity-40' : ''}`}
    >
      {avatar ? (
        <div className={`h-6 w-6 rounded-full overflow-hidden border-2 transition-all ${active ? 'border-primary' : 'border-transparent'}`}>
          <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
        </div>
      ) : (
        <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${filled || active ? 1 : 0}` }}>{icon}</span>
      )}
      <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  </div>
);

const App = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/create" element={<CreateObservation />} />
            <Route path="/detail/:id" element={<DetailView />} />
            <Route path="/official" element={<OfficialDetails />} />
            <Route path="/invites" element={<ManageInvites />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/my-posts" element={<UserPostList />} />
            <Route path="/admin-posts" element={<AdminPostList />} />
            <Route path="/moderation" element={<ModerationQueue />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AppLayout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
