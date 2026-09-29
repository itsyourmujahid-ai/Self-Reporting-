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
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Work Planner
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Plan, schedule, and execute your personal workflow
          </p>
        </div>

        {/* Segmented sub-navigation */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-neutral-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPlannerSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                plannerSubTab === tab.id
                  ? 'bg-white text-neutral-900 font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Content */}
      {plannerSubTab === 'daily' && <DailyScheduleView />}
      {plannerSubTab === 'weekly' && <WeeklyPlannerView />}
      {plannerSubTab === 'monthly' && <MonthlyCalendarView />}
    </div>
  );
};
