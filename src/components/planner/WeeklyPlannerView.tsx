import React, { useState } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  getWeekRange,
  getDaysOfWeek,
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
} from 'lucide-react';

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
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-50 rounded-l-md transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoCurrentWeek}
              className="px-3 py-1.5 text-xs font-semibold border-x border-[#E5E7EB] text-[#111111] hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Current Week
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-50 rounded-r-md transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-[#111111] tracking-tight">
            Week of {formatShortDate(weekRange.startISO)} – {formatShortDate(weekRange.endISO)}
          </h2>
        </div>

        <button
          onClick={() => openCreateTask(activeDate)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md transition-all shadow-xs shadow-[#E50914]/20 cursor-pointer self-start sm:self-auto"
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
              className={`bg-white border rounded-xl flex flex-col min-h-0 md:min-h-[380px] overflow-hidden shadow-xs transition-all ${
                isToday
                  ? 'border-[#E50914] ring-1 ring-[#E50914]'
                  : isOff
                  ? 'border-[#E5E7EB] bg-amber-50/15'
                  : 'border-[#E5E7EB]'
              }`}
            >
              {/* Column Day Header */}
              <div
                className={`p-3 border-b flex items-center justify-between cursor-pointer transition-colors ${
                  isToday
                    ? 'bg-[#E50914]/6 border-b-[#E50914]/30'
                    : isOff
                    ? 'bg-amber-50/40 border-amber-200/60'
                    : 'bg-neutral-50/60 border-[#E5E7EB] hover:bg-neutral-100/50'
                }`}
                onClick={() => {
                  setSelectedDate(dayISO);
                  setPlannerSubTab('daily');
                }}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isToday ? 'text-[#E50914]' : 'text-[#111111]'}`}>
                      {dayName}
                    </span>
                    <span className="text-[11px] font-mono text-[#4B5563]">
                      {formatShortDate(dayISO)}
                    </span>
                  </div>
                  {isOff && (
                    <span className="text-[10px] font-semibold text-amber-800">Weekly Off</span>
                  )}
                </div>

                {total > 0 && (
                  <span className="text-[10px] font-mono font-bold text-[#111111] tabular-nums">
                    {completed}/{total}
                  </span>
                )}
              </div>

              {/* Day Progress bar */}
              {total > 0 && (
                <div className="w-full bg-neutral-100 h-1 overflow-hidden">
                  <div
                    className={`${isToday ? 'bg-[#E50914]' : 'bg-[#111111]'} h-1 transition-all duration-300`}
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              )}

              {/* Tasks in column */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {dayTasks.length === 0 ? (
                  <p className="text-[11px] text-[#4B5563]/50 italic text-center py-6">
                    {isOff ? 'Off day' : 'No tasks'}
                  </p>
                ) : (
                  dayTasks.map(t => {
                    const isDone = t.status === 'completed';
                    return (
                      <div
                        key={t.id}
                        className={`p-2 rounded-lg border text-xs transition-colors group ${
                          isDone
                            ? 'bg-neutral-50/60 border-[#E5E7EB] text-[#4B5563]/50'
                            : 'bg-white border-[#E5E7EB] hover:border-[#111111]/30 hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            onClick={() => toggleTaskStatus(t.id)}
                            className="mt-0.5 text-[#4B5563] hover:text-[#E50914] shrink-0 cursor-pointer"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 hover:stroke-[#E50914]" />
                            )}
                          </button>

                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => openEditTask(t)}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#4B5563]">
                              <span>{t.startTime || 'Anytime'}</span>
                              <div className="flex items-center gap-1">
                                {t.status === 'in_progress' && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" title="Active in progress" />
                                )}
                                <span className="capitalize">{t.type.replace('_', ' ')}</span>
                              </div>
                            </div>
                            <p
                              className={`font-semibold text-xs truncate mt-0.5 ${
                                isDone ? 'line-through text-[#4B5563]/60' : 'text-[#111111]'
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
              <div className="p-2 border-t border-[#E5E7EB] bg-neutral-50/30">
                <button
                  onClick={() => openCreateTask(dayISO)}
                  className="w-full py-1 text-[11px] font-medium text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded text-center transition-colors cursor-pointer"
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
