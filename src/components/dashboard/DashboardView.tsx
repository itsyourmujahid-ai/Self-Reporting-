import React, { useState, useMemo } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  formatDisplayDate,
  getTodayISO,
  isWeeklyOff,
  formatShortDate,
  parseISODate,
  formatISODate,
  isTaskOverdue,
} from '../../utils/dateUtils';
import {
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  Clock,
  Play,
  CalendarCheck,
  Zap,
  TrendingUp,
  Calendar,
  Coffee,
} from 'lucide-react';
import { Task } from '../../types';

export const DashboardView: React.FC = () => {
  const {
    tasks,
    todayStats,
    thisWeekStats,
    thisMonthStats,
    toggleTaskStatus,
    startTask,
    completeTask,
    openCreateTask,
    openEditTask,
    openFollowUpModal,
    openMeetingModal,
    setActiveNavTab,
    setSelectedDate,
    settings,
    isDateOffDay,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const isOffDay = isDateOffDay(todayISO);

  const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'meetings' | 'follow_ups'>('all');

  // Today's task list in chronological order
  const todayTaskList = useMemo(() => {
    return tasks
      .filter(t => t.date === todayISO)
      .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  }, [tasks, todayISO]);

  // Current or Next immediate task
  const currentOrNextTask = useMemo(() => {
    // First priority: task currently in_progress
    const active = todayTaskList.find(t => t.status === 'in_progress');
    if (active) return { task: active, isRunning: true };

    // Second priority: first uncompleted/unskipped task for today
    const next = todayTaskList.find(t => t.status !== 'completed' && t.status !== 'skipped');
    if (next) return { task: next, isRunning: false };

    return null;
  }, [todayTaskList]);

  // Upcoming 7 Days Activities
  const upcomingList = useMemo(() => {
    const baseDate = parseISODate(todayISO);
    const endDate = new Date(baseDate);
    endDate.setDate(baseDate.getDate() + 7);
    const endDateISO = formatISODate(endDate);

    const upcoming = tasks.filter(t => {
      if (t.date <= todayISO || t.date > endDateISO) return false;
      if (t.status === 'completed' || t.status === 'skipped') return false;
      if (upcomingFilter === 'meetings') return t.type === 'meeting';
      if (upcomingFilter === 'follow_ups') return t.type === 'follow_up';
      return true;
    });

    return upcoming
      .sort((a, b) => {
        const cmpDate = a.date.localeCompare(b.date);
        if (cmpDate !== 0) return cmpDate;
        return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
      })
      .slice(0, 5);
  }, [tasks, todayISO, upcomingFilter]);

  // SVG Circular progress math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (todayStats.completionRate / 100) * circumference;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
              Daily Mission Control
            </h1>
            {isOffDay && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Off Day
              </span>
            )}
          </div>
          <p className="text-xs text-[#4B5563] mt-0.5 flex items-center gap-2">
            <span>{formatDisplayDate(todayISO)}</span>
            <span>·</span>
            <span>Focus on high-intent execution</span>
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedDate(todayISO);
              setActiveNavTab('today');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111111] bg-white border border-[#E5E7EB] hover:border-[#E50914] hover:text-[#E50914] rounded-md transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
            title="Go to Today's Tasks"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Today ({todayStats.completed}/{todayStats.total})</span>
          </button>

          {!isOffDay && (
            <>
              <button
                onClick={() => openCreateTask(todayISO, 'meeting')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111111] bg-white border border-[#E5E7EB] hover:border-[#111111]/30 hover:bg-neutral-50 rounded-md transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-[#4B5563]" />
                <span>+ Meeting</span>
              </button>
              <button
                onClick={() => openCreateTask(todayISO, 'one_time')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md transition-all shadow-xs shadow-[#E50914]/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Futuristic Hero: Today's Status & Current Focus */}
      {isOffDay ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 sm:p-8 text-center space-y-3.5 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
            <Coffee className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-full inline-block">
              OFF DAY
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111111]">
              No tasks scheduled — today is an off day.
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
              Today is configured as an off day. All routines, recurring tasks, and scheduled work are blocked and automatically skip off days.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700 font-mono">
            <span>Today tasks: <strong className="text-[#111111]">0</strong></span>
            <span>·</span>
            <span>Completed: <strong className="text-[#111111]">0</strong></span>
            <span>·</span>
            <span>Remaining: <strong className="text-[#111111]">0</strong></span>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card A: Circular Progress Ring & Key Numbers (Spans 1 col) */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-all hover:border-[#111111]/20 hover:shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111111] tracking-tight uppercase">
              Today's Completion
            </span>
            <span className="text-[11px] font-mono text-[#4B5563]">
              {todayStats.completed} / {todayStats.total}
            </span>
          </div>

          <div className="my-3 flex items-center justify-center gap-5">
            {/* SVG Ring with brand red accent */}
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#E5E7EB"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#E50914"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono text-[#111111] tabular-nums tracking-tight">
                  {todayStats.completionRate}%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#4B5563] font-semibold">
                  Progress
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                <span className="text-[#4B5563]">Remaining:</span>
                <strong className="text-[#111111] font-mono">{todayStats.remaining}</strong>
              </div>
              {todayStats.rescheduled > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Rescheduled:</span>
                  <strong className="font-mono">{todayStats.rescheduled}</strong>
                </div>
              )}
              {todayStats.overdue > 0 && (
                <div className="flex items-center gap-2 text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>Overdue:</span>
                  <strong className="font-mono">{todayStats.overdue}</strong>
                </div>
              )}
              {todayStats.skipped > 0 && (
                <div className="flex items-center gap-2 text-[#4B5563]">
                  <span className="w-2 h-2 rounded-full bg-neutral-300" />
                  <span>Skipped:</span>
                  <strong className="font-mono">{todayStats.skipped}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5E7EB]/80 flex items-center justify-between text-[11px] text-[#4B5563]">
            <span>{isOffDay ? 'Rest day cadence' : 'Standard work sprint'}</span>
            <button
              onClick={() => {
                setSelectedDate(todayISO);
                setActiveNavTab('today');
              }}
              className="text-[#E50914] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Today's Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card B: Next Action / Current Focus (Spans 2 cols on desktop) */}
        <div className="md:col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs transition-all hover:border-[#111111]/20 hover:shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]/80">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#E50914]" />
                <span className="text-xs font-bold text-[#111111] uppercase tracking-tight">
                  {currentOrNextTask?.isRunning ? 'Currently In Progress' : 'Immediate Next Task'}
                </span>
              </div>
              {currentOrNextTask?.task.startTime && (
                <span className="font-mono text-xs font-semibold text-[#4B5563] bg-neutral-100 px-2 py-0.5 rounded">
                  {currentOrNextTask.task.startTime} ({currentOrNextTask.task.durationMinutes}m)
                </span>
              )}
            </div>

            {currentOrNextTask ? (
              <div className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      onClick={() => openEditTask(currentOrNextTask.task)}
                      className="text-base sm:text-lg font-bold text-[#111111] hover:text-[#E50914] transition-colors cursor-pointer"
                    >
                      {currentOrNextTask.task.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5563] mt-1">
                      <span className="capitalize">{currentOrNextTask.task.type.replace('_', ' ')}</span>
                      <span>·</span>
                      <span>{currentOrNextTask.task.category}</span>
                      {currentOrNextTask.task.contactName && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-[#111111]">
                            With: {currentOrNextTask.task.contactName}
                          </span>
                        </>
                      )}
                      {currentOrNextTask.task.priority === 'critical' && (
                        <span className="text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded text-[10px]">
                          CRITICAL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Immediate Action Button */}
                  <div className="shrink-0">
                    {currentOrNextTask.isRunning ? (
                      <button
                        onClick={() => completeTask(currentOrNextTask.task.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-md transition-all shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete Task</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startTask(currentOrNextTask.task.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#111111] hover:bg-black active:scale-[0.98] rounded-md transition-all shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Now</span>
                      </button>
                    )}
                  </div>
                </div>

                {currentOrNextTask.task.notes && (
                  <p className="text-xs text-[#4B5563] bg-neutral-50 border border-[#E5E7EB] p-2.5 rounded-md italic">
                    &quot;{currentOrNextTask.task.notes}&quot;
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#4B5563] space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <p className="font-medium text-[#111111]">
                  All scheduled tasks for today are complete!
                </p>
                <button
                  onClick={() => openCreateTask(todayISO)}
                  className="text-[#E50914] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Schedule additional task</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#E5E7EB]/80 flex items-center justify-between text-xs text-[#4B5563]">
            <span>Continuous accountability cycle</span>
            <button
              onClick={() => openCreateTask(todayISO)}
              className="text-[#111111] hover:text-[#E50914] font-medium transition-colors cursor-pointer"
            >
              + Quick Add
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 3. Main Operational Grid: Today's Schedule & Cadence Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Schedule Timeline */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#111111] uppercase tracking-tight">
                Today's Schedule ({todayStats.total})
              </h2>
              {isOffDay && (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded uppercase">
                  OFF DAY
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedDate(todayISO);
                setActiveNavTab('today');
              }}
              className="text-xs text-[#E50914] hover:underline font-semibold inline-flex items-center gap-1 group cursor-pointer"
            >
              <span>Open Today's Tasks</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {isOffDay ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-xs text-[#4B5563] space-y-2 shadow-xs">
              <Coffee className="w-7 h-7 text-amber-700 mx-auto" />
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                  OFF DAY
                </span>
                <p className="text-xs font-semibold text-[#111111] mt-1.5">
                  No task cards — today is an off day.
                </p>
                <p className="text-[11px] text-[#4B5563]">
                  0 tasks · 0 pending · 0 completed
                </p>
              </div>
            </div>
          ) : todayTaskList.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-xs text-[#4B5563] space-y-2">
              <Clock className="w-6 h-6 text-[#4B5563]/50 mx-auto" />
              <p className="font-semibold text-[#111111]">No tasks scheduled for today.</p>
              <button
                onClick={() => openCreateTask(todayISO)}
                className="text-[#E50914] font-semibold hover:underline cursor-pointer"
              >
                + Add your first task
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#E5E7EB] overflow-hidden shadow-xs">
              {todayTaskList.map(task => {
                const isCompleted = task.status === 'completed';
                const isInProgress = task.status === 'in_progress';
                const isSkipped = task.status === 'skipped';
                const isOverdue = isTaskOverdue(task.date, task.startTime, task.status);

                return (
                  <div
                    key={task.id}
                    className={`px-4 py-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                      isInProgress
                        ? 'bg-[#E50914]/4 border-l-2 border-l-[#E50914]'
                        : isCompleted
                        ? 'bg-neutral-50/50 text-[#4B5563]/60'
                        : isSkipped
                        ? 'bg-neutral-50/20 text-[#4B5563]/40 italic'
                        : 'hover:bg-neutral-50/70 text-[#111111]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Status toggle checkbox */}
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className="text-[#4B5563] hover:text-[#E50914] transition-colors shrink-0 cursor-pointer"
                        title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 hover:stroke-[#E50914]" />
                        )}
                      </button>

                      {/* Time badge */}
                      <span className="font-mono text-[#4B5563] text-[11px] shrink-0 w-12 tabular-nums">
                        {task.startTime || 'Anytime'}
                      </span>

                      {/* Title & metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => openEditTask(task)}
                            className={`font-semibold break-words cursor-pointer hover:text-[#E50914] transition-colors ${
                              isCompleted
                                ? 'line-through text-[#4B5563]/60'
                                : 'text-[#111111]'
                            }`}
                          >
                            {task.title}
                          </span>

                          {isInProgress && (
                            <span className="text-[10px] font-bold text-[#E50914] bg-[#E50914]/10 border border-[#E50914]/20 px-1.5 py-0.2 rounded">
                              ACTIVE
                            </span>
                          )}

                          {isOverdue && !isCompleted && !isSkipped && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                              OVERDUE
                            </span>
                          )}

                          {task.type === 'meeting' && (
                            <span className="text-[10px] font-medium text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                              Meeting{task.meetingWith ? `: ${task.meetingWith}` : ''}
                            </span>
                          )}

                          {task.type === 'follow_up' && (
                            <span className="text-[10px] font-medium text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              Follow-up{task.contactName ? `: ${task.contactName}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Task Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.type === 'meeting' && !isCompleted && !isSkipped && (
                        <button
                          onClick={() => openMeetingModal(task)}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                        >
                          Conclude
                        </button>
                      )}

                      {task.type === 'follow_up' && !isCompleted && !isSkipped && (
                        <button
                          onClick={() => openFollowUpModal(task)}
                          className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                        >
                          Follow-up
                        </button>
                      )}

                      {!isCompleted && !isSkipped && (
                        isInProgress ? (
                          <button
                            onClick={() => completeTask(task.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                          >
                            Done
                          </button>
                        ) : (
                          <button
                            onClick={() => startTask(task.id)}
                            className="p-1 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded transition-colors"
                            title="Start task"
                          >
                            <Play className="w-3.5 h-3.5 fill-[#4B5563] hover:fill-[#111111]" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Upcoming Activities & Cadence Progress */}
        <div className="space-y-6">
          {/* Upcoming Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111111] uppercase tracking-tight">
                Upcoming (7 Days)
              </h2>

              {/* Segmented Filter */}
              <div className="flex items-center gap-1 text-[11px] text-[#4B5563]">
                <button
                  onClick={() => setUpcomingFilter('all')}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    upcomingFilter === 'all'
                      ? 'text-[#E50914] font-bold bg-[#E50914]/8'
                      : 'hover:text-[#111111]'
                  }`}
                >
                  All
                </button>
                <span>·</span>
                <button
                  onClick={() => setUpcomingFilter('meetings')}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    upcomingFilter === 'meetings'
                      ? 'text-[#E50914] font-bold bg-[#E50914]/8'
                      : 'hover:text-[#111111]'
                  }`}
                >
                  Meetings
                </button>
                <span>·</span>
                <button
                  onClick={() => setUpcomingFilter('follow_ups')}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    upcomingFilter === 'follow_ups'
                      ? 'text-[#E50914] font-bold bg-[#E50914]/8'
                      : 'hover:text-[#111111]'
                  }`}
                >
                  Follow-ups
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#E5E7EB] overflow-hidden shadow-xs">
              {upcomingList.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#4B5563]">
                  No upcoming items scheduled in this period.
                </p>
              ) : (
                upcomingList.map(task => (
                  <div
                    key={task.id}
                    onClick={() => openEditTask(task)}
                    className="group px-4 py-3 flex items-center justify-between text-xs hover:bg-neutral-50 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <span className="font-semibold text-[#111111] group-hover:text-[#E50914] transition-colors truncate block">
                        {task.title}
                      </span>
                      <span className="text-[11px] text-[#4B5563]">
                        {task.meetingWith ? `with ${task.meetingWith}` : task.category}
                      </span>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[11px] text-[#4B5563] tabular-nums">
                      <div className="font-semibold text-[#111111]">{formatShortDate(task.date)}</div>
                      <div className="text-[10px] text-[#4B5563]">{task.startTime || 'Anytime'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cadence Progress Cards (Interactive: navigates to Reports) */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#111111] uppercase tracking-tight">
              Cadence Progress
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {/* Weekly Card (Click to open Weekly Report) */}
              <div
                onClick={() => setActiveNavTab('reports')}
                className="group bg-white border border-[#E5E7EB] hover:border-[#111111]/30 hover:shadow-sm rounded-xl p-4 transition-all duration-150 cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#111111] group-hover:text-[#E50914] transition-colors flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>This Week</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-[#111111] tabular-nums">
                    {thisWeekStats.completionRate}%
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#E50914] h-1.5 transition-all duration-500 rounded-full"
                    style={{ width: `${thisWeekStats.completionRate}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#4B5563]">
                  <span>{thisWeekStats.completed} of {thisWeekStats.total} completed</span>
                  <span className="text-[#E50914] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Open <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>

              {/* Monthly Card (Click to open Monthly Report) */}
              <div
                onClick={() => setActiveNavTab('reports')}
                className="group bg-white border border-[#E5E7EB] hover:border-[#111111]/30 hover:shadow-sm rounded-xl p-4 transition-all duration-150 cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#111111] group-hover:text-[#E50914] transition-colors flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#111111]" />
                    <span>This Month</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-[#111111] tabular-nums">
                    {thisMonthStats.completionRate}%
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#111111] h-1.5 transition-all duration-500 rounded-full"
                    style={{ width: `${thisMonthStats.completionRate}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#4B5563]">
                  <span>{thisMonthStats.completed} of {thisMonthStats.total} completed</span>
                  <span className="text-[#111111] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Open <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
