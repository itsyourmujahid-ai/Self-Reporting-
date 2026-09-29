import React, { useState } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { DAY_NAMES } from '../../utils/dateUtils';
import { TaskTemplate, TaskPriority, FrequencyType } from '../../types';
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
  const [tmplTime, setTmplTime] = useState('09:00');
  const [tmplDuration, setTmplDuration] = useState(30);
  const [tmplCategory, setTmplCategory] = useState('Content');
  const [tmplPriority, setTmplPriority] = useState<TaskPriority>('medium');
  const [tmplActive, setTmplActive] = useState(true);
  const [tmplNotes, setTmplNotes] = useState('');

  const [savedNotification, setSavedNotification] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleToggleOffDay = (dayIndex: number) => {
    setWeeklyOffDays(prev =>
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort()
    );
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
    if (
      window.confirm(
        'Are you sure you want to reset all data back to initial defaults? This will erase current edits.'
      )
    ) {
      resetAll();
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Settings & Customization
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure working cadence, routine templates, categories, and backup your workspace
        </p>
      </div>

      {/* Section 1: Working Schedule & Weekly Off Days */}
      <form onSubmit={handleSaveSettings} className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">
            Work Schedule & Weekly Off Days
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Default weekly off days are Friday and Saturday. You can customize them at any time.
          </p>
        </div>

        {/* Weekly Off Days selector */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-2">
            Weekly Off Days (Non-working by default)
          </label>
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((name, index) => {
              const isOff = weeklyOffDays.includes(index);
              return (
                <button
                  type="button"
                  key={name}
                  onClick={() => handleToggleOffDay(index)}
                  className={`p-2.5 text-center rounded-md border text-xs transition-colors flex flex-col items-center justify-center gap-1 ${
                    isOff
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                  }`}
                >
                  <span>{name.slice(0, 3)}</span>
                  <span className="text-[10px] text-neutral-500 font-normal">
                    {isOff ? 'Off Day' : 'Working'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500 mt-1.5">
            Off days are preserved on the calendar. You can always schedule future tasks, meetings, or follow-ups on an off day whenever desired.
          </p>
        </div>

        {/* Working Hours & Task Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Work Day Start
            </label>
            <input
              type="time"
              value={workDayStart}
              onChange={e => setWorkDayStart(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Work Day End
            </label>
            <input
              type="time"
              value={workDayEnd}
              onChange={e => setWorkDayEnd(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Default Task Duration
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="5"
                step="5"
                value={defaultDuration}
                onChange={e => setDefaultDuration(parseInt(e.target.value, 10) || 30)}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono tabular-nums bg-white"
              />
              <span className="text-xs text-neutral-500">min</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Default Priority
            </label>
            <select
              value={defaultPriority}
              onChange={e => setDefaultPriority(e.target.value as TaskPriority)}
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
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
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Section 2: Recurring Task Templates (User Routine) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Recurring Task Routine Templates
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customize your daily activities and weekly recurring habits (e.g. status poster, LinkedIn posts frequency, Reels)
            </p>
          </div>

          <button
            type="button"
            onClick={openNewTemplateModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Template</span>
          </button>
        </div>

        <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-200">
          {templates.map(tmpl => {
            const daysLabel =
              tmpl.frequency === 'daily'
                ? 'All working days'
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
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                      <span className="capitalize">{tmpl.frequency}</span>
                      <span>·</span>
                      <span>{daysLabel}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{tmpl.preferredTime} ({tmpl.estimatedDuration}m)</span>
                      <span>·</span>
                      <span>{tmpl.category}</span>
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
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete template "${tmpl.title}"?`)) {
                        deleteTemplate(tmpl.id);
                      }
                    }}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 rounded"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Categories & Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Categories
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category..."
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3 py-1 text-xs font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {settings.categories.map(c => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded"
              >
                <span>{c}</span>
                {settings.categories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(c)}
                    className="text-neutral-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Projects & Workstreams
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New project name..."
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white"
            />
            <button
              type="button"
              onClick={handleAddProject}
              className="px-3 py-1 text-xs font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {settings.projects.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded"
              >
                <span>{p}</span>
                {settings.projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(p)}
                    className="text-neutral-400 hover:text-rose-600"
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
      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">
            Data Storage & Backup
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            All data is saved locally on your browser. Export your complete plan or import a backup file.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Sample Data</span>
          </button>
        </div>

        {importStatus && (
          <p className="text-xs text-emerald-700 font-medium">{importStatus}</p>
        )}
      </div>

      {/* Template Edit Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/50">
              <h3 className="text-sm font-semibold text-neutral-900">
                {editingTemplate ? 'Edit Recurring Routine' : 'New Recurring Routine'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4">
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

              {tmplFrequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Days of Week
                  </label>
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
                          className={`py-1 text-center text-xs rounded border transition-colors ${
                            isSelected
                              ? 'bg-neutral-900 text-white font-semibold'
                              : 'bg-white text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          {name.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
