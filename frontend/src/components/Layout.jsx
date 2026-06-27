import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BriefcaseIcon, TagIcon, UsersIcon, Cog6ToothIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon, UserCircleIcon
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/', label: 'Jobs', icon: BriefcaseIcon, exact: true },
  { to: '/statuses', label: 'Statuses', icon: TagIcon, perm: ['statuses', 'read'] },
  { to: '/users', label: 'Users', icon: UsersIcon, superadminOnly: true },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon, superadminOnly: true },
];

export default function Layout() {
  const { user, logout, can, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = navItems.filter(item => {
    if (item.superadminOnly) return isSuperAdmin;
    if (item.perm) return can(...item.perm);
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <span className="text-white font-semibold text-base">CandSync</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleNav.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <UserCircleIcon className="w-8 h-8 text-slate-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 transition-transform duration-200 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-3.5 right-3 text-slate-400 hover:text-white p-1">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-slate-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900 p-1 -ml-1">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">C</span>
            </div>
            <span className="font-semibold text-slate-900">CandSync</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
