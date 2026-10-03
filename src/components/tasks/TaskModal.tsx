import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { TaskType, TaskStatus, TaskPriority } from '../../types';
import { X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { addMinutesToTime } from '../../utils/dateUtils';

export const TaskModal: React.FC = () => {
  const {
    isTaskModalOpen,
    editingTask,
    closeTaskModal,
    taskModalDefaultDate,
    taskModalDefaultType,
    addTask,
    updateTask,
    deleteTask,
    isDateOffDay,
    getNextWorkingDayDate,
    settings,
  } = useWorkPlan();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('one_time');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('General');
  const [project, setProject] = useState('');
  const [notes, setNotes] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  // Specialized fields
  const [contactName, setContactName] = useState('');
  const [meetingWith, setMeetingWith] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const [isUnscheduled, setIsUnscheduled] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
    if (editingTask) {
      setTitle(editingTask.title);
      setType(editingTask.type);
      setDate(editingTask.date);
      setStartTime(editingTask.startTime || '');
      setIsUnscheduled(!editingTask.startTime || editingTask.startTime === '');
      setDurationMinutes(editingTask.durationMinutes || 30);
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setCategory(editingTask.category || settings.categories[0] || 'General');
      setProject(editingTask.project || '');
      setNotes(editingTask.notes || '');
      setIsImportant(!!editingTask.isImportant);
      setContactName(editingTask.contactName || '');
      setMeetingWith(editingTask.meetingWith || '');
      setLocationOrLink(editingTask.locationOrLink || '');
      setOutcomeNotes(editingTask.outcomeNotes || '');
      // If editing task has customized advanced fields, show them by default
      if (editingTask.project || editingTask.isImportant || editingTask.status !== 'planned') {
        setShowAdvanced(true);
      }
    } else {
      setTitle('');
      setType(taskModalDefaultType || 'one_time');
      setDate(taskModalDefaultDate || new Date().toISOString().slice(0, 10));
      setStartTime('09:00');
      setIsUnscheduled(false);
      setDurationMinutes(settings.defaultTaskDuration || 30);
      setStatus('planned');
      setPriority(settings.defaultPriority || 'medium');
      setCategory(
        taskModalDefaultType === 'meeting'
          ? 'Meetings'
          : taskModalDefaultType === 'follow_up'
          ? 'Follow-up'
          : settings.categories[0] || 'General'
      );
      setProject(settings.projects[0] || '');
      setNotes('');
      setIsImportant(false);
      setContactName('');
      setMeetingWith('');
      setLocationOrLink('');
      setOutcomeNotes('');
      setShowAdvanced(false);
    }
  }, [editingTask, isTaskModalOpen, taskModalDefaultDate, taskModalDefaultType, settings]);

  const isOffDay = isDateOffDay(date);

  if (!isTaskModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    if (isOffDay) {
      return;
    }

    const finalStartTime = isUnscheduled ? undefined : startTime;
    const endTime = finalStartTime ? addMinutesToTime(finalStartTime, durationMinutes) : undefined;

    const taskPayload = {
      title: title.trim(),
      type,
      date,
      startTime: finalStartTime,
      endTime,
      durationMinutes,
      status,
      priority,
      category,
      project: project.trim() || undefined,
      notes: notes.trim(),
      isImportant,
      contactName: type === 'follow_up' ? contactName.trim() : undefined,
      meetingWith: type === 'meeting' ? meetingWith.trim() : undefined,
      locationOrLink: type === 'meeting' ? locationOrLink.trim() : undefined,
      outcomeNotes: outcomeNotes.trim() || undefined,
    };

    if (editingTask) {
      updateTask(editingTask.id, taskPayload);
    } else {
      addTask(taskPayload);
    }

    closeTaskModal();
  };

  const handleDelete = () => {
    if (editingTask) {
      deleteTask(editingTask.id);
      closeTaskModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E5E7EB] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E5E7EB] bg-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#E50914] shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-[#111111] truncate">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h3>
            <span className="text-xs font-mono text-[#4B5563] shrink-0">
              {date}
            </span>
          </div>
          <button
            type="button"
            onClick={closeTaskModal}
            className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* 1. Title */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Task Title <span className="text-[#E50914]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cold Calls Outreach or Review contract"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] placeholder:text-[#4B5563]/60 focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-colors"
            />
          </div>

          {/* 2. Date & Time */}
          {/* On mobile: stacked cleanly. On desktop: 2 clean columns without squeezing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date field */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Date <span className="text-[#E50914]">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-md font-mono bg-white text-[#111111] focus:outline-hidden transition-colors ${
                  isOffDay
                    ? 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                    : 'border-[#E5E7EB] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]'
                }`}
              />
              {isOffDay && (
                <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 space-y-1 animate-in fade-in-50">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>⚠️</span>
                    <span>This is an OFF DAY.</span>
                  </div>
                  <p className="text-[11px] text-rose-700">Tasks cannot be scheduled on this date.</p>
                  <button
                    type="button"
                    onClick={() => setDate(getNextWorkingDayDate(date))}
                    className="text-xs text-rose-800 underline font-semibold hover:text-rose-950 inline-block cursor-pointer"
                  >
                    Select Next Working Day ({getNextWorkingDayDate(date)})
                  </button>
                </div>
              )}
            </div>

            {/* Time & Duration */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#111111]">Schedule Time</label>
                <label className="text-[11px] text-[#4B5563] cursor-pointer flex items-center gap-1 select-none">
                  <input
                    type="checkbox"
                    checked={isUnscheduled}
                    onChange={e => setIsUnscheduled(e.target.checked)}
                    className="rounded text-[#E50914] focus:ring-[#E50914] w-3.5 h-3.5"
                  />
                  <span>Anytime</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  disabled={isUnscheduled}
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={`w-full px-2.5 py-2 text-sm border rounded-md font-mono transition-colors ${
                    isUnscheduled
                      ? 'bg-neutral-100 text-neutral-400 border-[#E5E7EB]'
                      : 'bg-white border-[#E5E7EB] text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]'
                  }`}
                />
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value, 10) || 15)}
                    className="w-full px-2.5 py-2 text-sm border border-[#E5E7EB] rounded-md font-mono tabular-nums bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-colors pr-7"
                    title="Duration in minutes"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] text-[#4B5563] pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Type & Priority */}
          {/* Responsive single column on mobile, 2 columns on tablet/desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">Task Type</label>
              <select
                value={type}
                onChange={e => {
                  const newType = e.target.value as TaskType;
                  setType(newType);
                  if (newType === 'meeting' && !category) setCategory('Meetings');
                  if (newType === 'follow_up' && !category) setCategory('Follow-up');
                }}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-colors"
              >
                <option value="one_time">One-time Task</option>
                <option value="recurring">Recurring Routine</option>
                <option value="follow_up">Follow-up</option>
                <option value="meeting">Meeting</option>
                <option value="custom">Custom Task</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-colors"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Specialized Type Details (if follow_up or meeting) */}
          {type === 'follow_up' && (
            <div className="p-3.5 bg-neutral-50 rounded-lg border border-[#E5E7EB] space-y-2">
              <label className="block text-xs font-semibold text-[#111111]">
                Contact or Organization
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Company (Sarah Jenkins)"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
              />
            </div>
          )}

          {type === 'meeting' && (
            <div className="p-3.5 bg-neutral-50 rounded-lg border border-[#E5E7EB] space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Meeting With / Attendees
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Miller (Apex Retailers)"
                  value={meetingWith}
                  onChange={e => setMeetingWith(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Location or Video Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Meet or Room 4"
                  value={locationOrLink}
                  onChange={e => setLocationOrLink(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
                />
              </div>
            </div>
          )}

          {/* 4. Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Notes / Action Details
            </label>
            <textarea
              rows={2}
              placeholder="Key context, checklist items, or outcome notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] placeholder:text-[#4B5563]/60 focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] resize-none transition-colors"
            />
          </div>

          {/* 5. Advanced Options Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B5563] hover:text-[#111111] transition-colors py-1 cursor-pointer"
            >
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-neutral-50 rounded-lg border border-[#E5E7EB] space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as TaskStatus)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914]"
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="skipped">Skipped</option>
                      <option value="rescheduled">Rescheduled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914]"
                    >
                      {settings.categories.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">Project (Optional)</label>
                    <select
                      value={project}
                      onChange={e => setProject(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914]"
                    >
                      <option value="">None / Routine</option>
                      {settings.projects.map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 sm:pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#111111] select-none">
                      <input
                        type="checkbox"
                        checked={isImportant}
                        onChange={e => setIsImportant(e.target.checked)}
                        className="rounded text-[#E50914] focus:ring-[#E50914] w-4 h-4"
                      />
                      <span>Mark as Milestone / Important</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E5E7EB] bg-white flex items-center justify-between shrink-0 gap-2">
          {editingTask ? (
            isConfirmingDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md text-xs">
                <span className="text-rose-700 font-semibold">Delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2 py-0.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-1.5 py-0.5 text-neutral-600 hover:text-neutral-900"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={closeTaskModal}
              className="px-3.5 py-2 text-xs font-medium text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isOffDay}
              onClick={handleSubmit}
              title={isOffDay ? 'This is an OFF DAY. Tasks cannot be scheduled on this date.' : undefined}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all active:scale-[0.98] shadow-xs ${
                isOffDay
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'text-white bg-[#E50914] hover:bg-[#c80812] shadow-[#E50914]/20 cursor-pointer'
              }`}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
