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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Self-Reporting & Reflections
          </h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Audit your accomplishments, analyze routine delivery, and record qualitative reflections
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-[#E5E7EB] self-start sm:self-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setReportsSubTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                reportsSubTab === tab.id
                  ? 'bg-white text-[#E50914] font-bold shadow-xs border border-[#E5E7EB]'
                  : 'text-[#4B5563] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div key={reportsSubTab} className="animate-liquid-page">
        {reportsSubTab === 'weekly' && <WeeklyReportView />}
        {reportsSubTab === 'monthly' && <MonthlyReportView />}
      </div>
    </div>
  );
};
