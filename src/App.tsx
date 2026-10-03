/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WorkPlanProvider, useWorkPlan } from './context/WorkPlanContext';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DailyScheduleView } from './components/planner/DailyScheduleView';
import { PlannerView } from './components/planner/PlannerView';
import { TasksView } from './components/tasks/TasksView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

// Modals
import { MonthlySetupModal } from './components/planner/MonthlySetupModal';
import { TaskModal } from './components/tasks/TaskModal';
import { FollowUpModal } from './components/tasks/FollowUpModal';
import { MeetingModal } from './components/tasks/MeetingModal';

const AppContent: React.FC = () => {
  const { activeNavTab } = useWorkPlan();

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
