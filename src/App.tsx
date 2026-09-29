/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WorkPlanProvider, useWorkPlan } from './context/WorkPlanContext';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
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
    <div className="min-h-screen bg-neutral-50 flex flex-col text-neutral-900 font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeNavTab === 'dashboard' && <DashboardView />}
        {activeNavTab === 'planner' && <PlannerView />}
        {activeNavTab === 'tasks' && <TasksView />}
        {activeNavTab === 'reports' && <ReportsView />}
        {activeNavTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-4 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">Self Reporting</span>
            <span>·</span>
            <span>Personal Work Operating System</span>
          </div>
          <div>
            <span>Plan · Schedule · Execute · Complete · Report · Reflect</span>
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
