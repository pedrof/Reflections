import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';

const NavItem = ({ to, icon, label, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
  >
    <span className="text-lg">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar() {
  const { user, hasRole, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface-800 border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-indigo flex items-center justify-center text-white font-bold text-sm shadow-glow-sm shrink-0">
            R
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">Reflections</div>
            <div className="text-xs text-white/40 truncate">{user?.name}</div>
          </div>
          <Link
            to="/setup"
            title="My Setup"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem to="/dashboard" icon="⊞" label="Dashboard" end />
        <NavItem to="/accomplishments" icon="✦" label="Accomplishments" />
        <NavItem to="/war" icon="📋" label="Activity Report" />
        <NavItem to="/reports/yearly" icon="📝" label="Yearly Report" />

        {hasRole('comms') && (
          <>
            <div className="pt-3 pb-1 px-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Communications
            </div>
            <NavItem to="/comms" icon="📢" label="Comms" />
          </>
        )}

        {(hasRole('supervisor') || hasRole('super_admin')) && (
          <>
            <div className="pt-3 pb-1 px-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Supervisor
            </div>
            <NavItem to="/supervisor/team" icon="👥" label="Team" />
            <NavItem to="/supervisor/accomplishments" icon="📊" label="Team Activity" />
          </>
        )}

        {hasRole('super_admin') && (
          <>
            <div className="pt-3 pb-1 px-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
              Admin
            </div>
            <NavItem to="/admin/tenants" icon="🏛" label="Organizations" />
            <NavItem to="/admin/users" icon="👤" label="All Users" />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="px-3 py-2 mb-1">
          <div className="text-xs text-white/40 truncate">{user?.email}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {user?.roles?.map((r) => (
              <span key={r} className="badge-indigo">{r}</span>
            ))}
          </div>
        </div>
        <button onClick={logout} className="nav-item w-full text-rose-400/70 hover:text-rose-400">
          <span>⬡</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
