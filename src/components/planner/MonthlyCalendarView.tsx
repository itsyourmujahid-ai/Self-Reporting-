import React, { useState, useMemo } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  getCalendarGrid,
  MONTH_NAMES,
  DAY_NAMES_SHORT,
  isWeeklyOff,
  getTodayISO,
  formatISODate,
  formatDisplayDate,
  getMonthWorkingAndOffDays,
} from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  PhoneCall,
  CalendarCheck,
  FileEdit,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  List,
  Grid,
  X,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../types';

export const MonthlyCalendarView: React.FC = () => {
  const {
    tasks,
    currentMonth,
    setCurrentMonth,
    setSelectedDate,
    setPlannerSubTab,
    openCreateTask,
    openEditTask,
    openFollowUpModal,
    openMeetingModal,
    toggleTaskStatus,
    updateTask,
    rescheduleTask,
    deleteTask,
    openMonthlySetup,
    settings,
  } = useWorkPlan();

  const [inspectDate, setInspectDate] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'agenda'>('grid');

  // Inline reschedule state in detail drawer
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null);
  const [rescheduleDateInput, setRescheduleDateInput] = useState<string>('');
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed

  const todayISO = getTodayISO();
  const calendarCells = useMemo(() => getCalendarGrid(year, monthIndex), [year, monthIndex]);

  // Working and off days count for this specific month
  const monthDayCounts = useMemo(
    () => getMonthWorkingAndOffDays(year, monthIndex, settings.weeklyOffDays),
    [year, monthIndex, settings.weeklyOffDays]
  );

  // Month navigation
  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = monthIndex - 1;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    const newMonthStr = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonthStr);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = monthIndex + 1;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    const newMonthStr = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonthStr);
  };

  const handleGoCurrentMonth = () => {
    setCurrentMonth(todayISO.slice(0, 7));
  };

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    // Sort each day's tasks chronologically
    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
    });
    return map;
  }, [tasks]);

  // Actual statistics for this month strictly from stored tasks (Requirement 11)
  const monthTasks = useMemo(
    () => tasks.filter(t => t.date.startsWith(`${currentMonth}-`)),
    [tasks, currentMonth]
  );

  const totalPlannedTasks = monthTasks.length;
  const completedTasks = monthTasks.filter(t => t.status === 'completed').length;
  const pendingTasks = monthTasks.filter(
    t => t.status === 'planned' || t.status === 'in_progress'
  ).length;
  const completionPercentage =
    totalPlannedTasks > 0 ? Math.round((completedTasks / totalPlannedTasks) * 100) : 0;

  const inspectedDayTasks = inspectDate ? tasksByDate[inspectDate] || [] : [];
  const isInspectedDateOff = inspectDate ? isWeeklyOff(inspectDate, settings.weeklyOffDays) : false;

  const handleConfirmReschedule = (taskId: string) => {
    if (!rescheduleDateInput) return;
    rescheduleTask(taskId, rescheduleDateInput);
    setReschedulingTaskId(null);
    setRescheduleDateInput('');
  };

  return (
    <div className="space-y-5">
      {/* 1. MONTHLY OVERVIEW AT TOP (Requirement 11) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 shadow-xs space-y-4">
        {/* Month Title & Nav controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-neutral-200 rounded-md bg-white">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-l-md transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoCurrentMonth}
                className="px-3 py-1 text-xs font-medium border-x border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Current Month
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-r-md transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              {MONTH_NAMES[monthIndex]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile view toggle */}
            <div className="flex sm:hidden items-center border border-neutral-200 rounded p-0.5 bg-neutral-100">
              <button
                onClick={() => setMobileViewMode('grid')}
                className={`p-1 rounded ${mobileViewMode === 'grid' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMobileViewMode('agenda')}
                className={`p-1 rounded ${mobileViewMode === 'agenda' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={openMonthlySetup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-md transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5 text-neutral-700" />
              <span>Monthly Setup</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Bar: Month Name, Planned, Working Days, Off Days, Completed, Pending, % */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-4 pt-3 border-t border-neutral-100 text-xs">
          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Planned Tasks</span>
            <div className="text-base font-bold font-mono text-neutral-900 tabular-nums">
              {totalPlannedTasks}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Working Days</span>
            <div className="text-base font-bold font-mono text-neutral-800 tabular-nums">
              {monthDayCounts.workingDaysCount}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Off Days</span>
            <div className="text-base font-bold font-mono text-amber-700 tabular-nums">
              {monthDayCounts.offDaysCount}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Completed</span>
            <div className="text-base font-bold font-mono text-emerald-700 tabular-nums">
              {completedTasks}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Pending</span>
            <div className="text-base font-bold font-mono text-neutral-700 tabular-nums">
              {pendingTasks}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Completion %</span>
            <div className="text-base font-bold font-mono text-neutral-900 tabular-nums">
              {completionPercentage}%
            </div>
          </div>
        </div>

        {/* Month notes banner if exists */}
        {settings.monthlyNotes?.[currentMonth] && (
          <div className="bg-neutral-50 border border-neutral-200 rounded p-2.5 text-xs text-neutral-700 flex items-start gap-2">
            <span className="font-semibold text-neutral-900 shrink-0">Month Focus:</span>
            <span>{settings.monthlyNotes[currentMonth]}</span>
          </div>
        )}
      </div>

      {/* 2. CALENDAR GRID (Requirement 3 & 4) */}
      <div className={`bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs ${mobileViewMode === 'agenda' ? 'hidden sm:block' : 'block'}`}>
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50/70 text-center text-xs font-semibold text-neutral-600">
          {DAY_NAMES_SHORT.map((dayName, idx) => {
            const isOff = settings.weeklyOffDays.includes(idx);
            return (
              <div
                key={dayName}
                className={`py-2.5 ${isOff ? 'text-amber-800 bg-amber-50/40' : ''}`}
              >
                <span>{dayName}</span>
                {isOff && (
                  <span className="block text-[9px] font-normal text-amber-700">Off Day</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 7-column calendar matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200">
          {calendarCells.map(cell => {
            const isOff = isWeeklyOff(cell.dateISO, settings.weeklyOffDays);
            const isToday = cell.dateISO === todayISO;
            const dayTaskList = tasksByDate[cell.dateISO] || [];
            const dayTotal = dayTaskList.length;
            const dayCompleted = dayTaskList.filter(t => t.status === 'completed').length;
            const hasImportant = dayTaskList.some(t => t.isImportant);

            return (
              <div
                key={cell.dateISO}
                onClick={() => setInspectDate(cell.dateISO)}
                className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors cursor-pointer group relative ${
                  !cell.isCurrentMonth
                    ? 'bg-neutral-50/60 text-neutral-400'
                    : isOff
                    ? 'bg-amber-50/20 hover:bg-amber-50/40'
                    : 'bg-white hover:bg-neutral-50/80'
                } ${isToday ? 'ring-2 ring-inset ring-neutral-900 z-10' : ''}`}
              >
                {/* Day Header inside cell */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-mono font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday
                          ? 'bg-neutral-900 text-white font-bold'
                          : cell.isCurrentMonth
                          ? 'text-neutral-900'
                          : 'text-neutral-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {isOff && cell.isCurrentMonth && (
                      <span className="text-[9px] font-medium text-amber-700">Off</span>
                    )}

                    {hasImportant && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Important milestone" />
                    )}
                  </div>

                  {/* Task Count badge */}
                  {dayTotal > 0 && (
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                        dayCompleted === dayTotal
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {dayCompleted}/{dayTotal}
                    </span>
                  )}
                </div>

                {/* COMPACT TASK DISPLAY (Requirement 4) */}
                <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                  {dayTaskList.slice(0, 3).map(task => {
                    const isDone = task.status === 'completed';
                    // Minimal indicator for type
                    const typeIcon =
                      task.type === 'meeting'
                        ? '◆'
                        : task.type === 'follow_up'
                        ? '☎'
                        : task.type === 'recurring'
                        ? '•'
                        : '▪';

                    return (
                      <div
                        key={task.id}
                        className={`text-[11px] truncate flex items-center gap-1 px-1 py-0.5 rounded leading-tight transition-colors ${
                          isDone
                            ? 'line-through text-neutral-400 bg-neutral-50/50'
                            : task.type === 'meeting'
                            ? 'bg-blue-50/60 text-blue-900'
                            : task.type === 'follow_up'
                            ? 'bg-purple-50/60 text-purple-900'
                            : 'bg-neutral-50 text-neutral-800'
                        }`}
                        title={`${task.startTime} ${task.title}`}
                      >
                        <span className="font-mono text-[10px] text-neutral-400 shrink-0 tabular-nums">
                          {task.startTime}
                        </span>
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}

                  {dayTaskList.length > 3 && (
                    <div className="text-[10px] text-neutral-500 font-mono pl-1">
                      +{dayTaskList.length - 3} more
                    </div>
                  )}
                </div>

                {/* Progress bar at bottom of cell */}
                {dayTotal > 0 && (
                  <div className="mt-1 w-full bg-neutral-100 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-neutral-900 h-1 transition-all"
                      style={{ width: `${Math.round((dayCompleted / dayTotal) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Agenda List View (alternative for small screens) */}
      <div className={`sm:hidden space-y-2.5 ${mobileViewMode === 'agenda' ? 'block' : 'hidden'}`}>
        {calendarCells
          .filter(c => c.isCurrentMonth)
          .map(cell => {
            const isOff = isWeeklyOff(cell.dateISO, settings.weeklyOffDays);
            const isToday = cell.dateISO === todayISO;
            const dayTaskList = tasksByDate[cell.dateISO] || [];

            return (
              <div
                key={cell.dateISO}
                onClick={() => setInspectDate(cell.dateISO)}
                className={`bg-white border rounded-lg p-3 text-xs ${
                  isToday ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900">{cell.dateISO}</span>
                    {isOff && <span className="text-[10px] text-amber-700">Weekly Off</span>}
                  </div>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {dayTaskList.length} tasks
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  {dayTaskList.length === 0 ? (
                    <span className="text-[11px] text-neutral-400 italic">No tasks scheduled</span>
                  ) : (
                    dayTaskList.slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center justify-between">
                        <span className={`truncate ${t.status === 'completed' ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                          {t.title}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-400 shrink-0 ml-2">
                          {t.startTime}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* 3. DAY DETAIL PANEL & DIRECT ACTIONS (Requirement 3, 5, 6) */}
      {inspectDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/50">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {formatDisplayDate(inspectDate)}
                </h3>
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                  <span className={isInspectedDateOff ? 'text-amber-800 font-semibold' : 'text-neutral-700'}>
                    {isInspectedDateOff ? 'Weekly Off Day' : 'Working Day'}
                  </span>
                  <span>·</span>
                  <span>{inspectedDayTasks.length} Scheduled Tasks</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openCreateTask(inspectDate);
                    setInspectDate(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>

                <button
                  onClick={() => setInspectDate(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Task list for selected date */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
              {inspectedDayTasks.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Clock className="w-6 h-6 text-neutral-400 mx-auto" />
                  <p className="text-xs text-neutral-600">
                    No tasks scheduled for this date.
                  </p>
                  <button
                    onClick={() => {
                      openCreateTask(inspectDate);
                      setInspectDate(null);
                    }}
                    className="text-xs font-semibold text-neutral-900 underline"
                  >
                    Create a task on {inspectDate}
                  </button>
                </div>
              ) : (
                inspectedDayTasks.map(t => {
                  const isDone = t.status === 'completed';

                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                        isDone
                          ? 'bg-neutral-50/50 border-neutral-200 text-neutral-500'
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* 1-click status toggle */}
                          <button
                            onClick={() => toggleTaskStatus(t.id)}
                            className="text-neutral-400 hover:text-neutral-900 shrink-0"
                            title={isDone ? 'Mark Pending' : 'Mark Completed'}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                            ) : (
                              <Circle className="w-4.5 h-4.5 hover:stroke-neutral-800" />
                            )}
                          </button>

                          {/* Time */}
                          <span className="font-mono text-[11px] text-neutral-500 shrink-0 tabular-nums">
                            {t.startTime}
                          </span>

                          {/* Title */}
                          <span
                            className={`font-semibold truncate ${
                              isDone ? 'line-through text-neutral-400' : 'text-neutral-900'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {t.type === 'meeting' && !isDone && (
                            <button
                              onClick={() => {
                                setInspectDate(null);
                                openMeetingModal(t);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                              title="Conclude Meeting"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Conclude</span>
                            </button>
                          )}

                          {t.type === 'follow_up' && !isDone && (
                            <button
                              onClick={() => {
                                setInspectDate(null);
                                openFollowUpModal(t);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded shadow-xs"
                              title="Complete & Schedule Next Follow-up"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>Follow-up</span>
                            </button>
                          )}

                          {/* Reschedule button */}
                          <button
                            onClick={() => {
                              setReschedulingTaskId(reschedulingTaskId === t.id ? null : t.id);
                              setRescheduleDateInput(t.date);
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-900 rounded"
                            title="Reschedule to another date"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setInspectDate(null);
                              openEditTask(t);
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-900 rounded"
                            title="Edit task"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button with inline confirmation */}
                          {confirmDeleteTaskId === t.id ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
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
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Metadata unboxed text */}
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 pl-6.5 flex-wrap">
                        <span className="capitalize">{t.type.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>{t.durationMinutes}m</span>
                        <span>·</span>
                        <span>{t.category}</span>
                        <span>·</span>
                        <span className="capitalize">{t.priority}</span>
                        {t.contactName && (
                          <>
                            <span>·</span>
                            <span className="text-amber-800 font-medium">Contact: {t.contactName}</span>
                          </>
                        )}
                        {t.meetingWith && (
                          <>
                            <span>·</span>
                            <span className="text-blue-800 font-medium">Meeting: {t.meetingWith}</span>
                          </>
                        )}
                      </div>

                      {/* Notes if any */}
                      {t.notes && (
                        <p className="text-[11px] text-neutral-600 pl-6.5 line-clamp-2">
                          {t.notes}
                        </p>
                      )}

                      {/* Inline Reschedule input when active */}
                      {reschedulingTaskId === t.id && (
                        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-2 pl-6.5">
                          <span className="text-[11px] font-medium text-neutral-600">Move to:</span>
                          <input
                            type="date"
                            value={rescheduleDateInput}
                            onChange={e => setRescheduleDateInput(e.target.value)}
                            className="px-2 py-0.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                          />
                          <button
                            onClick={() => handleConfirmReschedule(t.id)}
                            className="px-2 py-0.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded"
                          >
                            Move
                          </button>
                          <button
                            onClick={() => setReschedulingTaskId(null)}
                            className="text-[11px] text-neutral-500 hover:text-neutral-800"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 bg-neutral-50/50">
              <button
                onClick={() => {
                  setSelectedDate(inspectDate);
                  setPlannerSubTab('daily');
                  setInspectDate(null);
                }}
                className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 inline-flex items-center gap-1 group"
              >
                <span>Open in Daily Schedule</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => setInspectDate(null)}
                className="px-3 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
