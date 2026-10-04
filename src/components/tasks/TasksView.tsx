import React, { useState, useMemo } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
} from '../../types';
import {
  Search,
  Plus,
  CheckCircle2,
  Circle,
  FileEdit,
  Trash2,
  Calendar,
  ArrowUpDown,
  Play,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { getTodayISO, isTaskOverdue, getWeekRange } from '../../utils/dateUtils';

type SortOption = 'date_asc' | 'date_desc' | 'time' | 'priority' | 'status';

export const TasksView: React.FC = () => {
  const {
    tasks,
    toggleTaskStatus,
    startTask,
    completeTask,
    skipTask,
    rescheduleTask,
    openEditTask,
    openCreateTask,
    openFollowUpModal,
    openMeetingModal,
    deleteTask,
  } = useWorkPlan();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date_asc');

  // Inline Reschedule State
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null);
  const [rescheduleDateInput, setRescheduleDateInput] = useState<string>('');
  const [rescheduleTimeInput, setRescheduleTimeInput] = useState<string>('');

  // Inline Delete State
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  const todayISO = getTodayISO();
  const weekRange = getWeekRange(todayISO);
  const currentMonthPrefix = todayISO.slice(0, 7);

  // Priority weight for sorting
  const priorityWeights: Record<string, number> = {
    critical: 4,
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const statusWeights: Record<string, number> = {
    in_progress: 1,
    planned: 2,
    rescheduled: 3,
    skipped: 4,
    completed: 5,
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        // Search by title or notes
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchNotes = (t.notes || '').toLowerCase().includes(q);
          const matchContact = (t.contactName || '').toLowerCase().includes(q);
          const matchMeeting = (t.meetingWith || '').toLowerCase().includes(q);
          if (!matchTitle && !matchNotes && !matchContact && !matchMeeting) return false;
        }

        // Type
        if (filterType !== 'all' && t.type !== filterType) return false;

        // Status
        if (filterStatus !== 'all') {
          if (filterStatus === 'overdue') {
            return isTaskOverdue(t.date, t.startTime, t.status);
          }
          if (t.status !== filterStatus) return false;
        }

        // Priority
        if (filterPriority !== 'all') {
          if (filterPriority === 'critical' && t.priority !== 'critical' && t.priority !== 'urgent') {
            return false;
          }
          if (filterPriority !== 'critical' && t.priority !== filterPriority) {
            return false;
          }
        }

        // Date filter
        if (filterDateRange === 'today' && t.date !== todayISO) return false;
        if (filterDateRange === 'this_week') {
          if (t.date < weekRange.startISO || t.date > weekRange.endISO) return false;
        }
        if (filterDateRange === 'this_month' && !t.date.startsWith(currentMonthPrefix)) return false;
        if (filterDateRange === 'custom' && customDate && t.date !== customDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_asc') {
          return (a.date + (a.startTime || '99:99')).localeCompare(b.date + (b.startTime || '99:99'));
        }
        if (sortBy === 'date_desc') {
          return (b.date + (b.startTime || '99:99')).localeCompare(a.date + (a.startTime || '99:99'));
        }
        if (sortBy === 'time') {
          return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
        }
        if (sortBy === 'priority') {
          return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        }
        if (sortBy === 'status') {
          return (statusWeights[a.status] || 0) - (statusWeights[b.status] || 0);
        }
        return 0;
      });
  }, [
    tasks,
    searchQuery,
    filterType,
    filterStatus,
    filterPriority,
    filterDateRange,
    customDate,
    sortBy,
    todayISO,
    weekRange,
    currentMonthPrefix,
  ]);

  const handleConfirmReschedule = (taskId: string) => {
    if (!rescheduleDateInput) return;
    rescheduleTask(taskId, rescheduleDateInput, rescheduleTimeInput || undefined);
    setReschedulingTaskId(null);
    setRescheduleDateInput('');
    setRescheduleTimeInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Task Repository & Execution Ledger
          </h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Complete list of all planned, in-progress, completed, and rescheduled tasks
          </p>
        </div>

        <button
          onClick={() => openCreateTask()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md transition-all shadow-xs shadow-[#E50914]/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar (Requirement 20) */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
          {/* Search box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-[#4B5563] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, notes, contacts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] placeholder:text-[#4B5563]/60 focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            >
              <option value="all">All Types</option>
              <option value="recurring">Recurring</option>
              <option value="one_time">One-time</option>
              <option value="follow_up">Follow-up</option>
              <option value="meeting">Meeting</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={filterDateRange}
              onChange={e => setFilterDateRange(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Specific Date...</option>
            </select>
          </div>
        </div>

        {/* If Custom Date Selected */}
        {filterDateRange === 'custom' && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-[#4B5563] font-medium">Select Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="px-2 py-1 text-xs border border-[#E5E7EB] rounded font-mono bg-white text-[#111111]"
            />
          </div>
        )}

        {/* Sorting and Count */}
        <div className="flex items-center justify-between text-xs text-[#4B5563] pt-2 border-t border-[#E5E7EB] flex-wrap gap-2">
          <div>
            Showing <span className="font-mono font-semibold text-[#111111] tabular-nums">{filteredTasks.length}</span> of{' '}
            <span className="font-mono tabular-nums">{tasks.length}</span> total tasks
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#4B5563]">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="px-2 py-1 text-xs border border-[#E5E7EB] rounded bg-white text-[#111111] font-medium"
            >
              <option value="date_asc">Date (Earliest first)</option>
              <option value="date_desc">Date (Latest first)</option>
              <option value="time">Time of Day</option>
              <option value="priority">Priority (Critical to Low)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE CARD VIEW (< sm) */}
      <div className="sm:hidden space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center text-xs text-[#4B5563]/60 italic">
            No tasks match the selected criteria.
          </div>
        ) : (
          filteredTasks.map(t => {
            const isDone = t.status === 'completed';
            const isInProgress = t.status === 'in_progress';
            const isSkipped = t.status === 'skipped';
            const isOverdue = isTaskOverdue(t.date, t.startTime, t.status);

            return (
              <div
                key={t.id}
                className={`bg-white border rounded-xl p-4 space-y-3 transition-all shadow-xs ${
                  isInProgress
                    ? 'border-[#E50914] ring-1 ring-[#E50914] bg-[#E50914]/5'
                    : isDone
                    ? 'border-[#E5E7EB] bg-neutral-50/40 text-[#4B5563]'
                    : isSkipped
                    ? 'border-[#E5E7EB] bg-neutral-50/50 opacity-75'
                    : 'border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Daily Completion Lock on Checkbox */}
                  {t.date > todayISO ? (
                    <div
                      className="mt-0.5 text-neutral-400 shrink-0 cursor-not-allowed"
                      title={`Locked until ${t.date}. Only today's tasks can be completed.`}
                    >
                      <Lock className="w-4.5 h-4.5 text-neutral-400" />
                    </div>
                  ) : t.date < todayISO ? (
                    <div
                      className="mt-0.5 text-neutral-400 shrink-0"
                      title={isDone ? 'Completed on historical date' : 'Historical task (Incomplete)'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-neutral-300 stroke-dashed" />
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleTaskStatus(t.id)}
                      className="mt-0.5 text-[#4B5563] hover:text-[#E50914] shrink-0 cursor-pointer"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 hover:stroke-[#E50914]" />
                      )}
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold break-words ${
                        isDone ? 'line-through text-neutral-400' : 'text-[#111111]'
                      }`}
                    >
                      {t.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-[#4B5563]">
                      <span className="font-mono font-medium text-[#111111]">{t.date}</span>
                      <span>·</span>
                      <span>{t.startTime ? `${t.startTime} (${t.durationMinutes}m)` : 'Anytime'}</span>
                      <span>·</span>
                      <span className="capitalize">{t.type.replace('_', ' ')}</span>
                      <span>·</span>
                      <span className="capitalize font-semibold text-[#111111]">{t.priority}</span>
                      {t.date > todayISO && (
                        <>
                          <span>·</span>
                          <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1 rounded inline-flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 text-neutral-500" />
                            Upcoming
                          </span>
                        </>
                      )}
                    </div>

                    {isInProgress && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#E50914] bg-[#E50914]/10 border border-[#E50914]/20 px-1.5 py-0.2 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
                        ACTIVE
                      </span>
                    )}

                    {isOverdue && (
                      <span className="mt-1 inline-block text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                        Overdue
                      </span>
                    )}

                    {t.contactName && (
                      <div className="text-[11px] text-amber-800 font-medium mt-1">
                        Contact: {t.contactName}
                      </div>
                    )}
                    {t.meetingWith && (
                      <div className="text-[11px] text-blue-800 font-medium mt-1">
                        Meeting: {t.meetingWith}
                      </div>
                    )}
                    {t.notes && (
                      <div className="text-[11px] text-[#4B5563] mt-1 break-words">
                        {t.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Row with Daily Lock */}
                <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {t.date > todayISO ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-1 rounded select-none cursor-not-allowed"
                        title={`Locked until ${t.date}. Only today's tasks can be completed.`}
                      >
                        <Lock className="w-3 h-3 text-neutral-400" />
                        <span>Upcoming (Locked)</span>
                      </span>
                    ) : t.date < todayISO ? (
                      <span className="text-[11px] text-neutral-500 italic px-1">
                        Historical record
                      </span>
                    ) : (
                      <>
                        {t.type === 'meeting' && !isDone && (
                          <button
                            onClick={() => openMeetingModal(t)}
                            className="text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded shadow-xs cursor-pointer"
                          >
                            Conclude
                          </button>
                        )}
                        {t.type === 'follow_up' && !isDone && (
                          <button
                            onClick={() => openFollowUpModal(t)}
                            className="text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-800 px-2 py-1 rounded shadow-xs cursor-pointer"
                          >
                            Follow-up
                          </button>
                        )}
                        {!isDone && !isInProgress && !isSkipped && (
                          <button
                            onClick={() => startTask(t.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 border border-[#E5E7EB] px-2 py-1 rounded cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-[#111111]" />
                            <span>Start</span>
                          </button>
                        )}
                        {!isDone && !isSkipped && (
                          <button
                            onClick={() => skipTask(t.id)}
                            className="text-[11px] text-[#4B5563] hover:text-[#111111] border border-[#E5E7EB] px-2 py-1 rounded hover:bg-neutral-50 cursor-pointer"
                          >
                            Skip
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setReschedulingTaskId(reschedulingTaskId === t.id ? null : t.id);
                        setRescheduleDateInput(t.date);
                        setRescheduleTimeInput(t.startTime || '09:00');
                      }}
                      className="p-1.5 text-[#4B5563] hover:text-[#111111] border border-[#E5E7EB] rounded hover:bg-neutral-50 cursor-pointer"
                      title="Reschedule"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditTask(t)}
                      className="p-1.5 text-[#4B5563] hover:text-[#111111] border border-[#E5E7EB] rounded hover:bg-neutral-50 cursor-pointer"
                      title="Edit"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteTaskId === t.id ? (
                      <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px]">
                        <span className="text-rose-700 font-semibold">Delete?</span>
                        <button
                          onClick={() => {
                            deleteTask(t.id);
                            setConfirmDeleteTaskId(null);
                          }}
                          className="text-rose-800 font-bold hover:underline px-0.5 cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteTaskId(null)}
                          className="text-neutral-500 hover:text-neutral-800 px-0.5 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteTaskId(t.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded cursor-pointer hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Reschedule row if open */}
                {reschedulingTaskId === t.id && (
                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end gap-1.5 flex-wrap">
                    <span className="text-[11px] text-[#4B5563]">Move to:</span>
                    <input
                      type="date"
                      value={rescheduleDateInput}
                      onChange={e => setRescheduleDateInput(e.target.value)}
                      className="px-2 py-1 text-xs border border-[#E5E7EB] rounded font-mono bg-white text-[#111111]"
                    />
                    <button
                      onClick={() => handleConfirmReschedule(t.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] rounded cursor-pointer"
                    >
                      Move
                    </button>
                    <button
                      onClick={() => setReschedulingTaskId(null)}
                      className="text-xs text-[#4B5563] hover:text-[#111111] px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP DATA TABLE (hidden on mobile, visible on sm and up) */}
      <div className="hidden sm:block bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-[#E5E7EB] text-[#4B5563] font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Status</th>
                <th className="py-2.5 px-3 w-28">Date & Time</th>
                <th className="py-2.5 px-3">Title & Context</th>
                <th className="py-2.5 px-3 w-24">Type</th>
                <th className="py-2.5 px-3 w-20">Priority</th>
                <th className="py-2.5 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#4B5563]/60 italic">
                    No tasks match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(t => {
                  const isDone = t.status === 'completed';
                  const isInProgress = t.status === 'in_progress';
                  const isSkipped = t.status === 'skipped';
                  const isOverdue = isTaskOverdue(t.date, t.startTime, t.status);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isInProgress
                          ? 'bg-neutral-50/90 font-medium'
                          : isDone
                          ? 'bg-neutral-50/30 text-neutral-400'
                          : isSkipped
                          ? 'bg-neutral-50/20 text-neutral-500 italic'
                          : ''
                      }`}
                    >
                      {/* Status / Complete Toggle with Daily Lock */}
                      <td className="py-2 px-3 text-center">
                        {t.date > todayISO ? (
                          <span
                            className="inline-block text-neutral-400 cursor-not-allowed"
                            title={`Locked until ${t.date}. Only today's tasks can be completed.`}
                          >
                            <Lock className="w-4 h-4 text-neutral-400 inline" />
                          </span>
                        ) : t.date < todayISO ? (
                          <span
                            className="inline-block text-neutral-400"
                            title={isDone ? 'Completed' : 'Historical task'}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 inline" />
                            ) : (
                              <Circle className="w-4.5 h-4.5 text-neutral-300 stroke-dashed inline" />
                            )}
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleTaskStatus(t.id)}
                            className="text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
                            title={isDone ? 'Reopen Task' : 'Complete Task'}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 inline" />
                            ) : (
                              <Circle className="w-4.5 h-4.5 hover:stroke-neutral-800 inline" />
                            )}
                          </button>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap text-neutral-600">
                        <div className="font-semibold text-neutral-900">{t.date}</div>
                        <div className="text-[10px] text-neutral-400">
                          {t.startTime ? `${t.startTime} (${t.durationMinutes}m)` : 'Unscheduled'}
                        </div>
                      </td>

                      {/* Title & Details */}
                      <td className="py-2 px-3 max-w-md">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-semibold ${
                              isDone ? 'line-through text-neutral-400' : 'text-neutral-900'
                            }`}
                          >
                            {t.title}
                          </span>

                          {isInProgress && (
                            <span className="text-[9px] font-bold text-[#E50914] bg-[#E50914]/10 border border-[#E50914]/20 px-1.5 py-0.2 rounded">
                              ACTIVE
                            </span>
                          )}

                          {isOverdue && (
                            <span className="text-[9px] font-semibold text-rose-700 bg-rose-50 px-1 rounded border border-rose-200">
                              Overdue
                            </span>
                          )}

                          {isSkipped && (
                            <span className="text-[9px] text-neutral-500 bg-neutral-100 px-1 rounded border border-neutral-200">
                              Skipped
                            </span>
                          )}
                        </div>

                        {t.contactName && (
                          <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                            Contact: {t.contactName}
                          </div>
                        )}
                        {t.meetingWith && (
                          <div className="text-[11px] text-blue-800 font-medium mt-0.5">
                            Meeting: {t.meetingWith}
                          </div>
                        )}
                        {t.outcomeNotes && (
                          <div className="text-[10px] text-blue-900 bg-blue-50/70 border border-blue-200/60 p-1 rounded mt-0.5">
                            Outcome: {t.outcomeNotes}
                          </div>
                        )}
                        {t.notes && (
                          <div className="text-[11px] text-neutral-500 truncate max-w-sm mt-0.5">
                            {t.notes}
                          </div>
                        )}
                        {t.skippedReason && (
                          <div className="text-[10px] text-neutral-400 italic">
                            Reason: {t.skippedReason}
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-2 px-3 capitalize text-neutral-600 whitespace-nowrap">
                        {t.type.replace('_', ' ')}
                      </td>

                      {/* Priority */}
                      <td className="py-2 px-3 capitalize font-mono text-[11px] whitespace-nowrap">
                        <span
                          className={
                            t.priority === 'critical' || t.priority === 'urgent'
                              ? 'text-rose-700 font-bold'
                              : t.priority === 'high'
                              ? 'text-amber-800 font-semibold'
                              : 'text-neutral-600'
                          }
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {t.date > todayISO ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded select-none cursor-not-allowed"
                              title={`Locked until ${t.date}. Available on scheduled date.`}
                            >
                              <Lock className="w-2.5 h-2.5 text-neutral-400" />
                              <span>Upcoming</span>
                            </span>
                          ) : t.date < todayISO ? (
                            null
                          ) : (
                            <>
                              {t.type === 'meeting' && !isDone && (
                                <button
                                  onClick={() => openMeetingModal(t)}
                                  className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer"
                                  title="Conclude Meeting"
                                >
                                  Conclude
                                </button>
                              )}

                              {t.type === 'follow_up' && !isDone && (
                                <button
                                  onClick={() => openFollowUpModal(t)}
                                  className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 cursor-pointer"
                                  title="Complete & Schedule Next Follow-up"
                                >
                                  Follow-up
                                </button>
                              )}

                              {!isDone && !isInProgress && !isSkipped && (
                                <button
                                  onClick={() => startTask(t.id)}
                                  className="p-1 text-neutral-500 hover:text-neutral-900 rounded cursor-pointer"
                                  title="Start Task"
                                >
                                  <Play className="w-3.5 h-3.5 fill-neutral-600" />
                                </button>
                              )}

                              {!isDone && !isSkipped && (
                                <button
                                  onClick={() => skipTask(t.id)}
                                  className="text-[10px] px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded cursor-pointer"
                                  title="Skip"
                                >
                                  Skip
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => {
                              setReschedulingTaskId(reschedulingTaskId === t.id ? null : t.id);
                              setRescheduleDateInput(t.date);
                              setRescheduleTimeInput(t.startTime || '09:00');
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-900 rounded"
                            title="Reschedule"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditTask(t)}
                            className="p-1 text-neutral-400 hover:text-neutral-900 rounded"
                            title="Edit"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteTaskId === t.id ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px]">
                              <span className="text-rose-700 font-semibold">Delete?</span>
                              <button
                                onClick={() => {
                                  deleteTask(t.id);
                                  setConfirmDeleteTaskId(null);
                                }}
                                className="text-rose-800 font-bold hover:underline px-0.5"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteTaskId(null)}
                                className="text-neutral-500 hover:text-neutral-800 px-0.5"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteTaskId(t.id)}
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Inline Reschedule row if open */}
                        {reschedulingTaskId === t.id && (
                          <div className="pt-2 flex items-center justify-end gap-1.5">
                            <input
                              type="date"
                              value={rescheduleDateInput}
                              onChange={e => setRescheduleDateInput(e.target.value)}
                              className="px-1.5 py-0.5 text-[11px] border border-neutral-300 rounded font-mono bg-white"
                            />
                            <button
                              onClick={() => handleConfirmReschedule(t.id)}
                              className="px-2 py-0.5 text-[11px] font-semibold text-white bg-neutral-900 rounded"
                            >
                              Move
                            </button>
                            <button
                              onClick={() => setReschedulingTaskId(null)}
                              className="text-[11px] text-neutral-500"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
