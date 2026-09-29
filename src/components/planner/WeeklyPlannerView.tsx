import React, { useState } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  getWeekRange,
  getDaysOfWeek,
  formatDisplayDate,
  formatShortDate,
  parseISODate,
  formatISODate,
  DAY_NAMES_SHORT,
  isWeeklyOff,
  getTodayISO,
} from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
} from 'lucide-react';
import { Task } from '../../types';

export const WeeklyPlannerView: React.FC = () => {
  const {
    tasks,
    selectedDate,
    setSelectedDate,
    setPlannerSubTab,
    toggleTaskStatus,
    openCreateTask,
    openEditTask,
    settings,
  } = useWorkPlan();

  const [activeDate, setActiveDate] = useState<string>(selectedDate || getTodayISO());
  const todayISO = getTodayISO();

  const weekRange = getWeekRange(activeDate);
  const weekDays = getDaysOfWeek(weekRange.start);

  const handlePrevWeek = () => {
    const d = parseISODate(activeDate);
    d.setDate(d.getDate() - 7);
    setActiveDate(formatISODate(d));
  };

  const handleNextWeek = () => {
    const d = parseISODate(activeDate);
    d.setDate(d.getDate() + 7);
    setActiveDate(formatISODate(d));
  };

  const handleGoCurrentWeek = () => {
    setActiveDate(todayISO);
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-neutral-200 rounded-md bg-white">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-l-md transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoCurrentWeek}
              className="px-3 py-1 text-xs font-medium border-x border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Current Week
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-r-md transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Week of {formatShortDate(weekRange.startISO)} – {formatShortDate(weekRange.endISO)}
          </h2>
        </div>

        <button
          onClick={() => openCreateTask(activeDate)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* 7 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map(dayISO => {
          const isToday = dayISO === todayISO;
          const isOff = isWeeklyOff(dayISO, settings.weeklyOffDays);
          const dayDate = parseISODate(dayISO);
          const dayName = DAY_NAMES_SHORT[dayDate.getDay()];
          const dayTasks = tasks
            .filter(t => t.date === dayISO)
            .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

          const total = dayTasks.length;
          const completed = dayTasks.filter(t => t.status === 'completed').length;
          const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div
              key={dayISO}
              className={`bg-white border rounded-lg flex flex-col min-h-[380px] overflow-hidden ${
                isToday
                  ? 'border-neutral-900 ring-1 ring-neutral-900'
                  : isOff
                  ? 'border-neutral-200 bg-amber-50/15'
                  : 'border-neutral-200'
              }`}
            >
              {/* Column Day Header */}
              <div
                className={`p-3 border-b flex items-center justify-between cursor-pointer ${
                  isOff ? 'bg-amber-50/40 border-amber-200/60' : 'bg-neutral-50/60 border-neutral-200'
                }`}
                onClick={() => {
                  setSelectedDate(dayISO);
                  setPlannerSubTab('daily');
                }}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900">{dayName}</span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      {formatShortDate(dayISO)}
                    </span>
                  </div>
                  {isOff && (
                    <span className="text-[10px] font-medium text-amber-700">Weekly Off</span>
                  )}
                </div>

                {total > 0 && (
                  <span className="text-[10px] font-mono font-semibold text-neutral-600 tabular-nums">
                    {completed}/{total}
                  </span>
                )}
              </div>

              {/* Day Progress bar */}
              {total > 0 && (
                <div className="w-full bg-neutral-100 h-1 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-1"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              )}

              {/* Tasks in column */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {dayTasks.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic text-center py-6">
                    {isOff ? 'Off day' : 'No tasks'}
                  </p>
                ) : (
                  dayTasks.map(t => {
                    const isDone = t.status === 'completed';
                    return (
                      <div
                        key={t.id}
                        className={`p-2 rounded border text-xs transition-colors group ${
                          isDone
                            ? 'bg-neutral-50/60 border-neutral-200 text-neutral-400'
                            : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            onClick={() => toggleTaskStatus(t.id)}
                            className="mt-0.5 text-neutral-400 hover:text-neutral-900 shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 hover:stroke-neutral-800" />
                            )}
                          </button>

                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => openEditTask(t)}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                              <span>{t.startTime}</span>
                              <span className="capitalize">{t.type.replace('_', ' ')}</span>
                            </div>
                            <p
                              className={`font-medium text-xs truncate mt-0.5 ${
                                isDone ? 'line-through text-neutral-400' : 'text-neutral-900'
                              }`}
                            >
                              {t.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add task button in footer */}
              <div className="p-2 border-t border-neutral-100 bg-neutral-50/30">
                <button
                  onClick={() => openCreateTask(dayISO)}
                  className="w-full py-1 text-[11px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded text-center transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
