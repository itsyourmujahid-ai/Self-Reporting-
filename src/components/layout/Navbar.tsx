import React, { useState } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { ActiveNavTab } from '../../types';
import { Plus, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    openCreateTask,
  } = useWorkPlan();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveNavTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'today', label: 'Today' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleNavClick = (tab: ActiveNavTab) => {
    setActiveNavTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-neutral-200/80 no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="text-base font-semibold tracking-tight text-neutral-900 hover:text-neutral-700 transition-colors text-left"
            >
              Self Reporting
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(item => {
                const isActive =
                  activeNavTab === item.id ||
                  (item.id === 'calendar' && activeNavTab === 'planner');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-neutral-900 bg-neutral-100 font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateTask()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 text-neutral-600 hover:text-neutral-900 rounded-md"
              aria-label="Toggle Navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-2 space-y-0.5">
          {navItems.map(item => {
            const isActive =
              activeNavTab === item.id ||
              (item.id === 'calendar' && activeNavTab === 'planner');
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-neutral-900 bg-neutral-100 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
