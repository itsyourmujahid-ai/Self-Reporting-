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
  Check,
  CalendarCheck,
  PhoneCall,
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
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const isOffDay = isWeeklyOff(todayISO, settings.weeklyOffDays);

  const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'meetings' | 'follow_ups'>('all');

  // Today's task list in chronological order
  const todayTaskList = useMemo(() => {
    return tasks
      .filter(t => t.date === todayISO)
      .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  }, [tasks, todayISO]);

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
      .slice(0, 6);
  }, [tasks, todayISO, upcomingFilter]);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      action: 'completed' | 'in_progress' | 'rescheduled' | 'skipped';
      timeText: string;
      timestamp: string;
    }> = [];

    tasks.forEach(t => {
      if (t.completedAt) {
        items.push({
          id: `comp-${t.id}`,
          title: t.title,
          action: 'completed',
          timeText: t.completedAt.slice(11, 16) || 'Completed',
          timestamp: t.completedAt,
        });
      } else if (t.startedAt && t.status === 'in_progress') {
        items.push({
          id: `start-${t.id}`,
          title: t.title,
          action: 'in_progress',
          timeText: t.startedAt.slice(11, 16) || 'Started',
          timestamp: t.startedAt,
        });
      } else if (t.rescheduledAt && t.status === 'rescheduled') {
        items.push({
          id: `resched-${t.id}`,
          title: t.title,
          action: 'rescheduled',
          timeText: t.rescheduledDate ? `Moved to ${formatShortDate(t.rescheduledDate)}` : 'Rescheduled',
          timestamp: t.rescheduledAt,
        });
      }
    });

    return items
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 4);
  }, [tasks]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 1. Calm Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-2 border-b border-neutral-100">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
            <span>{formatDisplayDate(todayISO)}</span>
            {isOffDay && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-800 font-medium">Scheduled off day</span>
              </>
            )}
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openCreateTask(todayISO, 'meeting')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-md transition-colors"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-neutral-500" />
            <span>+ Meeting</span>
          </button>
          <button
            onClick={() => openCreateTask(todayISO, 'one_time')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* 2. Today's Progress Strip (Clean & minimal, not 6 huge colorful cards) */}
      <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-neutral-900">
              Today: {todayStats.completed} of {todayStats.total} completed
            </span>
            <span className="text-neutral-400">·</span>
            <span className="text-neutral-600 font-medium font-mono">
              {todayStats.completionRate}%
            </span>
          </div>

          <div className="flex items-center gap-3 text-neutral-500 text-[11px]">
            <span>{todayStats.remaining} remaining</span>
            {todayStats.rescheduled > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-blue-700 font-medium">{todayStats.rescheduled} rescheduled</span>
              </>
            )}
            {todayStats.overdue > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-700 font-medium">{todayStats.overdue} overdue</span>
              </>
            )}
            {todayStats.skipped > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{todayStats.skipped} skipped</span>
              </>
            )}
          </div>
        </div>

        {/* Minimal progress bar */}
        <div className="mt-2.5 w-full bg-neutral-200/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-neutral-900 h-1.5 transition-all duration-300"
            style={{ width: `${todayStats.completionRate}%` }}
          />
        </div>
      </div>

      {/* 3. Today's Schedule */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Today's Schedule
          </h2>
          <button
            onClick={() => {
              setSelectedDate(todayISO);
              setActiveNavTab('today');
            }}
            className="text-xs text-neutral-500 hover:text-neutral-900 font-medium inline-flex items-center gap-1 group"
          >
            <span>Open schedule</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {todayTaskList.length === 0 ? (
          <div className="bg-white border border-neutral-200/80 rounded-lg p-6 text-center text-xs text-neutral-500">
            <p>No tasks scheduled for today.</p>
            <button
              onClick={() => openCreateTask(todayISO)}
              className="mt-2 text-neutral-900 font-medium underline hover:text-neutral-700"
            >
              Add a task
            </button>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200/80 rounded-lg divide-y divide-neutral-100 overflow-hidden">
            {todayTaskList.map(task => {
              const isCompleted = task.status === 'completed';
              const isInProgress = task.status === 'in_progress';
              const isSkipped = task.status === 'skipped';
              const isOverdue = isTaskOverdue(task.date, task.startTime, task.status);

              return (
                <div
                  key={task.id}
                  className={`px-4 py-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                    isCompleted
                      ? 'bg-neutral-50/40 text-neutral-400'
                      : isSkipped
                      ? 'bg-neutral-50/20 text-neutral-400 italic'
                      : 'hover:bg-neutral-50/50 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Status checkbox */}
                    <button
                      onClick={() => toggleTaskStatus(task.id)}
                      className="text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                      title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 hover:stroke-neutral-800" />
                      )}
                    </button>

                    {/* Time */}
                    <span className="font-mono text-neutral-400 text-[11px] shrink-0 w-11 tabular-nums">
                      {task.startTime || '—'}
                    </span>

                    {/* Title & subtle metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => openEditTask(task)}
                          className={`font-medium truncate cursor-pointer hover:underline ${
                            isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900'
                          }`}
                        >
                          {task.title}
                        </span>

                        {isInProgress && (
                          <span className="text-[10px] text-blue-700 font-medium">
                            In progress
                          </span>
                        )}

                        {isOverdue && !isCompleted && !isSkipped && (
                          <span className="text-[10px] text-rose-700 font-medium">
                            Overdue
                          </span>
                        )}

                        {task.type === 'meeting' && (
                          <span className="text-[10px] text-blue-800 font-medium">
                            Meeting{task.meetingWith ? ` with ${task.meetingWith}` : ''}
                          </span>
                        )}

                        {task.type === 'follow_up' && (
                          <span className="text-[10px] text-amber-800 font-medium">
                            Follow-up{task.contactName ? ` (${task.contactName})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.type === 'meeting' && !isCompleted && !isSkipped && (
                      <button
                        onClick={() => openMeetingModal(task)}
                        className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        Conclude
                      </button>
                    )}

                    {task.type === 'follow_up' && !isCompleted && !isSkipped && (
                      <button
                        onClick={() => openFollowUpModal(task)}
                        className="px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                      >
                        Follow-up
                      </button>
                    )}

                    {!isCompleted && !isSkipped && (
                      isInProgress ? (
                        <button
                          onClick={() => completeTask(task.id)}
                          className="px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        >
                          Done
                        </button>
                      ) : (
                        <button
                          onClick={() => startTask(task.id)}
                          className="p-1 text-neutral-400 hover:text-neutral-900 rounded transition-colors"
                          title="Start task"
                        >
                          <Play className="w-3.5 h-3.5 fill-neutral-400 hover:fill-neutral-900" />
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

      {/* 4. Two-Column Layout: Upcoming (Left) & Progress / Recent (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left: Upcoming (Next 7 Days) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              Upcoming
            </h2>

            {/* Quiet filter */}
            <div className="flex items-center gap-1 text-[11px] text-neutral-500">
              <button
                onClick={() => setUpcomingFilter('all')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  upcomingFilter === 'all' ? 'text-neutral-900 font-semibold' : 'hover:text-neutral-800'
                }`}
              >
                All
              </button>
              <span>·</span>
              <button
                onClick={() => setUpcomingFilter('meetings')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  upcomingFilter === 'meetings' ? 'text-neutral-900 font-semibold' : 'hover:text-neutral-800'
                }`}
              >
                Meetings
              </button>
              <span>·</span>
              <button
                onClick={() => setUpcomingFilter('follow_ups')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  upcomingFilter === 'follow_ups' ? 'text-neutral-900 font-semibold' : 'hover:text-neutral-800'
                }`}
              >
                Follow-ups
              </button>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-lg divide-y divide-neutral-100 overflow-hidden">
            {upcomingList.length === 0 ? (
              <p className="p-6 text-center text-xs text-neutral-400">
                No upcoming items scheduled for the next 7 days.
              </p>
            ) : (
              upcomingList.map(task => (
                <div
                  key={task.id}
                  onClick={() => openEditTask(task)}
                  className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-neutral-50/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="font-medium text-neutral-800 truncate block">
                      {task.title}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {task.meetingWith ? `with ${task.meetingWith}` : task.category}
                    </span>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[11px] text-neutral-500 tabular-nums">
                    <div>{formatShortDate(task.date)}</div>
                    <div className="text-neutral-400 text-[10px]">{task.startTime || 'Anytime'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Progress & Recent Activity */}
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900">
              Cadence Progress
            </h2>

            <div className="bg-white border border-neutral-200/80 rounded-lg p-4 space-y-4 text-xs">
              {/* This Week */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-neutral-700">This Week</span>
                  <span className="font-mono text-neutral-500 tabular-nums text-[11px]">
                    {thisWeekStats.completed} / {thisWeekStats.total} ({thisWeekStats.completionRate}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-1.5 transition-all"
                    style={{ width: `${thisWeekStats.completionRate}%` }}
                  />
                </div>
              </div>

              {/* This Month */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-neutral-700">This Month</span>
                  <span className="font-mono text-neutral-500 tabular-nums text-[11px]">
                    {thisMonthStats.completed} / {thisMonthStats.total} ({thisMonthStats.completionRate}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-1.5 transition-all"
                    style={{ width: `${thisMonthStats.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-2.5">
            <h2 className="text-sm font-semibold text-neutral-900">
              Recent Activity
            </h2>

            <div className="bg-white border border-neutral-200/80 rounded-lg divide-y divide-neutral-100 overflow-hidden text-xs">
              {recentActivities.length === 0 ? (
                <p className="p-4 text-center text-xs text-neutral-400">
                  No activity recorded yet today.
                </p>
              ) : (
                recentActivities.map(act => (
                  <div
                    key={act.id}
                    className="px-4 py-2 flex items-center justify-between gap-2 text-neutral-600"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                      <span className="truncate">{act.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400 shrink-0">
                      {act.timeText}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
