import React from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  formatDisplayDate,
  getTodayISO,
  isWeeklyOff,
  formatShortDate,
} from '../../utils/dateUtils';
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Calendar,
  Clock,
  Briefcase,
  PhoneCall,
  CalendarCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    tasks,
    todayStats,
    thisWeekStats,
    thisMonthStats,
    upcomingTasks,
    toggleTaskStatus,
    openCreateTask,
    openEditTask,
    openFollowUpModal,
    openMeetingModal,
    openMonthlySetup,
    setActiveNavTab,
    setPlannerSubTab,
    setSelectedDate,
    settings,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const isOffDay = isWeeklyOff(todayISO, settings.weeklyOffDays);

  // Today's tasks in chronological order
  const todayTaskList = tasks
    .filter(t => t.date === todayISO)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  const remainingToday = todayStats.total - todayStats.completed;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Personal Dashboard
            </h1>
            {isOffDay ? (
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Weekly Off Day
              </span>
            ) : (
              <span className="text-xs font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                Workday Active
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {formatDisplayDate(todayISO)} · Plan, execute, and monitor your personal throughput
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openMonthlySetup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-neutral-600" />
            <span>Monthly Setup</span>
          </button>
          <button
            onClick={() => openCreateTask(todayISO)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Primary 3-Column Metrics Grid: Today / This Week / This Month */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Today */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Today</span>
              <span className="text-xs font-mono text-neutral-500">{formatShortDate(todayISO)}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {todayStats.completed}
              </span>
              <span className="text-sm font-mono text-neutral-500 tabular-nums">
                / {todayStats.total} completed
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {remainingToday === 0 && todayStats.total > 0
                ? 'All scheduled tasks completed!'
                : `${remainingToday} tasks remaining today`}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
              <span className="text-neutral-500">Today's Progress</span>
              <span className="font-semibold text-neutral-900">{todayStats.completionRate}%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-neutral-900 h-1.5 transition-all duration-300"
                style={{ width: `${todayStats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: This Week */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">This Week</span>
              <span className="text-xs font-mono text-neutral-500">
                {thisWeekStats.total} total
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {thisWeekStats.completed}
              </span>
              <span className="text-sm font-mono text-neutral-500 tabular-nums">
                / {thisWeekStats.total} completed
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {thisWeekStats.pending} pending · {thisWeekStats.skipped} skipped
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
              <span className="text-neutral-500">Weekly Completion</span>
              <span className="font-semibold text-neutral-900">{thisWeekStats.completionRate}%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-neutral-900 h-1.5 transition-all duration-300"
                style={{ width: `${thisWeekStats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: This Month */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">This Month</span>
              <span className="text-xs font-mono text-neutral-500">
                {todayISO.slice(0, 7)}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {thisMonthStats.completed}
              </span>
              <span className="text-sm font-mono text-neutral-500 tabular-nums">
                / {thisMonthStats.total} planned
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {thisMonthStats.pending} pending · {thisMonthStats.skipped} skipped
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
              <span className="text-neutral-500">Monthly Completion</span>
              <span className="font-semibold text-neutral-900">{thisMonthStats.completionRate}%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-neutral-900 h-1.5 transition-all duration-300"
                style={{ width: `${thisMonthStats.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick View Today (Left 2 cols) & Upcoming Stream (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Quick View - Today's Task List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900">
                Today's Work Schedule
              </h2>
              <span className="text-xs font-mono text-neutral-500 tabular-nums">
                ({todayTaskList.length} items)
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedDate(todayISO);
                setActiveNavTab('planner');
                setPlannerSubTab('daily');
              }}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1 group"
            >
              <span>Full Daily Schedule</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Today Tasks Interactive Container */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-200 shadow-xs">
            {todayTaskList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Clock className="w-6 h-6 text-neutral-400 mx-auto" />
                <p className="text-xs font-medium text-neutral-700">
                  No tasks scheduled for today
                </p>
                <button
                  onClick={() => openCreateTask(todayISO)}
                  className="text-xs text-neutral-900 font-semibold underline hover:text-neutral-700"
                >
                  Add a task now
                </button>
              </div>
            ) : (
              todayTaskList.map(task => {
                const isCompleted = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isCompleted ? 'bg-neutral-50/50 text-neutral-500' : 'hover:bg-neutral-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* One-click toggle */}
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className="text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                        title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Circle className="w-4.5 h-4.5 hover:stroke-neutral-800" />
                        )}
                      </button>

                      {/* Time */}
                      <span className="font-mono text-xs text-neutral-500 tabular-nums shrink-0 w-12">
                        {task.startTime}
                      </span>

                      {/* Title & metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium truncate ${
                              isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900'
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.isImportant && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">
                              Important
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                          <span className="capitalize">{task.type.replace('_', ' ')}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.durationMinutes}m</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {task.type === 'follow_up' && !isCompleted && (
                        <button
                          onClick={() => openFollowUpModal(task)}
                          className="px-2 py-0.5 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded"
                        >
                          Next Step
                        </button>
                      )}

                      {task.type === 'meeting' && !isCompleted && (
                        <button
                          onClick={() => openMeetingModal(task)}
                          className="px-2 py-0.5 text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded"
                        >
                          Conclude
                        </button>
                      )}

                      <button
                        onClick={() => openEditTask(task)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 px-2 py-0.5"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Upcoming Stream */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-neutral-900">
            Upcoming & Deadlines
          </h2>

          <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-4 shadow-xs">
            {/* Upcoming Meetings */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 mb-2">
                <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Upcoming Meetings</span>
              </div>
              {upcomingTasks.upcomingMeetings.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No meetings scheduled</p>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.upcomingMeetings.slice(0, 3).map(m => (
                    <div
                      key={m.id}
                      onClick={() => openEditTask(m)}
                      className="p-2 border border-neutral-100 rounded bg-neutral-50/50 hover:bg-neutral-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                        <span>{m.date}</span>
                        <span>{m.startTime}</span>
                      </div>
                      <p className="font-semibold text-neutral-900 truncate mt-0.5">
                        {m.title}
                      </p>
                      {m.meetingWith && (
                        <p className="text-[11px] text-neutral-600 truncate">
                          with {m.meetingWith}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Follow-ups */}
            <div className="pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 mb-2">
                <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
                <span>Upcoming Follow-ups</span>
              </div>
              {upcomingTasks.upcomingFollowUps.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No follow-ups pending</p>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.upcomingFollowUps.slice(0, 3).map(f => (
                    <div
                      key={f.id}
                      onClick={() => openEditTask(f)}
                      className="p-2 border border-neutral-100 rounded bg-neutral-50/50 hover:bg-neutral-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                        <span>{f.date}</span>
                        <span>{f.startTime}</span>
                      </div>
                      <p className="font-semibold text-neutral-900 truncate mt-0.5">
                        {f.title}
                      </p>
                      {f.contactName && (
                        <p className="text-[11px] text-neutral-600 truncate">
                          Contact: {f.contactName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tomorrow's tasks preview */}
            <div className="pt-3 border-t border-neutral-100">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Tomorrow ({upcomingTasks.tomorrow.length})</span>
                </span>
                <button
                  onClick={() => {
                    const t = new Date();
                    t.setDate(t.getDate() + 1);
                    setSelectedDate(t.toISOString().slice(0, 10));
                    setActiveNavTab('planner');
                    setPlannerSubTab('daily');
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 underline"
                >
                  View
                </button>
              </div>

              {upcomingTasks.tomorrow.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No tasks set for tomorrow</p>
              ) : (
                <div className="space-y-1 text-xs">
                  {upcomingTasks.tomorrow.slice(0, 4).map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1 text-neutral-700">
                      <span className="truncate pr-2 font-medium">{t.title}</span>
                      <span className="font-mono text-[11px] text-neutral-500 shrink-0">
                        {t.startTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
