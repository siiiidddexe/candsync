import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BriefcaseIcon, TagIcon, UsersIcon, Cog6ToothIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
  UserCircleIcon, TableCellsIcon
} from '@heroicons/react/24/outline';

const NAV = [
  { to: '/',          label: 'Jobs',             icon: BriefcaseIcon,  exact: true },
  { to: '/templates', label: 'Header Templates', icon: TableCellsIcon, perm: ['templates','read'] },
  { to: '/statuses',  label: 'Statuses',         icon: TagIcon,        perm: ['statuses','read'] },
  { to: '/users',     label: 'Users',            icon: UsersIcon,      superadminOnly: true },
  { to: '/settings',  label: 'Settings',         icon: Cog6ToothIcon,  superadminOnly: true },
];

export default function Layout() {
  const { user, logout, can, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visible = NAV.filter(item => {
    if (item.superadminOnly) return isSuperAdmin;
    if (item.perm) return can(...item.perm);
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
        <div className="w-7 h-7 rounded bg-white flex items-center justify-center flex-shrink-0">
          <span className="text-black font-black text-xs">H</span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-none">Hiperboard</p>
          <p className="text-white/40 text-[10px] leading-none mt-0.5 tracking-wide">Resdex</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visible.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-3 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/40 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-black transition-transform duration-200 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-white/40 hover:text-white p-1">
          <XMarkIcon className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-56 bg-black flex-shrink-0">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setOpen(true)} className="text-slate-600 hover:text-black p-1 -ml-1">
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-black flex items-center justify-center">
              <span className="text-white font-black text-[10px]">H</span>
            </div>
            <div>
              <span className="font-semibold text-black text-sm">Hiperboard </span>
              <span className="text-slate-400 text-xs">Resdex</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
