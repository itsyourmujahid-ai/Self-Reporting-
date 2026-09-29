import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { TaskType, TaskStatus, TaskPriority, Task } from '../../types';
import { X, Trash2 } from 'lucide-react';
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

  useEffect(() => {
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
    }
  }, [editingTask, isTaskModalOpen, taskModalDefaultDate, taskModalDefaultType, settings]);

  if (!isTaskModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

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
    if (editingTask && window.confirm('Delete this task from your schedule?')) {
      deleteTask(editingTask.id);
      closeTaskModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-900">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h3>
            <span className="text-xs font-mono text-neutral-500">
              {date} · {startTime}
            </span>
          </div>
          <button
            type="button"
            onClick={closeTaskModal}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cold Calls Outreach or Review draft"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Task Type</label>
              <select
                value={type}
                onChange={e => {
                  const newType = e.target.value as TaskType;
                  setType(newType);
                  if (newType === 'meeting' && !category) setCategory('Meetings');
                  if (newType === 'follow_up' && !category) setCategory('Follow-up');
                }}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                <option value="one_time">One-time Task</option>
                <option value="recurring">Recurring Routine</option>
                <option value="follow_up">Follow-up</option>
                <option value="meeting">Meeting</option>
                <option value="custom">Custom Task</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Specialized Type Details */}
          {type === 'follow_up' && (
            <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 space-y-2">
              <label className="block text-xs font-medium text-neutral-700">
                Contact or Organization
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Company (Sarah Jenkins)"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          )}

          {type === 'meeting' && (
            <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Meeting With / Attendees
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Miller (Apex Retailers)"
                  value={meetingWith}
                  onChange={e => setMeetingWith(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Location or Video Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Meet or Room 4"
                  value={locationOrLink}
                  onChange={e => setLocationOrLink(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

          {/* Date, Time, Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">Start Time</label>
                <label className="text-[10px] text-neutral-500 cursor-pointer flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={isUnscheduled}
                    onChange={e => setIsUnscheduled(e.target.checked)}
                    className="rounded text-neutral-900"
                  />
                  Unscheduled
                </label>
              </div>
              <input
                type="time"
                disabled={isUnscheduled}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-sm border rounded-md font-mono focus:outline-hidden focus:ring-1 focus:ring-neutral-900 ${
                  isUnscheduled ? 'bg-neutral-100 text-neutral-400 border-neutral-200' : 'bg-white border-neutral-300'
                }`}
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
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value, 10) || 15)}
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md font-mono tabular-nums focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              />
            </div>
          </div>

          {/* Status & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                {settings.categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project & Important Checkbox */}
          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Project (Optional)</label>
              <select
                value={project}
                onChange={e => setProject(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              >
                <option value="">None / Routine</option>
                {settings.projects.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={e => setIsImportant(e.target.checked)}
                  className="rounded text-neutral-900 focus:ring-neutral-900 w-4 h-4"
                />
                Mark as Important Milestone
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Notes / Action Details</label>
            <textarea
              rows={3}
              placeholder="Context, specific checklist items, or outcome notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
            {editingTask ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeTaskModal}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
