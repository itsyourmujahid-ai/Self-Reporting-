import React from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { ReportsSubTab } from '../../types';
import { WeeklyReportView } from './WeeklyReportView';
import { MonthlyReportView } from './MonthlyReportView';

export const ReportsView: React.FC = () => {
  const { reportsSubTab, setReportsSubTab } = useWorkPlan();

  const tabs: { id: ReportsSubTab; label: string }[] = [
    { id: 'weekly', label: 'Weekly Report' },
    { id: 'monthly', label: 'Monthly Report' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation Segmented Control */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 no-print">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Self-Reporting & Reflections
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit your accomplishments, analyze routine delivery, and record qualitative reflections
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-neutral-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setReportsSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                reportsSubTab === tab.id
                  ? 'bg-white text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {reportsSubTab === 'weekly' && <WeeklyReportView />}
      {reportsSubTab === 'monthly' && <MonthlyReportView />}
    </div>
  );
};
