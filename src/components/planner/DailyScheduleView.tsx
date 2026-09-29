import React, { useState, useMemo } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  formatDisplayDate,
  parseISODate,
  formatISODate,
  isWeeklyOff,
  getTodayISO,
  isTaskOverdue,
} from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Calendar,
  AlertCircle,
  ArrowRight,
  FileEdit,
  Trash2,
  Check,
  X,
  FastForward,
  CornerDownRight,
  Sparkles,
  MessageSquare,
  Save,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../types';

export const DailyScheduleView: React.FC = () => {
  const {
    tasks,
    selectedDate,
    setSelectedDate,
    startTask,
    completeTask,
    skipTask,
    rescheduleTask,
    updateTaskNotes,
    saveDailyNotes,
    deleteTask,
    addTask,
    openEditTask,
    openFollowUpModal,
    openMeetingModal,
    getDailyStats,
    settings,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const isSelectedToday = selectedDate === todayISO;
  const isOffDay = isWeeklyOff(selectedDate, settings.weeklyOffDays);
  const stats = getDailyStats(selectedDate);

  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<TaskType>('one_time');
  const [quickTime, setQuickTime] = useState('09:00');
  const [quickIsUnscheduled, setQuickIsUnscheduled] = useState(false);
  const [quickDuration, setQuickDuration] = useState(30);
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickNotes, setQuickNotes] = useState('');

  // Skip Modal State
  const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);
  const [skipReasonInput, setSkipReasonInput] = useState('');

  // Reschedule Modal State
  const [reschedulingTask, setReschedulingTask] = useState<Task | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // Inline Note Edit State
  const [editingNoteTaskId, setEditingNoteTaskId] = useState<string | null>(null);
  const [noteEditInput, setNoteEditInput] = useState('');

  // Daily Reflection / Notes for this day
  const [dailyNoteInput, setDailyNoteInput] = useState(settings.dailyNotes?.[selectedDate] || '');
  const [dailyNoteSaved, setDailyNoteSaved] = useState(false);

  // Sync daily note input when date changes
  React.useEffect(() => {
    setDailyNoteInput(settings.dailyNotes?.[selectedDate] || '');
    setDailyNoteSaved(false);
  }, [selectedDate, settings.dailyNotes]);

  // Separate tasks for this date into Scheduled vs. Unscheduled
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const dayTasks = tasks.filter(t => t.date === selectedDate);
    const scheduled: Task[] = [];
    const unscheduled: Task[] = [];

    dayTasks.forEach(t => {
      if (t.startTime && t.startTime.trim() !== '') {
        scheduled.push(t);
      } else {
        unscheduled.push(t);
      }
    });

    scheduled.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    unscheduled.sort((a, b) => a.title.localeCompare(b.title));

    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [tasks, selectedDate]);

  // Check if all scheduled tasks are completed
  const isDayComplete =
    stats.total > 0 && stats.remaining === 0 && stats.completed > 0;

  // Date navigation handlers
  const handlePrevDay = () => {
    const d = parseISODate(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatISODate(d));
  };

  const handleNextDay = () => {
    const d = parseISODate(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatISODate(d));
  };

  const handleGoToday = () => {
    setSelectedDate(todayISO);
  };

  // Quick Add submit
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    addTask({
      title: quickTitle.trim(),
      type: quickType,
      date: selectedDate,
      startTime: quickIsUnscheduled ? undefined : quickTime,
      durationMinutes: quickDuration,
      status: 'planned',
      priority: quickPriority,
      notes: quickNotes.trim(),
      category: quickType === 'meeting' ? 'Meetings' : quickType === 'follow_up' ? 'Follow-up' : 'General',
    });

    // Reset
    setQuickTitle('');
    setQuickNotes('');
    setShowQuickAdd(false);
  };

  // Handle Skip
  const handleConfirmSkip = () => {
    if (!skippingTaskId) return;
    skipTask(skippingTaskId, skipReasonInput);
    setSkippingTaskId(null);
    setSkipReasonInput('');
  };

  // Handle Reschedule
  const handleConfirmReschedule = () => {
    if (!reschedulingTask || !rescheduleDate) return;
    rescheduleTask(reschedulingTask.id, rescheduleDate, rescheduleTime || reschedulingTask.startTime);
    setReschedulingTask(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  // Handle Inline Note Save
  const handleSaveInlineNote = (taskId: string) => {
    updateTaskNotes(taskId, noteEditInput);
    setEditingNoteTaskId(null);
  };

  // Handle Daily Note Save
  const handleSaveDailyNote = (e: React.FormEvent) => {
    e.preventDefault();
    saveDailyNotes(selectedDate, dailyNoteInput);
    setDailyNoteSaved(true);
    setTimeout(() => setDailyNoteSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP DATE CONTROLLER & OFF-DAY NOTICE */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        {/* Date Navigator */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center border border-neutral-200 rounded-md bg-white">
            <button
              onClick={handlePrevDay}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-l-md transition-colors inline-flex items-center gap-1 text-xs px-2"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={handleGoToday}
              className={`px-3 py-1.5 text-xs font-semibold border-x border-neutral-200 transition-colors ${
                isSelectedToday
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-r-md transition-colors inline-flex items-center gap-1 text-xs px-2"
              title="Next Day"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={e => e.target.value && setSelectedDate(e.target.value)}
            className="text-xs font-mono font-medium px-2.5 py-1.5 border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
          />

          <h2 className="text-base font-bold text-neutral-900 tracking-tight ml-1">
            {formatDisplayDate(selectedDate)}
          </h2>
        </div>

        {/* Off Day Indicator & Add Task Button */}
        <div className="flex items-center gap-3">
          {isOffDay ? (
            <span className="text-amber-800 bg-amber-50 border border-amber-300 font-semibold text-xs px-2.5 py-1 rounded">
              OFF DAY
            </span>
          ) : (
            <span className="text-neutral-700 bg-neutral-100 border border-neutral-200 font-medium text-xs px-2.5 py-1 rounded">
              Working Day
            </span>
          )}

          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* OFF DAY BANNER (Requirement 22) */}
      {isOffDay && (
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
              Weekend / Off Day
            </span>
            <span>·</span>
            <span>
              {stats.total > 0
                ? `${stats.total} task${stats.total === 1 ? '' : 's'} intentionally scheduled on this off day.`
                : 'No regular tasks generated. You can still schedule special tasks or follow-ups anytime.'}
            </span>
          </div>
        </div>
      )}

      {/* 2. PROGRESS RIBBON (Requirement 10 & 11) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
                {stats.total} Tasks
              </span>
              <span className="text-xs text-neutral-500">scheduled for this day</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600 mt-1 font-mono">
              <span className="font-semibold text-emerald-700">{stats.completed} Completed</span>
              <span>·</span>
              <span className="font-semibold text-neutral-800">{stats.remaining} Remaining</span>
              {stats.skipped > 0 && (
                <>
                  <span>·</span>
                  <span className="text-neutral-500">{stats.skipped} Skipped</span>
                </>
              )}
              {stats.rescheduled > 0 && (
                <>
                  <span>·</span>
                  <span className="text-blue-700">{stats.rescheduled} Rescheduled</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right self-start sm:self-auto">
            <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums">
              {stats.completionRate}%
            </div>
            <span className="text-xs font-mono text-neutral-500">Completion</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-neutral-900 h-2 transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Day Complete Banner (Requirement 12) */}
        {isDayComplete && (
          <div className="p-3 bg-neutral-900 text-white rounded-md flex items-center justify-between text-xs mt-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Day Complete</span>
              <span>— All scheduled tasks for this date have been completed.</span>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ADD INLINE FORM (Requirement 16) */}
      {showQuickAdd && (
        <form
          onSubmit={handleQuickAddSubmit}
          className="bg-white border border-neutral-900 rounded-lg p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              Quick Add Task for {selectedDate}
            </span>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Call ABC Company or Review agreement"
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Task Type
              </label>
              <select
                value={quickType}
                onChange={e => setQuickType(e.target.value as TaskType)}
                className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded bg-white"
              >
                <option value="one_time">One-time Task</option>
                <option value="recurring">Recurring</option>
                <option value="follow_up">Follow-up</option>
                <option value="meeting">Meeting</option>
                <option value="custom">Custom Task</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Priority
              </label>
              <select
                value={quickPriority}
                onChange={e => setQuickPriority(e.target.value as TaskPriority)}
                className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded bg-white"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-neutral-700">
                  Scheduled Time
                </label>
                <label className="text-[10px] text-neutral-500 cursor-pointer flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={quickIsUnscheduled}
                    onChange={e => setQuickIsUnscheduled(e.target.checked)}
                    className="rounded text-neutral-900"
                  />
                  Unscheduled
                </label>
              </div>
              <input
                type="time"
                disabled={quickIsUnscheduled}
                value={quickTime}
                onChange={e => setQuickTime(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs border rounded font-mono ${
                  quickIsUnscheduled ? 'bg-neutral-100 text-neutral-400 border-neutral-200' : 'bg-white border-neutral-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={quickDuration}
                onChange={e => setQuickDuration(parseInt(e.target.value, 10) || 15)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono tabular-nums bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Action notes..."
                value={quickNotes}
                onChange={e => setQuickNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* 3. CHRONOLOGICAL TIMELINE OF SCHEDULED TASKS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Scheduled Tasks ({scheduledTasks.length})
          </h3>
          <span className="text-[11px] text-neutral-500 font-mono">Chronological Timeline</span>
        </div>

        {scheduledTasks.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center space-y-2">
            <Clock className="w-6 h-6 text-neutral-400 mx-auto" />
            <p className="text-xs font-semibold text-neutral-800">
              No timed tasks scheduled for {selectedDate}
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {isOffDay
                ? 'This is a weekly off day. You can add a task anytime.'
                : 'Click "+ Add Task" above to add work or meetings to this day.'}
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-neutral-200 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-3.5">
            {scheduledTasks.map(task => {
              const isCompleted = task.status === 'completed';
              const isInProgress = task.status === 'in_progress';
              const isSkipped = task.status === 'skipped';
              const isRescheduled = task.status === 'rescheduled';
              const isOverdue = isTaskOverdue(task.date, task.startTime, task.status);

              // Priority indicator styling
              const priorityClass =
                task.priority === 'critical'
                  ? 'text-red-700 bg-red-50 border-red-200 font-semibold'
                  : task.priority === 'high'
                  ? 'text-amber-800 bg-amber-50 border-amber-200 font-semibold'
                  : task.priority === 'low'
                  ? 'text-neutral-500 bg-neutral-100 border-neutral-200'
                  : 'text-neutral-700 bg-neutral-100 border-neutral-200';

              return (
                <div key={task.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[23px] sm:-left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                      isCompleted
                        ? 'border-emerald-600 bg-emerald-50'
                        : isInProgress
                        ? 'border-neutral-900 ring-2 ring-neutral-900'
                        : isSkipped
                        ? 'border-neutral-300 bg-neutral-100'
                        : 'border-neutral-400'
                    }`}
                  />

                  {/* Task Card Container */}
                  <div
                    className={`bg-white border rounded-lg p-4 transition-all shadow-xs ${
                      isInProgress
                        ? 'border-neutral-900 ring-2 ring-neutral-900 bg-neutral-50/20'
                        : isCompleted
                        ? 'border-neutral-200 bg-neutral-50/40 text-neutral-500'
                        : isSkipped
                        ? 'border-neutral-200 bg-neutral-50/50 opacity-75'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left Block: Time + Title + Metadata */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Time Column */}
                        <div className="shrink-0 w-16 text-left">
                          <span className="font-mono text-xs font-bold text-neutral-900 tabular-nums">
                            {task.startTime}
                          </span>
                          <span className="block font-mono text-[10px] text-neutral-400 tabular-nums">
                            {task.durationMinutes}m
                          </span>
                        </div>

                        {/* Title & Status Badges */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isCompleted
                                  ? 'line-through text-neutral-400'
                                  : isSkipped
                                  ? 'line-through text-neutral-500 italic'
                                  : 'text-neutral-900'
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* Active Task Badge */}
                            {isInProgress && (
                              <span className="text-[10px] font-bold text-neutral-900 bg-neutral-100 border border-neutral-900 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-pulse" />
                                ACTIVE
                              </span>
                            )}

                            {/* Overdue Badge */}
                            {isOverdue && (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                Overdue
                              </span>
                            )}

                            {/* Skipped Badge */}
                            {isSkipped && (
                              <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded">
                                Skipped
                              </span>
                            )}

                            {/* Rescheduled Badge */}
                            {isRescheduled && (
                              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                Rescheduled
                              </span>
                            )}

                            {/* Priority tag */}
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border uppercase tracking-wider font-mono ${priorityClass}`}>
                              {task.priority}
                            </span>
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                            <span className="capitalize">{task.type.replace('_', ' ')}</span>
                            <span>·</span>
                            <span>{task.category}</span>
                            {task.contactName && (
                              <>
                                <span>·</span>
                                <span className="text-neutral-700 font-medium">Contact: {task.contactName}</span>
                              </>
                            )}
                            {task.meetingWith && (
                              <>
                                <span>·</span>
                                <span className="text-neutral-700 font-medium">Meeting: {task.meetingWith}</span>
                              </>
                            )}
                          </div>

                          {/* Skip Reason if skipped */}
                          {task.skippedReason && (
                            <p className="text-xs text-neutral-600 italic bg-neutral-100 p-1.5 rounded">
                              Reason skipped: &quot;{task.skippedReason}&quot;
                            </p>
                          )}

                          {/* Inline Notes Display & Editor */}
                          {editingNoteTaskId === task.id ? (
                            <div className="pt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={noteEditInput}
                                onChange={e => setNoteEditInput(e.target.value)}
                                placeholder="Add note for this task..."
                                className="flex-1 px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white"
                              />
                              <button
                                onClick={() => handleSaveInlineNote(task.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-neutral-900 rounded"
                              >
                                Save Note
                              </button>
                              <button
                                onClick={() => setEditingNoteTaskId(null)}
                                className="text-xs text-neutral-500 hover:text-neutral-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pt-0.5">
                              {task.notes ? (
                                <p className="text-xs text-neutral-600">
                                  {task.notes}
                                </p>
                              ) : (
                                <span className="text-[11px] text-neutral-400 italic">No notes</span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingNoteTaskId(task.id);
                                  setNoteEditInput(task.notes || '');
                                }}
                                className="text-[10px] text-neutral-500 hover:text-neutral-900 underline opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {task.notes ? 'Edit Note' : '+ Note'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Block: Task Action Buttons (Start, Complete, Skip, Reschedule, Edit) */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
                        {/* 1. START TASK (Requirement 5) */}
                        {!isCompleted && !isSkipped && (
                          isInProgress ? (
                            <button
                              onClick={() => completeTask(task.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors shadow-xs"
                              title="Complete Active Task"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => startTask(task.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors"
                              title="Start Task (marks active)"
                            >
                              <Play className="w-3 h-3 fill-neutral-900" />
                              <span>Start</span>
                            </button>
                          )
                        )}

                        {/* 2. COMPLETE TASK DIRECTLY (Requirement 6) */}
                        {!isCompleted && !isInProgress && !isSkipped && (
                          <button
                            onClick={() => completeTask(task.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:text-emerald-700 hover:bg-emerald-50 border border-neutral-200 rounded transition-colors"
                            title="Direct Complete"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        )}

                        {/* If Completed, option to reopen/uncheck */}
                        {isCompleted && (
                          <button
                            onClick={() => startTask(task.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded"
                            title="Reopen Task"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reopen</span>
                          </button>
                        )}

                        {/* 3. SKIP TASK (Requirement 7) */}
                        {!isCompleted && !isSkipped && (
                          <button
                            onClick={() => {
                              setSkippingTaskId(task.id);
                              setSkipReasonInput('');
                            }}
                            className="px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-50"
                            title="Skip Task"
                          >
                            Skip
                          </button>
                        )}

                        {/* 4. RESCHEDULE TASK (Requirement 8) */}
                        <button
                          onClick={() => {
                            setReschedulingTask(task);
                            setRescheduleDate(task.date);
                            setRescheduleTime(task.startTime || '09:00');
                          }}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded border border-neutral-200 hover:bg-neutral-50"
                          title="Reschedule to another date/time"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>

                        {/* 5. EDIT TASK */}
                        <button
                          onClick={() => openEditTask(task)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded border border-neutral-200 hover:bg-neutral-50"
                          title="Edit Task Details"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${task.title}"?`)) {
                              deleteTask(task.id);
                            }
                          }}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. UNSCHEDULED TASKS SECTION (Requirement 15) */}
      <div className="space-y-3 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Unscheduled Tasks ({unscheduledTasks.length})
          </h3>
          <span className="text-[11px] text-neutral-500">Scheduled for {selectedDate} with no specific time</span>
        </div>

        {unscheduledTasks.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-lg p-4 text-center text-xs text-neutral-400 italic">
            No unscheduled tasks for this day.
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200 shadow-xs">
            {unscheduledTasks.map(t => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => (isDone ? startTask(t.id) : completeTask(t.id))}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                      ) : (
                        <Circle className="w-4.5 h-4.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-semibold ${
                          isDone ? 'line-through text-neutral-400' : 'text-neutral-900'
                        }`}
                      >
                        {t.title}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                        <span className="capitalize">{t.type.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>{t.category}</span>
                        <span>·</span>
                        <span className="capitalize">{t.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assign Time or Reschedule */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setReschedulingTask(t);
                        setRescheduleDate(t.date);
                        setRescheduleTime('10:00');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded"
                    >
                      Set Time
                    </button>
                    <button
                      onClick={() => openEditTask(t)}
                      className="p-1 text-neutral-400 hover:text-neutral-900"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. DAILY SUMMARY & REFLECTION NOTES (Requirement 23) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
          Daily Summary & Reflection
        </h3>

        {/* Tally Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border border-neutral-200 rounded-lg p-3 bg-neutral-50/40">
          <div>
            <span className="text-[11px] text-neutral-500">Completed</span>
            <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
              {stats.completed}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-neutral-500">Remaining</span>
            <div className="text-lg font-bold font-mono text-neutral-900 tabular-nums">
              {stats.remaining}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-neutral-500">Skipped</span>
            <div className="text-lg font-bold font-mono text-neutral-600 tabular-nums">
              {stats.skipped}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-neutral-500">Rescheduled</span>
            <div className="text-lg font-bold font-mono text-blue-700 tabular-nums">
              {stats.rescheduled}
            </div>
          </div>
        </div>

        {/* Optional Daily Notes / End-of-day Summary */}
        <form onSubmit={handleSaveDailyNote} className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-800">
            Daily Notes / End-of-Day Reflection
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Good progress on logistics audits today. Moved cold call follow-up to tomorrow..."
            value={dailyNoteInput}
            onChange={e => setDailyNoteInput(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:ring-1 focus:ring-neutral-900 resize-none"
          />
          <div className="flex items-center justify-between">
            <div>
              {dailyNoteSaved && (
                <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Notes saved!
                </span>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Day Notes</span>
            </button>
          </div>
        </form>
      </div>

      {/* SKIP TASK MODAL (Requirement 7) */}
      {skippingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-sm w-full p-5 space-y-3">
            <h4 className="text-sm font-bold text-neutral-900">
              Skip Task
            </h4>
            <p className="text-xs text-neutral-500">
              This task will be recorded as skipped for performance audits.
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Reason for skipping (optional):
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Client postponed, waiting on materials..."
                value={skipReasonInput}
                onChange={e => setSkipReasonInput(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSkippingTaskId(null)}
                className="px-3 py-1 text-xs text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSkip}
                className="px-3.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL (Requirement 8) */}
      {reschedulingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-sm w-full p-5 space-y-3">
            <h4 className="text-sm font-bold text-neutral-900">
              Reschedule Task
            </h4>
            <p className="text-xs text-neutral-500 truncate">
              Moving: <span className="font-semibold text-neutral-800">{reschedulingTask.title}</span>
            </p>

            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  New Date *
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  New Start Time
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setReschedulingTask(null)}
                className="px-3 py-1 text-xs text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                className="px-3.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
              >
                Move Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
