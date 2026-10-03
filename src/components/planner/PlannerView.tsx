import React from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { PlannerSubTab } from '../../types';
import { DailyScheduleView } from './DailyScheduleView';
import { WeeklyPlannerView } from './WeeklyPlannerView';
import { MonthlyCalendarView } from './MonthlyCalendarView';

export const PlannerView: React.FC = () => {
  const { plannerSubTab, setPlannerSubTab } = useWorkPlan();

  const tabs: { id: PlannerSubTab; label: string }[] = [
    { id: 'daily', label: 'Daily Schedule' },
    { id: 'weekly', label: 'Weekly Planner' },
    { id: 'monthly', label: 'Monthly Calendar' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Work Planner
          </h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Plan, schedule, and execute your personal cadence
          </p>
        </div>

        {/* Segmented sub-navigation */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-[#E5E7EB] self-start sm:self-auto overflow-x-auto max-w-full">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPlannerSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                plannerSubTab === tab.id
                  ? 'bg-white text-[#E50914] font-bold shadow-xs border border-[#E5E7EB]'
                  : 'text-[#4B5563] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Content with liquid enter */}
      <div key={plannerSubTab} className="animate-liquid-page">
        {plannerSubTab === 'daily' && <DailyScheduleView />}
        {plannerSubTab === 'weekly' && <WeeklyPlannerView />}
        {plannerSubTab === 'monthly' && <MonthlyCalendarView />}
      </div>
    </div>
  );
};
