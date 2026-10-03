import React, { useState } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { ActiveNavTab } from '../../types';
import { getTodayISO } from '../../utils/dateUtils';
import { AppLogo } from '../common/AppLogo';
import {
  Plus,
  Menu,
  X,
  LayoutDashboard,
  CalendarCheck,
  Calendar as CalendarIcon,
  CheckSquare,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  User,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    setSelectedDate,
    openCreateTask,
    user,
    isAdmin,
    logout,
  } = useWorkPlan();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const baseNavItems: { id: ActiveNavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'today', label: 'Today', icon: CalendarCheck },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // If user is Super Admin, include the Super Admin tab
  const navItems = isAdmin
    ? [...baseNavItems, { id: 'admin' as ActiveNavTab, label: 'Super Admin', icon: Shield }]
    : baseNavItems;

  const handleNavClick = (tab: ActiveNavTab) => {
    if (tab === 'today') {
      setSelectedDate(getTodayISO());
    }
    setActiveNavTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] no-print transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Brand Logo & Wordmark */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleNavClick('dashboard')}
                className="group flex items-center gap-2.5 text-left focus-visible:outline-hidden cursor-pointer"
              >
                <AppLogo size="md" />
                <span className="text-base font-bold tracking-tight text-[#111111] group-hover:text-black transition-colors">
                  Self Reporting
                </span>
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map(item => {
                  const isActive =
                    activeNavTab === item.id ||
                    (item.id === 'calendar' && activeNavTab === 'planner');
                  const isSuperAdminItem = item.id === 'admin';

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? isSuperAdminItem
                            ? 'text-white bg-[#E50914] font-semibold shadow-xs shadow-[#E50914]/25'
                            : 'text-[#E50914] bg-[#E50914]/8 font-semibold shadow-2xs'
                          : isSuperAdminItem
                          ? 'text-[#E50914] hover:bg-[#E50914]/10 font-medium'
                          : 'text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100/70'
                      }`}
                    >
                      {isSuperAdminItem && <Shield className="w-3.5 h-3.5" />}
                      <span>{item.label}</span>
                      {isActive && !isSuperAdminItem && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#E50914] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right Action & User Profile */}
            <div className="flex items-center gap-2.5">
              {/* User Identity Chip */}
              {user && (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100/80 rounded-md border border-[#E5E7EB] text-xs text-[#4B5563]">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="max-w-[140px] truncate font-medium text-[#111111]" title={user.email}>
                    {user.displayName || user.email}
                  </span>
                  {isAdmin && (
                    <span className="text-[9px] font-bold text-[#E50914] bg-[#E50914]/10 px-1.5 py-0.2 rounded uppercase">
                      Admin
                    </span>
                  )}
                </div>
              )}

              {/* New Task Button */}
              <button
                onClick={() => openCreateTask()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#E50914] rounded-md hover:bg-[#c80812] active:scale-[0.97] transition-all duration-150 shadow-xs shadow-[#E50914]/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Task</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Sign out of your account"
                className="hidden sm:inline-flex p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                aria-label="Toggle Navigation"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E7EB] bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
            {user && (
              <div className="px-3 py-2 mb-2 bg-[#F3F4F6] rounded-md flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#111111]">{user.displayName}</div>
                  <div className="text-[11px] text-[#4B5563] font-mono">{user.email}</div>
                </div>
                {isAdmin && (
                  <span className="text-[10px] font-bold text-[#E50914] bg-[#E50914]/10 border border-[#E50914]/20 px-2 py-0.5 rounded-full uppercase">
                    Admin
                  </span>
                )}
              </div>
            )}

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive =
                activeNavTab === item.id ||
                (item.id === 'calendar' && activeNavTab === 'planner');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#E50914] bg-[#E50914]/8 font-semibold'
                      : 'text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#E50914]' : 'text-[#4B5563]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-[#E5E7EB]">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] px-1 py-1 flex items-center justify-between no-print shadow-lg pb-safe">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            activeNavTab === item.id ||
            (item.id === 'calendar' && activeNavTab === 'planner');
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-md transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-[#E50914] font-semibold'
                  : 'text-[#4B5563] hover:text-[#111111]'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110 text-[#E50914]' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate w-full text-center">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
