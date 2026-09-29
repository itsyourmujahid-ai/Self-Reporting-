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
import { DAY_NAMES, MONTH_NAMES, getTodayISO } from '../../utils/dateUtils';
import { TaskType, TaskPriority, OneTimePlannedTask } from '../../types';

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

  if (!isMonthlySetupOpen) return null;

  const toggleOffDay = (dayIndex: number) => {
    setWeeklyOffDays(prev => {
      const updated = prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort();
      // Keep working days mutually aligned
      setWorkingDays([0, 1, 2, 3, 4, 5, 6].filter(d => !updated.includes(d)));
      return updated;
    });
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddImportantDate = () => {
    if (!newImpDate || !newImpTitle.trim()) return;
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
    if (!newOtDate || !newOtTitle.trim()) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900">
                Monthly Planning Setup
              </h2>
              <span className="text-xs font-mono font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                {monthLabel}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Configure working cadence, routine templates, and generate your schedule
            </p>
          </div>
          <button
            onClick={closeMonthlySetup}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="flex border-b border-neutral-200 px-6 bg-neutral-50/40 overflow-x-auto">
          <button
            onClick={() => setStep(1)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 1
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            1. Month & Working Days
          </button>
          <button
            onClick={() => setStep(2)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 2
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            2. Recurring Templates ({selectedTemplateIds.length})
          </button>
          <button
            onClick={() => setStep(3)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 3
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            3. Key Dates & Tasks ({importantDates.length + oneTimeTasks.length})
          </button>
          <button
            onClick={() => setStep(4)}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              step === 4
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            4. Review & Notes
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

                <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs text-neutral-600 mt-3 space-y-1">
                  <p className="font-semibold text-neutral-900">
                    Important Off-Day Behavior (Friday & Saturday default):
                  </p>
                  <p>
                    Off days only prevent normal recurring tasks from generating automatically.
                    An off day does <strong>NOT</strong> disable scheduling. You can still schedule special tasks, follow-ups, or meetings on off days anytime!
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
                        className="w-full px-2 py-1 text-xs border border-neutral-300 rounded bg-white font-mono"
                      />
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
                      onClick={handleAddImportantDate}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-100 rounded transition-colors"
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
                        className="w-full px-2 py-1 text-xs border border-neutral-300 rounded bg-white font-mono"
                      />
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
                      onClick={handleAddOneTimeTask}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-neutral-900 bg-white border border-neutral-300 hover:bg-neutral-100 rounded transition-colors"
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
                className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md shadow-xs"
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md shadow-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Generate Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
