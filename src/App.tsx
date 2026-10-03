/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { WorkPlanProvider, useWorkPlan } from './context/WorkPlanContext';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DailyScheduleView } from './components/planner/DailyScheduleView';
import { PlannerView } from './components/planner/PlannerView';
import { TasksView } from './components/tasks/TasksView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AuthView } from './components/auth/AuthView';
import { AppLogo } from './components/common/AppLogo';

// Modals
import { MonthlySetupModal } from './components/planner/MonthlySetupModal';
import { TaskModal } from './components/tasks/TaskModal';
import { FollowUpModal } from './components/tasks/FollowUpModal';
import { MeetingModal } from './components/tasks/MeetingModal';

const AppContent: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    isAuthenticated,
    isAdmin,
    authLoading,
    login,
  } = useWorkPlan();

  // Support /admin route in browser URL path
  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      if (isAdmin) {
        setActiveNavTab('admin');
      }
    }
  }, [isAdmin, setActiveNavTab]);

  // Loading state while checking token & database connection
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center">
        <AppLogo size={44} />
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#4B5563]">
          <div className="w-3.5 h-3.5 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
          <span>Connecting to production database...</span>
        </div>
      </div>
    );
  }

  // Authentication gate: if not authenticated, render AuthView
  if (!isAuthenticated) {
    return <AuthView onAuthenticated={login} />;
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col text-[#111111] font-sans antialiased overflow-x-hidden selection:bg-[#E50914]/15 selection:text-[#E50914]">
      <Navbar />

      <main
        key={activeNavTab}
        className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-8 animate-liquid-page"
      >
        {activeNavTab === 'dashboard' && <DashboardView />}
        {activeNavTab === 'today' && <DailyScheduleView />}
        {(activeNavTab === 'calendar' || activeNavTab === 'planner') && <PlannerView />}
        {activeNavTab === 'tasks' && <TasksView />}
        {activeNavTab === 'reports' && <ReportsView />}
        {activeNavTab === 'settings' && <SettingsView />}
        {activeNavTab === 'admin' && (
          isAdmin ? (
            <AdminDashboardView />
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-xs text-[#4B5563] space-y-2">
              <h2 className="text-base font-bold text-[#111111]">Access Denied</h2>
              <p>You must have Super Admin authorization to view this section.</p>
              <button
                onClick={() => setActiveNavTab('dashboard')}
                className="mt-2 px-3 py-1.5 bg-[#111111] text-white rounded-md font-semibold hover:bg-black cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-4 no-print mt-auto mb-16 md:mb-0 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#4B5563]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#111111]">Self Reporting</span>
            <span>·</span>
            <span>Personal Work Operating System</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
            <span>Plan</span>
            <span>·</span>
            <span>Schedule</span>
            <span>·</span>
            <span>Execute</span>
            <span>·</span>
            <span>Report</span>
            <span>·</span>
            <span>Reflect</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <MonthlySetupModal />
      <TaskModal />
      <FollowUpModal />
      <MeetingModal />
    </div>
  );
};

export default function App() {
  return (
    <WorkPlanProvider>
      <AppContent />
    </WorkPlanProvider>
  );
}
