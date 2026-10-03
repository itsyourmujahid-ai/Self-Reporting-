import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  X,
  Calendar,
  Check,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Info,
  CalendarDays,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { DAY_NAMES, MONTH_NAMES, getTodayISO, isDateOff, parseISODate } from '../../utils/dateUtils';
import { TaskType, TaskPriority, OneTimePlannedTask, Task } from '../../types';

export const MonthlySetupModal: React.FC = () => {
  const {
    isMonthlySetupOpen,
    closeMonthlySetup,
    templates,
    settings,
    generateMonthSchedule,
    setCurrentMonth,
    setSelectedDate,
    currentMonth,
    addTemplate,
    tasks,
    deleteTask,
  } = useWorkPlan();

  const todayISO = getTodayISO();

  // Target month state: defaults to selected currentMonth or next month if current is already configured
  const [targetMonth, setTargetMonth] = useState<string>(currentMonth || todayISO.slice(0, 7));
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Working days and weekly off days (default Friday=5, Saturday=6)
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>(settings.weeklyOffDays || [5, 6]);
  const [workingDays, setWorkingDays] = useState<number[]>(settings.workingDays || [0, 1, 2, 3, 4]);
  const [workDayStart, setWorkDayStart] = useState<string>(settings.workDayStart || '09:00');
  const [workDayEnd, setWorkDayEnd] = useState<string>(settings.workDayEnd || '18:00');

  // Selected templates to generate
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  // Important dates
  const [importantDates, setImportantDates] = useState<
    Array<{ date: string; title: string; type: TaskType; time: string; notes?: string }>
  >([]);

  // One-time planned tasks
  const [oneTimeTasks, setOneTimeTasks] = useState<OneTimePlannedTask[]>([]);

  // Month notes
  const [monthNotes, setMonthNotes] = useState<string>('');

  // Quick inputs for important date
  const [newImpDate, setNewImpDate] = useState('');
  const [newImpTitle, setNewImpTitle] = useState('');
  const [newImpType, setNewImpType] = useState<TaskType>('one_time');
  const [newImpTime, setNewImpTime] = useState('09:30');

  // Quick inputs for one-time task
  const [newOtDate, setNewOtDate] = useState('');
  const [newOtTitle, setNewOtTitle] = useState('');
  const [newOtTime, setNewOtTime] = useState('11:00');
  const [newOtDuration, setNewOtDuration] = useState(30);
  const [newOtPriority, setNewOtPriority] = useState<TaskPriority>('medium');
  const [newOtNotes, setNewOtNotes] = useState('');

  // Sync state when modal opens
  useEffect(() => {
    if (isMonthlySetupOpen) {
      const activeMonth = currentMonth || todayISO.slice(0, 7);
      setTargetMonth(activeMonth);
      setWeeklyOffDays(settings.weeklyOffDays || [5, 6]);
      setWorkingDays(settings.workingDays || [0, 1, 2, 3, 4]);
      setWorkDayStart(settings.workDayStart || '09:00');
      setWorkDayEnd(settings.workDayEnd || '18:00');
      setSelectedTemplateIds(templates.filter(t => t.active).map(t => t.id));
      setMonthNotes(settings.monthlyNotes?.[activeMonth] || '');
      setImportantDates([
        {
          date: `${activeMonth}-05`,
          title: 'Monthly Review & Strategy Session',
          type: 'one_time',
          time: '09:30',
          notes: 'Review targets and operational cadence.',
        },
      ]);
      setOneTimeTasks([]);
      setNewImpDate(`${activeMonth}-01`);
      setNewOtDate(`${activeMonth}-01`);
      setStep(1);
    }
  }, [isMonthlySetupOpen, currentMonth, settings, templates, todayISO]);

  const [conflictDayIndex, setConflictDayIndex] = useState<number | null>(null);
  const [conflictTasks, setConflictTasks] = useState<Task[]>([]);

  const isNewImpDateOff = isDateOff(newImpDate, weeklyOffDays);
  const isNewOtDateOff = isDateOff(newOtDate, weeklyOffDays);

  if (!isMonthlySetupOpen) return null;

  const toggleOffDay = (dayIndex: number) => {
    const isCurrentlyOff = weeklyOffDays.includes(dayIndex);
    if (!isCurrentlyOff) {
      // Check if tasks already exist on this day in targetMonth
      const monthConflicts = tasks.filter(t => {
        if (!t.date.startsWith(targetMonth)) return false;
        const d = parseISODate(t.date);
        return d.getDay() === dayIndex;
      });
      if (monthConflicts.length > 0) {
        setConflictDayIndex(dayIndex);
        setConflictTasks(monthConflicts);
        return;
      }
    }
    setWeeklyOffDays(prev => {
      const updated = prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort();
      // Keep working days mutually aligned
      setWorkingDays([0, 1, 2, 3, 4, 5, 6].filter(d => !updated.includes(d)));
      return updated;
    });
  };

  const handleConfirmConflictRemoval = () => {
    if (conflictDayIndex === null) return;
    conflictTasks.forEach(t => deleteTask(t.id));
    setWeeklyOffDays(prev => {
      const updated = [...prev, conflictDayIndex].sort();
      setWorkingDays([0, 1, 2, 3, 4, 5, 6].filter(d => !updated.includes(d)));
      return updated;
    });
    setConflictDayIndex(null);
    setConflictTasks([]);
  };

  const handleCancelConflict = () => {
    setConflictDayIndex(null);
    setConflictTasks([]);
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddImportantDate = () => {
    if (!newImpDate || !newImpTitle.trim() || isNewImpDateOff) return;
    setImportantDates(prev => [
      ...prev,
      {
        date: newImpDate,
        title: newImpTitle.trim(),
        type: newImpType,
        time: newImpTime,
      },
    ]);
    setNewImpTitle('');
  };

  const handleRemoveImportantDate = (index: number) => {
    setImportantDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddOneTimeTask = () => {
    if (!newOtDate || !newOtTitle.trim() || isNewOtDateOff) return;
    setOneTimeTasks(prev => [
      ...prev,
      {
        date: newOtDate,
        title: newOtTitle.trim(),
        type: 'one_time',
        startTime: newOtTime,
        durationMinutes: newOtDuration,
        priority: newOtPriority,
        notes: newOtNotes.trim() || undefined,
      },
    ]);
    setNewOtTitle('');
    setNewOtNotes('');
  };

  const handleRemoveOneTimeTask = (index: number) => {
    setOneTimeTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    generateMonthSchedule({
      month: targetMonth,
      workingDays,
      weeklyOffDays,
      workDayStart,
      workDayEnd,
      selectedTemplateIds,
      importantDates,
      oneTimeTasks,
      monthNotes: monthNotes.trim() || undefined,
    });
    setCurrentMonth(targetMonth);
    setSelectedDate(`${targetMonth}-01`);
  };

  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[targetMonthNum - 1]} ${targetYear}`;
  const isAlreadyConfigured = settings.configuredMonths.includes(targetMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E5E7EB] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E5E7EB] bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914] shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-[#111111]">
                Monthly Planning Setup
              </h2>
              <span className="text-xs font-mono font-medium text-[#111111] bg-neutral-100 border border-[#E5E7EB] px-2 py-0.5 rounded">
                {monthLabel}
              </span>
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Configure working cadence, routine templates, and generate your schedule
            </p>
          </div>
          <button
            onClick={closeMonthlySetup}
            className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="flex border-b border-[#E5E7EB] px-4 sm:px-6 bg-white overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setStep(1)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 1
                ? 'border-[#E50914] text-[#E50914] font-bold'
                : 'border-transparent text-[#4B5563] hover:text-[#111111]'
            }`}
          >
            1. Working Days
          </button>
          <button
            onClick={() => setStep(2)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 2
                ? 'border-[#E50914] text-[#E50914] font-bold'
                : 'border-transparent text-[#4B5563] hover:text-[#111111]'
            }`}
          >
            2. Templates ({selectedTemplateIds.length})
          </button>
          <button
            onClick={() => setStep(3)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 3
                ? 'border-[#E50914] text-[#E50914] font-bold'
                : 'border-transparent text-[#4B5563] hover:text-[#111111]'
            }`}
          >
            3. Key Dates ({importantDates.length + oneTimeTasks.length})
          </button>
          <button
            onClick={() => setStep(4)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 4
                ? 'border-[#E50914] text-[#E50914] font-bold'
                : 'border-transparent text-[#4B5563] hover:text-[#111111]'
            }`}
          >
            4. Review & Build
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[62vh] overflow-y-auto space-y-6">
          {/* STEP 1: Month, Working Days & Off Days */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Target Month */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Target Planning Month
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="month"
                    value={targetMonth}
                    onChange={e => {
                      const newMonth = e.target.value;
                      if (!newMonth) return;
                      const oldMonth = targetMonth;
                      setTargetMonth(newMonth);
                      setNewImpDate(`${newMonth}-01`);
                      setNewOtDate(`${newMonth}-01`);
                      setImportantDates(prev =>
                        prev.map(item => ({
                          ...item,
                          date: item.date.startsWith(oldMonth)
                            ? item.date.replace(oldMonth, newMonth)
                            : `${newMonth}-05`,
                        }))
                      );
                      setOneTimeTasks(prev =>
                        prev.map(item => ({
                          ...item,
                          date: item.date.startsWith(oldMonth)
                            ? item.date.replace(oldMonth, newMonth)
                            : `${newMonth}-01`,
                        }))
                      );
                    }}
                    className="w-48 px-3 py-1.5 text-sm border border-neutral-300 rounded-md font-mono focus:ring-1 focus:ring-neutral-900 bg-white"
                  />
                  {isAlreadyConfigured && (
                    <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded inline-flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      Month already planned (Safe update mode)
                    </span>
                  )}
                </div>
              </div>

              {/* Weekly Off Days Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Weekly Off Days (Non-working by default)
                  </label>
                  <span className="text-[11px] text-neutral-500">
                    Click day to toggle working / off
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {DAY_NAMES.map((name, index) => {
                    const isOff = weeklyOffDays.includes(index);
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => toggleOffDay(index)}
                        className={`p-2.5 text-center rounded-md border text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                          isOff
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                            : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="font-bold">{name.slice(0, 3)}</span>
                        <span className="text-[10px] font-normal text-neutral-500">
                          {isOff ? 'Off Day' : 'Working'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-amber-50/70 rounded-md border border-amber-200 text-xs text-amber-900 mt-3 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Strict Off-Day Rule (Zero Tasks):</span>
                  </p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    When a date is configured as an OFF DAY, zero tasks can exist or be scheduled on it. All recurring tasks, routines, meetings, and follow-ups automatically skip off days.
                  </p>
                </div>
              </div>

              {/* Working Hours */}
              <div className="pt-2 border-t border-neutral-100">
                <label className="block text-xs font-semibold text-neutral-800 mb-2">
                  Standard Daily Working Hours
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div>
                    <span className="block text-[11px] text-neutral-500 mb-1">Start Time</span>
                    <input
                      type="time"
                      value={workDayStart}
                      onChange={e => setWorkDayStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-neutral-500 mb-1">End Time</span>
                    <input
                      type="time"
                      value={workDayEnd}
                      onChange={e => setWorkDayEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Recurring Task Templates */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900">
                    Recurring Templates to Generate
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Select which recurring routines should be automatically generated for {monthLabel}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTemplateIds.length === templates.length) {
                        setSelectedTemplateIds([]);
                      } else {
                        setSelectedTemplateIds(templates.map(t => t.id));
                      }
                    }}
                    className="text-xs text-neutral-600 hover:text-neutral-900 underline"
                  >
                    {selectedTemplateIds.length === templates.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {templates.map(tmpl => {
                  const isChecked = selectedTemplateIds.includes(tmpl.id);
                  const frequencyDesc =
                    tmpl.frequency === 'daily'
                      ? (tmpl.generateOnlyOnWorkingDays === false ? 'Daily (all days incl. weekends)' : 'Daily on working days')
                      : tmpl.frequency === 'weekly'
                      ? `Every ${tmpl.daysOfWeek.map(d => DAY_NAMES[d].slice(0, 3)).join(', ')}`
                      : tmpl.frequency === 'multiple_times_per_week'
                      ? `${tmpl.timesPerWeek || tmpl.daysOfWeek.length}x/week on ${tmpl.daysOfWeek.map(d => DAY_NAMES[d].slice(0, 3)).join(', ')}`
                      : tmpl.frequency === 'monthly'
                      ? (tmpl.monthlyRule === 'last_working_day' || tmpl.recurrenceTag === 'monthly_report'
                          ? 'Last working day of month'
                          : tmpl.monthlyRule === 'first_working_day'
                          ? 'First working day of month'
                          : `Day ${tmpl.dayOfMonth || 1} of month`)
                      : 'Custom';

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => toggleTemplateSelection(tmpl.id)}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-neutral-900 bg-neutral-50/60'
                          : 'border-neutral-200 bg-white opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 rounded text-neutral-900 focus:ring-neutral-900 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-900">
                            {tmpl.title}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500">
                            {tmpl.preferredTime} · {tmpl.estimatedDuration}m
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                          <span>{frequencyDesc}</span>
                          <span>·</span>
                          <span>{tmpl.category}</span>
                          <span>·</span>
                          <span className="capitalize">{tmpl.priority} priority</span>
                          {tmpl.notes && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-xs">{tmpl.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Important Dates & One-time Planned Tasks */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Important Dates */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Important Milestone Dates
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Milestones or key review dates for {monthLabel}
                  </p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-neutral-600 mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Q4 Kickoff or Contract Renewal"
                        value={newImpTitle}
                        onChange={e => setNewImpTitle(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={newImpDate}
                        onChange={e => setNewImpDate(e.target.value)}
                        className={`w-full px-2 py-1 text-xs border rounded bg-white font-mono ${
                          isNewImpDateOff ? 'border-rose-500 text-rose-800' : 'border-neutral-300'
                        }`}
                      />
                      {isNewImpDateOff && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          ⚠️ Off Day
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Time</label>
                      <input
                        type="time"
                        value={newImpTime}
                        onChange={e => setNewImpTime(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-neutral-300 rounded bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isNewImpDateOff}
                      onClick={handleAddImportantDate}
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
                        isNewImpDateOff
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-200'
                          : 'text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-100 cursor-pointer'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Milestone</span>
                    </button>
                  </div>
                </div>

                {importantDates.length > 0 && (
                  <div className="space-y-1.5">
                    {importantDates.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white border border-neutral-200 rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-500 text-[11px]">{item.date} {item.time}</span>
                          <span className="font-medium text-neutral-900">{item.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImportantDate(idx)}
                          className="text-neutral-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* One-time Planned Tasks */}
              <div className="space-y-3 pt-3 border-t border-neutral-200">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    One-time Planned Tasks
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Specific non-recurring tasks scheduled for this month
                  </p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-neutral-600 mb-1">Task Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Audit storage inventory"
                        value={newOtTitle}
                        onChange={e => setNewOtTitle(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={newOtDate}
                        onChange={e => setNewOtDate(e.target.value)}
                        className={`w-full px-2 py-1 text-xs border rounded bg-white font-mono ${
                          isNewOtDateOff ? 'border-rose-500 text-rose-800' : 'border-neutral-300'
                        }`}
                      />
                      {isNewOtDateOff && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          ⚠️ Off Day
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={newOtTime}
                        onChange={e => setNewOtTime(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-neutral-300 rounded bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isNewOtDateOff}
                      onClick={handleAddOneTimeTask}
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
                        isNewOtDateOff
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-200'
                          : 'text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-100 cursor-pointer'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add One-Time Task</span>
                    </button>
                  </div>
                </div>

                {oneTimeTasks.length > 0 && (
                  <div className="space-y-1.5">
                    {oneTimeTasks.map((ot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white border border-neutral-200 rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-500 text-[11px]">{ot.date} {ot.startTime}</span>
                          <span className="font-medium text-neutral-900">{ot.title}</span>
                          <span className="text-neutral-400 font-mono text-[10px]">({ot.durationMinutes}m)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOneTimeTask(idx)}
                          className="text-neutral-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Review, Optional Notes & Confirmation */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Optional Notes / Strategic Focus for {monthLabel}
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Focus on seller relationship building and tightening logistics delivery times..."
                  value={monthNotes}
                  onChange={e => setMonthNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              {/* Summary Audit Card */}
              <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50/50 space-y-2 text-xs text-neutral-700">
                <h4 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
                  Plan Configuration Summary
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-500">Planning Month:</span>{' '}
                    <span className="font-semibold text-neutral-900">{monthLabel}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Weekly Off Days:</span>{' '}
                    <span className="font-semibold text-neutral-900">
                      {weeklyOffDays.map(d => DAY_NAMES[d].slice(0, 3)).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Working Hours:</span>{' '}
                    <span className="font-mono text-neutral-900">
                      {workDayStart} – {workDayEnd}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Active Templates:</span>{' '}
                    <span className="font-semibold text-neutral-900">{selectedTemplateIds.length} routines</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Important Dates:</span>{' '}
                    <span className="font-semibold text-neutral-900">{importantDates.length}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">One-time Tasks:</span>{' '}
                    <span className="font-semibold text-neutral-900">{oneTimeTasks.length}</span>
                  </div>
                </div>
              </div>

              {/* Duplicate Protection Notice */}
              <div className="p-3 bg-neutral-900 text-white rounded-md text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Safe Plan Generation</span>
                </div>
                <p className="text-neutral-300">
                  Tasks will be generated across working days according to your templates and rules.
                  Any existing completed tasks or manual follow-ups/meetings will be preserved with <strong>zero duplicates</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50/50">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeMonthlySetup}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-md"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md shadow-xs shadow-[#E50914]/20 transition-all cursor-pointer"
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md shadow-xs shadow-[#E50914]/20 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Generate Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Existing Tasks Conflict Modal (Requirement 7) */}
      {conflictDayIndex !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-amber-300 p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-[#111111]">
                  Existing Tasks Conflict: {DAY_NAMES[conflictDayIndex]}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelConflict}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#4B5563]">
              <p>
                You are setting <strong>{DAY_NAMES[conflictDayIndex]}</strong> as an <strong>OFF DAY</strong> for <strong>{monthLabel}</strong>.
              </p>
              <p className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                Under the strict scheduling rule, an OFF DAY must have <strong>zero tasks</strong>. There are currently <strong>{conflictTasks.length} task(s)</strong> already scheduled on this day in {monthLabel}.
              </p>
              <p>
                Before this day can become a true OFF DAY, existing tasks must be removed or cancelled.
              </p>
            </div>

            {/* List of conflicting tasks */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-neutral-200 rounded p-2 bg-neutral-50/50">
              {conflictTasks.map(t => (
                <div key={t.id} className="p-2 bg-white border border-neutral-200 rounded text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#111111] truncate">{t.title}</p>
                    <p className="text-[11px] text-[#4B5563] font-mono">
                      {t.date} {t.startTime ? `· ${t.startTime}` : ''} · <span className="capitalize">{t.status}</span>
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">
                    {t.type.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={handleCancelConflict}
                className="px-3.5 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
              >
                Keep Tasks (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmConflictRemoval}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs transition-all cursor-pointer"
              >
                Remove {conflictTasks.length} Task(s) & Set OFF DAY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
