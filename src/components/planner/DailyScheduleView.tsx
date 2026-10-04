import React, { useState, useMemo } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  formatDisplayDate,
  parseISODate,
  formatISODate,
  isWeeklyOff,
  getTodayISO,
  isTaskOverdue,
  getNextWorkingDay,
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
  CalendarCheck,
  PhoneCall,
  Coffee,
  Lock,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../types';

export const DailyScheduleView: React.FC = () => {
  const {
    tasks,
    selectedDate,
    setSelectedDate,
    activeNavTab,
    toggleTaskStatus,
    startTask,
    completeTask,
    skipTask,
    rescheduleTask,
    updateTaskNotes,
    saveDailyNotes,
    deleteTask,
    addTask,
    openCreateTask,
    openEditTask,
    openFollowUpModal,
    openMeetingModal,
    getDailyStats,
    isDateOffDay,
    settings,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const isSelectedToday = selectedDate === todayISO;
  const isFutureDate = selectedDate > todayISO;
  const isPastDate = selectedDate < todayISO;
  const isOffDay = isDateOffDay(selectedDate);
  const stats = getDailyStats(selectedDate);

  // When activeNavTab is 'today', guarantee that selectedDate is today's actual date
  React.useEffect(() => {
    if (activeNavTab === 'today') {
      setSelectedDate(todayISO);
    }
  }, [activeNavTab, todayISO, setSelectedDate]);

  // Inline delete confirmation state
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<TaskType>('one_time');
  const [quickTime, setQuickTime] = useState('09:00');
  const [quickIsUnscheduled, setQuickIsUnscheduled] = useState(false);
  const [quickDuration, setQuickDuration] = useState(30);
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickContactName, setQuickContactName] = useState('');
  const [quickMeetingWith, setQuickMeetingWith] = useState('');
  const [quickLocation, setQuickLocation] = useState('');

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
    // STRICT CENTRAL RULE: OFF DAY = ZERO TASKS
    if (isOffDay) {
      return { scheduledTasks: [], unscheduledTasks: [] };
    }

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

  // Overlap / Time conflict detection for scheduled tasks
  const conflictingTaskIds = useMemo(() => {
    const conflicts = new Set<string>();
    const toMinutes = (timeStr?: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    for (let i = 0; i < scheduledTasks.length; i++) {
      const a = scheduledTasks[i];
      if (!a.startTime) continue;
      const aStart = toMinutes(a.startTime);
      const aEnd = aStart + (a.durationMinutes || 30);
      for (let j = i + 1; j < scheduledTasks.length; j++) {
        const b = scheduledTasks[j];
        if (!b.startTime) continue;
        const bStart = toMinutes(b.startTime);
        const bEnd = bStart + (b.durationMinutes || 30);
        if (aStart < bEnd && bStart < aEnd) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
    return conflicts;
  }, [scheduledTasks]);

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
      contactName: quickType === 'follow_up' ? quickContactName.trim() : undefined,
      meetingWith: quickType === 'meeting' ? quickMeetingWith.trim() : undefined,
      locationOrLink: quickType === 'meeting' ? quickLocation.trim() : undefined,
    });

    // Reset
    setQuickTitle('');
    setQuickNotes('');
    setQuickContactName('');
    setQuickMeetingWith('');
    setQuickLocation('');
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
    <div className="space-y-4">
      {/* 1. COMPACT PHONE-FIRST HEADER */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Live Status */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#111111]">
                {isSelectedToday ? 'Today' : 'Daily Schedule'}
              </h1>
              {isSelectedToday && (
                <span className="text-[10px] font-bold text-white bg-[#E50914] px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Today
                </span>
              )}
              {isFutureDate && (
                <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-neutral-500" />
                  Upcoming · View Only
                </span>
              )}
              {isPastDate && (
                <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded uppercase tracking-wider">
                  Historical · Read Only
                </span>
              )}
              {isOffDay && (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded uppercase tracking-wider">
                  OFF DAY
                </span>
              )}
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[#111111]">{formatDisplayDate(selectedDate)}</span>
              <span>·</span>
              {isOffDay ? (
                <span className="text-amber-900 font-bold">OFF DAY (0 tasks)</span>
              ) : (
                <>
                  <span className="text-[#111111] font-bold">{stats.completed} of {stats.total} completed</span>
                  <span className="text-[#4B5563]">({stats.completionRate}%)</span>
                  {stats.remaining > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-[#E50914] font-medium">{stats.remaining} remaining</span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Quick Day Navigator & Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center border border-[#E5E7EB] rounded-lg bg-neutral-50 p-0.5">
              <button
                onClick={handlePrevDay}
                className="p-1 text-[#4B5563] hover:text-[#111111] hover:bg-white rounded transition-colors"
                title="Previous Day"
                aria-label="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoToday}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  isSelectedToday
                    ? 'bg-[#E50914] text-white shadow-2xs'
                    : 'text-[#4B5563] hover:text-[#111111] hover:bg-white'
                }`}
              >
                Today
              </button>
              <button
                onClick={handleNextDay}
                className="p-1 text-[#4B5563] hover:text-[#111111] hover:bg-white rounded transition-colors"
                title="Next Day"
                aria-label="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className="text-xs font-mono font-medium px-2 py-1 border border-[#E5E7EB] rounded-lg bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914]"
            />

            {!isOffDay && (
              <>
                <button
                  onClick={() => openCreateTask(selectedDate, 'meeting')}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  title="Schedule Meeting"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Meeting</span>
                </button>

                <button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-lg transition-all shadow-xs shadow-[#E50914]/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thin progress bar - hidden on off days */}
        {!isOffDay && stats.total > 0 && (
          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#E50914] h-1.5 transition-all duration-500 rounded-full"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        )}
      </div>

      {/* QUICK ADD INLINE FORM (Requirement 16) - blocked on off days */}
      {showQuickAdd && !isOffDay && (
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

          {/* Conditional Fields for Follow-up and Meeting */}
          {quickType === 'follow_up' && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-md">
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Contact Name / Company (Follow-Up Target)
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins (ABC Company)"
                value={quickContactName}
                onChange={e => setQuickContactName(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-amber-300 rounded bg-white focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          )}

          {quickType === 'meeting' && (
            <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                  Meeting With (Attendees)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance (Horizon Supplies)"
                  value={quickMeetingWith}
                  onChange={e => setQuickMeetingWith(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-blue-300 rounded bg-white focus:ring-1 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                  Location or Video Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://meet.google.com/xyz or Room 4"
                  value={quickLocation}
                  onChange={e => setQuickLocation(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-blue-300 rounded bg-white focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md shadow-xs shadow-[#E50914]/20 transition-all cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* 2. MAIN WORKSPACE: STRICT OFF DAY OR WORKDAY TASKS */}
      {isOffDay ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
            <Coffee className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-full inline-block">
              OFF DAY
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111111]">
              No tasks scheduled — {isSelectedToday ? 'today is an off day.' : 'this is an off day.'}
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
              This date is configured as an off day. All routines, recurring tasks, and scheduled work are blocked and automatically skip off days.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-600 font-mono">
            0 tasks · 0 pending · 0 completed
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const nextWorking = getNextWorkingDay(selectedDate, settings.weeklyOffDays, settings.customOffDates);
                setSelectedDate(nextWorking);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#111111] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <span>View Next Working Day ({formatDisplayDate(getNextWorkingDay(selectedDate, settings.weeklyOffDays, settings.customOffDates))})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
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
                    className={`bg-white border rounded-xl p-3.5 sm:p-4 transition-all shadow-xs w-full min-w-0 overflow-hidden ${
                      isInProgress
                        ? 'border-[#E50914] ring-1 ring-[#E50914] bg-[#E50914]/5'
                        : isCompleted
                        ? 'border-[#E5E7EB] bg-neutral-50/40 text-[#4B5563]'
                        : isSkipped
                        ? 'border-[#E5E7EB] bg-neutral-50/50 opacity-75'
                        : 'border-[#E5E7EB] hover:border-[#111111]/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left Block: Checkbox + Time + Title + Metadata */}
                      <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                        {/* Direct Completion Checkbox with Daily Lock */}
                        {isFutureDate ? (
                          <div
                            className="p-1 text-neutral-400 shrink-0 mt-0.5 cursor-not-allowed"
                            title={`Locked until ${parseISODate(task.date).toLocaleDateString('en-US', { weekday: 'long' })}, ${task.date}. Only today's tasks can be completed.`}
                          >
                            <Lock className="w-5 h-5 text-neutral-400" />
                          </div>
                        ) : isPastDate ? (
                          <div
                            className="p-1 text-neutral-400 shrink-0 mt-0.5"
                            title={isCompleted ? 'Completed on historical date (Read-only)' : 'Past task - Incomplete / Missed (Read-only)'}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-neutral-300 stroke-dashed" />
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleTaskStatus(task.id)}
                            className="text-[#4B5563] hover:text-[#E50914] transition-colors shrink-0 mt-0.5 cursor-pointer"
                            title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                            aria-label={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : isInProgress ? (
                              <Play className="w-5 h-5 text-[#E50914] fill-[#E50914]" />
                            ) : (
                              <Circle className="w-5 h-5 hover:stroke-[#E50914]" />
                            )}
                          </button>
                        )}

                        {/* Time Column */}
                        <div className="shrink-0 w-12 sm:w-14 text-left">
                          <span className="font-mono text-xs font-bold text-[#111111] tabular-nums block">
                            {task.startTime || 'Anytime'}
                          </span>
                          <span className="font-mono text-[10px] text-[#4B5563] tabular-nums block">
                            {task.durationMinutes}m
                          </span>
                        </div>

                        {/* Title & Status Badges */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span
                              onClick={() => openEditTask(task)}
                              className={`text-sm font-semibold break-words cursor-pointer hover:text-[#E50914] transition-colors ${
                                isCompleted
                                  ? 'line-through text-neutral-400'
                                  : isSkipped
                                  ? 'line-through text-neutral-500 italic'
                                  : 'text-[#111111]'
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* Direct Status indicator matching prompt requirement */}
                            {isFutureDate ? (
                              <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-neutral-500" />
                                Upcoming · Locked until {task.date}
                              </span>
                            ) : isPastDate ? (
                              isCompleted ? (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                                  ✓ Completed
                                </span>
                              ) : isSkipped ? (
                                <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded">
                                  ✕ Skipped
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                  ○ Incomplete / Missed
                                </span>
                              )
                            ) : isCompleted ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                                ✓ Completed
                              </span>
                            ) : isInProgress ? (
                              <span className="text-[10px] font-bold text-[#E50914] bg-[#E50914]/10 border border-[#E50914]/20 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
                                ACTIVE
                              </span>
                            ) : isSkipped ? (
                              <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded">
                                ✕ Skipped
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-[#4B5563] bg-neutral-100/80 border border-[#E5E7EB] px-1.5 py-0.2 rounded">
                                ○ Pending
                              </span>
                            )}

                            {/* Overdue Badge */}
                            {isOverdue && (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                Overdue
                              </span>
                            )}

                            {/* Time Overlap Conflict Badge */}
                            {conflictingTaskIds.has(task.id) && !isCompleted && !isSkipped && (
                              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.2 rounded font-mono inline-flex items-center gap-1" title="Time conflict: this task overlaps with another scheduled task">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                Overlap
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
                                <span className="text-neutral-800 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                  Contact: {task.contactName}
                                </span>
                              </>
                            )}
                            {task.meetingWith && (
                              <>
                                <span>·</span>
                                <span className="text-neutral-800 font-medium bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                  Meeting: {task.meetingWith}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Location or Link for meetings */}
                          {task.locationOrLink && (
                            <div className="text-[11px] text-blue-700 flex items-center gap-1">
                              <span className="text-neutral-400">Location/Link:</span>
                              <span className="font-mono">{task.locationOrLink}</span>
                            </div>
                          )}

                          {/* Outcome Notes for concluded meetings */}
                          {task.outcomeNotes && (
                            <p className="text-xs text-blue-900 bg-blue-50/70 border border-blue-200/60 p-2 rounded mt-1">
                              <strong className="font-semibold">Outcome:</strong> {task.outcomeNotes}
                            </p>
                          )}

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

                      {/* Right Block: Task Action Buttons with Daily Lock */}
                      <div className="flex items-center flex-wrap gap-1.5 self-end sm:self-auto pt-2 sm:pt-0 justify-end">
                        {isFutureDate ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 rounded select-none cursor-not-allowed"
                            title={`Locked until ${parseISODate(task.date).toLocaleDateString('en-US', { weekday: 'long' })}. Only today's tasks can be completed.`}
                          >
                            <Lock className="w-3 h-3 text-neutral-400" />
                            <span>Available {parseISODate(task.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                          </span>
                        ) : isPastDate ? (
                          /* Past tasks are read-only */
                          null
                        ) : (
                          <>
                            {/* Specialized Meeting Conclude Action */}
                            {task.type === 'meeting' && !isCompleted && !isSkipped && (
                              <button
                                onClick={() => openMeetingModal(task)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs cursor-pointer"
                                title="Conclude Meeting & Record Decisions"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Conclude</span>
                              </button>
                            )}

                            {/* Specialized Follow-Up Chain Action */}
                            {task.type === 'follow_up' && !isCompleted && !isSkipped && (
                              <button
                                onClick={() => openFollowUpModal(task)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors shadow-xs cursor-pointer"
                                title="Complete & Schedule Next Follow-Up"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>Follow-up</span>
                              </button>
                            )}

                            {/* Cold Call / Outreach -> Schedule Meeting shortcut */}
                            {task.type !== 'meeting' && (task.title.toLowerCase().includes('call') || task.category === 'Outreach' || task.category === 'Sales') && !isCompleted && !isSkipped && (
                              <button
                                onClick={() => openCreateTask(task.date, 'meeting')}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                                title="Schedule meeting resulting from this call"
                              >
                                <CalendarCheck className="w-3 h-3 text-blue-600" />
                                <span className="hidden md:inline">+ Meeting</span>
                              </button>
                            )}

                            {/* 1. START TASK (Requirement 5) */}
                            {!isCompleted && !isSkipped && (
                              isInProgress ? (
                                <button
                                  onClick={() => completeTask(task.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors shadow-xs cursor-pointer"
                                  title="Complete Active Task"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Complete</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => startTask(task.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors cursor-pointer"
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:text-emerald-700 hover:bg-emerald-50 border border-neutral-200 rounded transition-colors cursor-pointer"
                                title="Direct Complete"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Done</span>
                              </button>
                            )}

                            {/* If Completed, option to reopen/uncheck */}
                            {isCompleted && (
                              <button
                                onClick={() => toggleTaskStatus(task.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded cursor-pointer"
                                title="Reopen Task"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reopen</span>
                              </button>
                            )}
                            {/* 3. SKIP TASK (Requirement 7 - only on active day) */}
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
                          </>
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

                        {/* DELETE with inline confirmation */}
                        {confirmDeleteTaskId === task.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded">
                            <span className="text-[10px] text-rose-700 font-semibold px-1">Delete?</span>
                            <button
                              onClick={() => {
                                deleteTask(task.id);
                                setConfirmDeleteTaskId(null);
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteTaskId(null)}
                              className="px-1 py-0.5 text-[10px] text-neutral-600 hover:text-neutral-900"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteTaskId(task.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center text-xs text-[#4B5563]/60 italic">
            No unscheduled tasks for this day.
          </div>
        ) : (
          <div className="bg-white border border-[#E5E7EB] rounded-xl divide-y divide-[#E5E7EB] shadow-xs overflow-hidden">
            {unscheduledTasks.map(t => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-neutral-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Completion Checkbox with Daily Lock */}
                    {isFutureDate ? (
                      <div
                        className="text-neutral-400 shrink-0 cursor-not-allowed"
                        title={`Locked until ${parseISODate(t.date).toLocaleDateString('en-US', { weekday: 'long' })}, ${t.date}. Only today's tasks can be completed.`}
                      >
                        <Lock className="w-4.5 h-4.5 text-neutral-400" />
                      </div>
                    ) : isPastDate ? (
                      <div
                        className="shrink-0 text-neutral-400"
                        title={isDone ? 'Completed' : 'Historical - Incomplete'}
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
                        className="text-[#4B5563] hover:text-[#E50914] shrink-0 cursor-pointer"
                        title={isDone ? 'Mark Pending' : 'Mark Completed'}
                        aria-label={isDone ? 'Mark Pending' : 'Mark Completed'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                        ) : (
                          <Circle className="w-4.5 h-4.5 hover:stroke-[#E50914]" />
                        )}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-semibold break-words ${
                          isDone ? 'line-through text-neutral-400' : 'text-[#111111]'
                        }`}
                      >
                        {t.title}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-[#4B5563] mt-0.5 flex-wrap">
                        {isFutureDate && (
                          <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-neutral-500" />
                            Upcoming
                          </span>
                        )}
                        <span className="capitalize">{t.type.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>{t.category}</span>
                        <span>·</span>
                        <span className="capitalize">{t.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assign Time or Reschedule */}
                  <div className="flex items-center flex-wrap gap-1.5 self-end sm:self-auto shrink-0 justify-end">
                    {!isFutureDate && !isPastDate && t.type === 'meeting' && !isDone && (
                      <button
                        onClick={() => openMeetingModal(t)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors shadow-xs cursor-pointer"
                        title="Conclude Meeting"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Conclude</span>
                      </button>
                    )}

                    {!isFutureDate && !isPastDate && t.type === 'follow_up' && !isDone && (
                      <button
                        onClick={() => openFollowUpModal(t)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors shadow-xs cursor-pointer"
                        title="Complete & Schedule Next Follow-up"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>Follow-up</span>
                      </button>
                    )}

                    {isFutureDate && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 rounded select-none">
                        <Lock className="w-3 h-3 text-neutral-400" />
                        <span>Available {parseISODate(t.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setReschedulingTask(t);
                        setRescheduleDate(t.date);
                        setRescheduleTime('10:00');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 border border-[#E5E7EB] rounded cursor-pointer"
                    >
                      Set Time
                    </button>
                    <button
                      onClick={() => openEditTask(t)}
                      className="p-1 text-[#4B5563] hover:text-[#111111] cursor-pointer"
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
      {/* 5. DAILY SUMMARY & REFLECTION NOTES (Requirement 23) - ONLY ON WORKDAYS */}
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
        </>
      )}

      {/* SKIP TASK MODAL (Requirement 7) */}
      {skippingTaskId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E5E7EB] p-5 space-y-3.5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914]" />
              <h4 className="text-sm font-bold text-[#111111]">
                Skip Task
              </h4>
            </div>
            <p className="text-xs text-[#4B5563]">
              This task will be recorded as skipped for performance audits.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Reason for skipping (optional):
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Client postponed, waiting on materials..."
                value={skipReasonInput}
                onChange={e => setSkipReasonInput(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setSkippingTaskId(null)}
                className="px-3 py-1.5 text-xs text-[#4B5563] hover:text-[#111111] rounded hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSkip}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md shadow-xs shadow-[#E50914]/20 transition-all cursor-pointer"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL (Requirement 8) */}
      {reschedulingTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E5E7EB] p-5 space-y-3.5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914]" />
              <h4 className="text-sm font-bold text-[#111111]">
                Reschedule Task
              </h4>
            </div>
            <p className="text-xs text-[#4B5563] break-words">
              Moving: <span className="font-semibold text-[#111111]">{reschedulingTask.title}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  New Date *
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md font-mono bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
                />

                {isDateOffDay(rescheduleDate) && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1">
                    ⚠️ This is an OFF DAY. Tasks cannot be scheduled on this date.
                  </p>
                )}

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  <span className="text-[#4B5563] text-[10px]">Move to:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = parseISODate(rescheduleDate || selectedDate);
                      d.setDate(d.getDate() + 1);
                      setRescheduleDate(formatISODate(d));
                    }}
                    className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[10px] cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = parseISODate(rescheduleDate || selectedDate);
                      d.setDate(d.getDate() + 3);
                      setRescheduleDate(formatISODate(d));
                    }}
                    className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[10px] cursor-pointer"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = parseISODate(rescheduleDate || selectedDate);
                      d.setDate(d.getDate() + 7);
                      setRescheduleDate(formatISODate(d));
                    }}
                    className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[10px] cursor-pointer"
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = parseISODate(rescheduleDate || selectedDate);
                      const day = d.getDay();
                      const daysUntilMonday = ((1 - day + 7) % 7) || 7;
                      d.setDate(d.getDate() + daysUntilMonday);
                      setRescheduleDate(formatISODate(d));
                    }}
                    className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[10px] cursor-pointer"
                  >
                    Next Monday
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  New Start Time
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md font-mono bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setReschedulingTask(null)}
                className="px-3 py-1.5 text-xs text-[#4B5563] hover:text-[#111111] rounded hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDateOffDay(rescheduleDate)}
                onClick={handleConfirmReschedule}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-all ${
                  isDateOffDay(rescheduleDate)
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] shadow-[#E50914]/20 cursor-pointer'
                }`}
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
