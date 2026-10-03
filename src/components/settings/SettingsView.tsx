import React, { useState } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { DAY_NAMES, parseISODate } from '../../utils/dateUtils';
import { TaskTemplate, TaskPriority, FrequencyType, Task } from '../../types';
import {
  Save,
  Plus,
  Trash2,
  FileEdit,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Clock,
  Settings as SettingsIcon,
  AlertTriangle,
  X,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    templates,
    updateTemplate,
    addTemplate,
    deleteTemplate,
    exportData,
    importData,
    resetAll,
    tasks,
    deleteTask,
  } = useWorkPlan();

  // Local state for settings form
  const [userName, setUserName] = useState(settings.userName);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>(settings.weeklyOffDays || [5, 6]);
  const [workDayStart, setWorkDayStart] = useState(settings.workDayStart);
  const [workDayEnd, setWorkDayEnd] = useState(settings.workDayEnd);
  const [defaultDuration, setDefaultDuration] = useState(settings.defaultTaskDuration);
  const [defaultPriority, setDefaultPriority] = useState<TaskPriority>(settings.defaultPriority);

  // Category and project inputs
  const [newCategory, setNewCategory] = useState('');
  const [newProject, setNewProject] = useState('');

  // Template modal / edit state
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplFrequency, setTmplFrequency] = useState<FrequencyType>('daily');
  const [tmplDaysOfWeek, setTmplDaysOfWeek] = useState<number[]>([1]);
  const [tmplTimesPerWeek, setTmplTimesPerWeek] = useState(1);
  const [tmplMonthlyRule, setTmplMonthlyRule] = useState<'last_working_day' | 'first_working_day' | 'specific_day'>('last_working_day');
  const [tmplDayOfMonth, setTmplDayOfMonth] = useState<number>(30);
  const [tmplGenerateOnlyWorkingDays, setTmplGenerateOnlyWorkingDays] = useState(true);
  const [tmplStartDate, setTmplStartDate] = useState('');
  const [tmplEndDate, setTmplEndDate] = useState('');
  const [tmplTime, setTmplTime] = useState('09:00');
  const [tmplDuration, setTmplDuration] = useState(30);
  const [tmplCategory, setTmplCategory] = useState('Content');
  const [tmplPriority, setTmplPriority] = useState<TaskPriority>('medium');
  const [tmplActive, setTmplActive] = useState(true);
  const [tmplNotes, setTmplNotes] = useState('');

  const [savedNotification, setSavedNotification] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmDeleteTmplId, setConfirmDeleteTmplId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [conflictDayIndex, setConflictDayIndex] = useState<number | null>(null);
  const [conflictTasks, setConflictTasks] = useState<Task[]>([]);

  const handleToggleOffDay = (dayIndex: number) => {
    const isCurrentlyOff = weeklyOffDays.includes(dayIndex);
    if (!isCurrentlyOff) {
      // Trying to mark day as OFF DAY. Check for existing tasks!
      const conflicting = tasks.filter(t => {
        const d = parseISODate(t.date);
        return d.getDay() === dayIndex;
      });
      if (conflicting.length > 0) {
        setConflictDayIndex(dayIndex);
        setConflictTasks(conflicting);
        return;
      }
    }
    setWeeklyOffDays(prev =>
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleConfirmConflictRemoval = () => {
    if (conflictDayIndex === null) return;
    conflictTasks.forEach(t => deleteTask(t.id));
    setWeeklyOffDays(prev => [...prev, conflictDayIndex].sort());
    setConflictDayIndex(null);
    setConflictTasks([]);
  };

  const handleCancelConflict = () => {
    setConflictDayIndex(null);
    setConflictTasks([]);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      userName,
      weeklyOffDays,
      workDayStart,
      workDayEnd,
      defaultTaskDuration: defaultDuration,
      defaultPriority,
    });
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  // Add category
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (!settings.categories.includes(newCategory.trim())) {
      updateSettings({ categories: [...settings.categories, newCategory.trim()] });
    }
    setNewCategory('');
  };

  const handleRemoveCategory = (cat: string) => {
    updateSettings({ categories: settings.categories.filter(c => c !== cat) });
  };

  // Add project
  const handleAddProject = () => {
    if (!newProject.trim()) return;
    if (!settings.projects.includes(newProject.trim())) {
      updateSettings({ projects: [...settings.projects, newProject.trim()] });
    }
    setNewProject('');
  };

  const handleRemoveProject = (proj: string) => {
    updateSettings({ projects: settings.projects.filter(p => p !== proj) });
  };

  // Template editing
  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setTmplTitle('');
    setTmplFrequency('daily');
    setTmplDaysOfWeek([0, 1, 2, 3, 4]);
    setTmplTimesPerWeek(1);
    setTmplMonthlyRule('last_working_day');
    setTmplDayOfMonth(30);
    setTmplGenerateOnlyWorkingDays(true);
    setTmplStartDate('');
    setTmplEndDate('');
    setTmplTime('10:00');
    setTmplDuration(30);
    setTmplCategory(settings.categories[0] || 'General');
    setTmplPriority('medium');
    setTmplActive(true);
    setTmplNotes('');
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (tmpl: TaskTemplate) => {
    setEditingTemplate(tmpl);
    setTmplTitle(tmpl.title);
    setTmplFrequency(tmpl.frequency);
    setTmplDaysOfWeek(tmpl.daysOfWeek);
    setTmplTimesPerWeek(tmpl.timesPerWeek || 1);
    setTmplMonthlyRule(tmpl.monthlyRule || 'last_working_day');
    setTmplDayOfMonth(tmpl.dayOfMonth || 30);
    setTmplGenerateOnlyWorkingDays(tmpl.generateOnlyOnWorkingDays !== false);
    setTmplStartDate(tmpl.startDate || '');
    setTmplEndDate(tmpl.endDate || '');
    setTmplTime(tmpl.preferredTime);
    setTmplDuration(tmpl.estimatedDuration);
    setTmplCategory(tmpl.category);
    setTmplPriority(tmpl.priority);
    setTmplActive(tmpl.active);
    setTmplNotes(tmpl.notes || '');
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplTitle.trim()) return;

    const payload = {
      title: tmplTitle.trim(),
      type: 'recurring' as const,
      frequency: tmplFrequency,
      daysOfWeek: tmplDaysOfWeek,
      timesPerWeek: tmplTimesPerWeek,
      monthlyRule: tmplFrequency === 'monthly' ? tmplMonthlyRule : undefined,
      dayOfMonth: tmplFrequency === 'monthly' && tmplMonthlyRule === 'specific_day' ? tmplDayOfMonth : undefined,
      generateOnlyOnWorkingDays: tmplFrequency === 'daily' ? tmplGenerateOnlyWorkingDays : undefined,
      startDate: tmplStartDate || undefined,
      endDate: tmplEndDate || undefined,
      preferredTime: tmplTime,
      estimatedDuration: tmplDuration,
      category: tmplCategory,
      priority: tmplPriority,
      active: tmplActive,
      notes: tmplNotes.trim(),
      recurrenceTag: editingTemplate?.recurrenceTag || `custom_${Date.now()}`,
    };

    if (editingTemplate) {
      updateTemplate({ ...payload, id: editingTemplate.id });
    } else {
      addTemplate(payload);
    }
    setIsTemplateModalOpen(false);
  };

  // Export / Import
  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `self-reporting-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      const success = importData(content);
      if (success) {
        setImportStatus('Data successfully imported and synchronized!');
      } else {
        setImportStatus('Failed to import JSON: Invalid format.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    resetAll();
    setConfirmResetOpen(false);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
          Settings & Customization
        </h1>
        <p className="text-xs text-[#4B5563] mt-0.5">
          Configure working cadence, routine templates, categories, and backup your workspace
        </p>
      </div>

      {/* Section 1: Working Schedule & Weekly Off Days */}
      <form onSubmit={handleSaveSettings} className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-6 space-y-6 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            Work Schedule & Weekly Off Days
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Default weekly off days are Friday and Saturday. You can customize them at any time.
          </p>
        </div>

        {/* Weekly Off Days selector */}
        <div>
          <label className="block text-xs font-semibold text-[#111111] mb-2">
            Weekly Off Days (Non-working by default)
          </label>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {DAY_NAMES.map((name, index) => {
              const isOff = weeklyOffDays.includes(index);
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => handleToggleOffDay(index)}
                  className={`p-2 sm:p-2.5 text-center rounded-md border text-xs transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isOff
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-white border-[#E5E7EB] text-[#111111] hover:bg-neutral-50'
                  }`}
                >
                  <span className="font-bold">{name.slice(0, 3)}</span>
                  <span className="text-[10px] text-[#4B5563] font-normal">
                    {isOff ? 'Off Day' : 'Working'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#4B5563] mt-1.5">
            Strict Off-Day Rule: Configured off days strictly contain zero tasks. All routines, recurring tasks, meetings, and follow-ups skip off days.
          </p>
        </div>

        {/* Working Hours & Task Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">
              Work Day Start
            </label>
            <input
              type="time"
              value={workDayStart}
              onChange={e => setWorkDayStart(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md font-mono bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">
              Work Day End
            </label>
            <input
              type="time"
              value={workDayEnd}
              onChange={e => setWorkDayEnd(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md font-mono bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">
              Default Task Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                step="5"
                value={defaultDuration}
                onChange={e => setDefaultDuration(parseInt(e.target.value, 10) || 30)}
                className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md font-mono tabular-nums bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
              />
              <span className="text-xs text-[#4B5563]">min</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1">
              Default Priority
            </label>
            <select
              value={defaultPriority}
              onChange={e => setDefaultPriority(e.target.value as TaskPriority)}
              className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
          <div>
            {savedNotification && (
              <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settings saved successfully!
              </span>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md transition-all shadow-xs shadow-[#E50914]/20 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Section 2: Recurring Task Templates (User Routine) */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">
              Recurring Task Routine Templates
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Customize your daily activities and weekly recurring habits (e.g. status poster, LinkedIn posts frequency, Reels)
            </p>
          </div>

          <button
            type="button"
            onClick={openNewTemplateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md transition-all shadow-xs shadow-[#E50914]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Template</span>
          </button>
        </div>

        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden divide-y divide-[#E5E7EB]">
          {templates.map(tmpl => {
            const daysLabel =
              tmpl.frequency === 'daily'
                ? (tmpl.generateOnlyOnWorkingDays === false ? 'Every day (incl. weekends)' : 'All working days')
                : tmpl.frequency === 'monthly'
                ? (tmpl.monthlyRule === 'last_working_day' || tmpl.recurrenceTag === 'monthly_report'
                    ? 'Last working day of month'
                    : tmpl.monthlyRule === 'first_working_day'
                    ? 'First working day of month'
                    : `Day ${tmpl.dayOfMonth || 1} of month`)
                : tmpl.frequency === 'multiple_times_per_week'
                ? `${tmpl.timesPerWeek || tmpl.daysOfWeek.length}x/wk (${tmpl.daysOfWeek.map(d => DAY_NAMES[d].slice(0, 3)).join(', ')})`
                : tmpl.daysOfWeek.map(d => DAY_NAMES[d].slice(0, 3)).join(', ');

            return (
              <div
                key={tmpl.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-neutral-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Active switch */}
                  <input
                    type="checkbox"
                    checked={tmpl.active}
                    onChange={e => updateTemplate({ ...tmpl, active: e.target.checked })}
                    className="rounded text-neutral-900 focus:ring-neutral-900 w-4 h-4 cursor-pointer"
                    title={tmpl.active ? 'Active' : 'Inactive'}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${tmpl.active ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {tmpl.title}
                      </span>
                      {!tmpl.active && (
                        <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.2 rounded">
                          Paused
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-neutral-50 text-neutral-600 capitalize">
                        {tmpl.frequency.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5 flex-wrap">
                      <span>{daysLabel}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{tmpl.preferredTime} ({tmpl.estimatedDuration}m)</span>
                      <span>·</span>
                      <span>{tmpl.category}</span>
                      {(tmpl.startDate || tmpl.endDate) && (
                        <>
                          <span>·</span>
                          <span className="text-neutral-400 font-mono text-[10px]">
                            {tmpl.startDate || 'start'} → {tmpl.endDate || 'ongoing'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditTemplateModal(tmpl)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded"
                    title="Edit Template"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                  </button>
                  {confirmDeleteTmplId === tmpl.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                      <span className="text-rose-700 font-medium">Delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          deleteTemplate(tmpl.id);
                          setConfirmDeleteTmplId(null);
                        }}
                        className="text-rose-800 font-bold hover:underline px-1"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTmplId(null)}
                        className="text-neutral-500 hover:text-neutral-800 px-0.5"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteTmplId(tmpl.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Categories & Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Categories
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category..."
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 border border-[#E5E7EB] rounded-md cursor-pointer transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {settings.categories.map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 text-xs text-[#111111] bg-neutral-100 border border-[#E5E7EB] px-2.5 py-1 rounded-md"
              >
                <span>{c}</span>
                {settings.categories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(c)}
                    className="text-[#4B5563] hover:text-rose-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Projects & Workstreams
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New project name..."
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            />
            <button
              type="button"
              onClick={handleAddProject}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 border border-[#E5E7EB] rounded-md cursor-pointer transition-colors"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {settings.projects.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 text-xs text-[#111111] bg-neutral-100 border border-[#E5E7EB] px-2.5 py-1 rounded-md"
              >
                <span>{p}</span>
                {settings.projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(p)}
                    className="text-[#4B5563] hover:text-rose-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Data Backup & Reset */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            Data Storage & Backup
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            All data is saved locally on your browser. Export your complete plan or import a backup file.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 border border-[#E5E7EB] rounded-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#111111] bg-neutral-100 hover:bg-neutral-200 border border-[#E5E7EB] rounded-md transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {confirmResetOpen ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md ml-auto text-xs">
              <span className="text-rose-800 font-medium">Reset all workspace data to defaults?</span>
              <button
                type="button"
                onClick={handleResetData}
                className="px-2 py-0.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded shadow-2xs cursor-pointer"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-2 py-0.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Sample Data</span>
            </button>
          )}
        </div>

        {importStatus && (
          <p className="text-xs text-emerald-700 font-medium">{importStatus}</p>
        )}
      </div>

      {/* Template Edit Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E5E7EB] flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E50914] shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-[#111111]">
                  {editingTemplate ? 'Edit Recurring Routine' : 'New Recurring Routine'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Routine Title
                </label>
                <input
                  type="text"
                  required
                  value={tmplTitle}
                  onChange={e => setTmplTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded bg-white focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={tmplFrequency}
                    onChange={e => setTmplFrequency(e.target.value as FrequencyType)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="multiple_times_per_week">Multiple Times Per Week</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom Routine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Category
                  </label>
                  <select
                    value={tmplCategory}
                    onChange={e => setTmplCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white"
                  >
                    {settings.categories.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Daily configuration */}
              {tmplFrequency === 'daily' && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-800">
                    <input
                      type="checkbox"
                      checked={tmplGenerateOnlyWorkingDays}
                      onChange={e => setTmplGenerateOnlyWorkingDays(e.target.checked)}
                      className="rounded text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>Generate only on working days (respect configured weekly off days)</span>
                  </label>
                </div>
              )}

              {/* Weekly / Multiple times / Custom: Days of Week */}
              {(tmplFrequency === 'weekly' || tmplFrequency === 'multiple_times_per_week' || tmplFrequency === 'custom') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-neutral-700">
                      Days of Week
                    </label>
                    {tmplFrequency === 'multiple_times_per_week' && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-neutral-500">Target frequency:</span>
                        <input
                          type="number"
                          min="1"
                          max="7"
                          value={tmplTimesPerWeek}
                          onChange={e => setTmplTimesPerWeek(parseInt(e.target.value, 10) || 1)}
                          className="w-12 px-1.5 py-0.5 text-xs border border-neutral-300 rounded font-mono text-center bg-white"
                        />
                        <span className="text-neutral-500">x / week</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((name, idx) => {
                      const isSelected = tmplDaysOfWeek.includes(idx);
                      return (
                        <button
                          type="button"
                          key={name}
                          onClick={() => {
                            setTmplDaysOfWeek(prev =>
                              prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                            );
                          }}
                          className={`py-1 text-center text-xs rounded border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#E50914] text-white font-bold border-[#E50914]'
                              : 'bg-white text-[#111111] hover:bg-neutral-50 border-[#E5E7EB]'
                          }`}
                        >
                          {name.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Rule configuration */}
              {tmplFrequency === 'monthly' && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md space-y-2.5">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Monthly Generation Rule
                  </label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                      <input
                        type="radio"
                        name="monthlyRule"
                        value="last_working_day"
                        checked={tmplMonthlyRule === 'last_working_day'}
                        onChange={() => setTmplMonthlyRule('last_working_day')}
                        className="text-neutral-900 focus:ring-neutral-900"
                      />
                      <span>Last working day of the month (e.g. Monthly Self-Report)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                      <input
                        type="radio"
                        name="monthlyRule"
                        value="first_working_day"
                        checked={tmplMonthlyRule === 'first_working_day'}
                        onChange={() => setTmplMonthlyRule('first_working_day')}
                        className="text-neutral-900 focus:ring-neutral-900"
                      />
                      <span>First working day of the month</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700">
                      <input
                        type="radio"
                        name="monthlyRule"
                        value="specific_day"
                        checked={tmplMonthlyRule === 'specific_day'}
                        onChange={() => setTmplMonthlyRule('specific_day')}
                        className="text-neutral-900 focus:ring-neutral-900"
                      />
                      <span className="flex items-center gap-2">
                        <span>Specific day of the month:</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          disabled={tmplMonthlyRule !== 'specific_day'}
                          value={tmplDayOfMonth}
                          onChange={e => setTmplDayOfMonth(parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-2 py-0.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                        />
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Start Date and End Date Bounds (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Start Date <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={tmplStartDate}
                    onChange={e => setTmplStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    End Date <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={tmplEndDate}
                    onChange={e => setTmplEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    value={tmplTime}
                    onChange={e => setTmplTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={tmplDuration}
                    onChange={e => setTmplDuration(parseInt(e.target.value, 10) || 15)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono tabular-nums bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  value={tmplNotes}
                  onChange={e => setTmplNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tmplActiveCheck"
                  checked={tmplActive}
                  onChange={e => setTmplActive(e.target.checked)}
                  className="rounded text-neutral-900 focus:ring-neutral-900"
                />
                <label htmlFor="tmplActiveCheck" className="text-xs text-neutral-800">
                  Active (include in monthly schedule generator)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md shadow-xs shadow-[#E50914]/20 transition-all cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Tasks Conflict Modal (Requirement 7) */}
      {conflictDayIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
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
                You are setting <strong>{DAY_NAMES[conflictDayIndex]}</strong> as an <strong>OFF DAY</strong>.
              </p>
              <p className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                Under the strict scheduling rule, an OFF DAY must have <strong>zero tasks</strong>. There are currently <strong>{conflictTasks.length} task(s)</strong> scheduled on this day.
              </p>
              <p>
                Before this day can become a true OFF DAY, these tasks must be removed or cancelled.
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
