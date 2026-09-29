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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Task Repository & Execution Ledger
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Complete list of all planned, in-progress, completed, and rescheduled tasks
          </p>
        </div>

        <button
          onClick={() => openCreateTask()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar (Requirement 20) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
          {/* Search box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, notes, contacts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded-md bg-white focus:ring-1 focus:ring-neutral-900"
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
              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded-md bg-white focus:ring-1 focus:ring-neutral-900"
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
              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded-md bg-white focus:ring-1 focus:ring-neutral-900"
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
              className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded-md bg-white focus:ring-1 focus:ring-neutral-900"
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
            <span className="text-neutral-600 font-medium">Select Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="px-2 py-1 text-xs border border-neutral-300 rounded font-mono bg-white"
            />
          </div>
        )}

        {/* Sorting and Count */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100 flex-wrap gap-2">
          <div>
            Showing <span className="font-mono font-semibold text-neutral-900 tabular-nums">{filteredTasks.length}</span> of{' '}
            <span className="font-mono tabular-nums">{tasks.length}</span> total tasks
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="px-2 py-1 text-xs border border-neutral-300 rounded bg-white text-neutral-800 font-medium"
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

      {/* High-density Data Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Status</th>
                <th className="py-2.5 px-3 w-28">Date & Time</th>
                <th className="py-2.5 px-3">Title & Context</th>
                <th className="py-2.5 px-3 w-24">Type</th>
                <th className="py-2.5 px-3 w-20">Priority</th>
                <th className="py-2.5 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400 italic">
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
                      {/* Status / Complete Toggle */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => toggleTaskStatus(t.id)}
                          className="text-neutral-400 hover:text-neutral-900 transition-colors"
                          title={isDone ? 'Reopen Task' : 'Complete Task'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 inline" />
                          ) : (
                            <Circle className="w-4.5 h-4.5 hover:stroke-neutral-800 inline" />
                          )}
                        </button>
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
                            <span className="text-[9px] font-bold text-neutral-900 bg-neutral-100 border border-neutral-900 px-1 rounded">
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
                          {t.type === 'meeting' && !isDone && (
                            <button
                              onClick={() => openMeetingModal(t)}
                              className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200"
                              title="Conclude Meeting"
                            >
                              Conclude
                            </button>
                          )}

                          {t.type === 'follow_up' && !isDone && (
                            <button
                              onClick={() => openFollowUpModal(t)}
                              className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200"
                              title="Complete & Schedule Next Follow-up"
                            >
                              Follow-up
                            </button>
                          )}

                          {!isDone && !isInProgress && !isSkipped && (
                            <button
                              onClick={() => startTask(t.id)}
                              className="p-1 text-neutral-500 hover:text-neutral-900 rounded"
                              title="Start Task"
                            >
                              <Play className="w-3.5 h-3.5 fill-neutral-600" />
                            </button>
                          )}

                          {!isDone && !isSkipped && (
                            <button
                              onClick={() => skipTask(t.id)}
                              className="text-[10px] px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded"
                              title="Skip"
                            >
                              Skip
                            </button>
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
