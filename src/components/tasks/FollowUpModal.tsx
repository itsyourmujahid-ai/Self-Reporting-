import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { X, Calendar, ArrowRight } from 'lucide-react';
import { formatISODate, parseISODate } from '../../utils/dateUtils';

export const FollowUpModal: React.FC = () => {
  const {
    isFollowUpModalOpen,
    followUpSourceTask,
    closeFollowUpModal,
    completeFollowUpAndScheduleNext,
  } = useWorkPlan();

  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('10:00');
  const [nextTitle, setNextTitle] = useState('');
  const [nextNotes, setNextNotes] = useState('');

  useEffect(() => {
    if (followUpSourceTask) {
      // Suggest date 3 days later or next Monday
      const d = parseISODate(followUpSourceTask.date);
      d.setDate(d.getDate() + 3);
      setNextDate(formatISODate(d));
      setNextTime(followUpSourceTask.startTime || '10:00');
      setNextTitle(`Follow-up: ${followUpSourceTask.contactName || followUpSourceTask.title}`);
      setNextNotes('');
    }
  }, [followUpSourceTask, isFollowUpModalOpen]);

  if (!isFollowUpModalOpen || !followUpSourceTask) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextDate) return;
    completeFollowUpAndScheduleNext(
      followUpSourceTask.id,
      nextDate,
      nextTime,
      nextTitle,
      nextNotes
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Schedule Next Follow-Up
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Completing: {followUpSourceTask.title}
            </p>
          </div>
          <button
            onClick={closeFollowUpModal}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Next Task Title
            </label>
            <input
              type="text"
              required
              value={nextTitle}
              onChange={e => setNextTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Follow-up Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={nextDate}
                  onChange={e => setNextDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Preferred Time
              </label>
              <input
                type="time"
                value={nextTime}
                onChange={e => setNextTime(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-md font-mono focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Next Steps / Agenda Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Check agreement sign-off, confirm invoice, discuss implementation timeline..."
              value={nextNotes}
              onChange={e => setNextNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={closeFollowUpModal}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
            >
              <span>Complete & Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
