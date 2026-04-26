import { NavLink } from 'react-router-dom';
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
          <div className="w-8 h-8 rounded-lg bg-gradient-indigo flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">
            R
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Reflections</div>
            <div className="text-xs text-white/40 truncate max-w-[120px]">{user?.name}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem to="/dashboard" icon="⊞" label="Dashboard" end />
        <NavItem to="/setup" icon="⚙" label="My Setup" />
        <NavItem to="/accomplishments" icon="✦" label="Accomplishments" />
        <NavItem to="/war" icon="📋" label="Activity Report" />

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
