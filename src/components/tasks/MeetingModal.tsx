import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { X, CheckCircle, Calendar } from 'lucide-react';
import { formatISODate, parseISODate } from '../../utils/dateUtils';

export const MeetingModal: React.FC = () => {
  const {
    isMeetingModalOpen,
    meetingSourceTask,
    closeMeetingModal,
    completeMeeting,
  } = useWorkPlan();

  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [followUpTitle, setFollowUpTitle] = useState('');

  useEffect(() => {
    if (meetingSourceTask) {
      setOutcomeNotes(meetingSourceTask.outcomeNotes || '');
      setScheduleFollowUp(false);
      const d = parseISODate(meetingSourceTask.date);
      d.setDate(d.getDate() + 2);
      setFollowUpDate(formatISODate(d));
      setFollowUpTime('10:00');
      setFollowUpTitle(`Follow-up after meeting with ${meetingSourceTask.meetingWith || meetingSourceTask.title}`);
    }
  }, [meetingSourceTask, isMeetingModalOpen]);

  if (!isMeetingModalOpen || !meetingSourceTask) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeMeeting(
      meetingSourceTask.id,
      outcomeNotes,
      scheduleFollowUp ? followUpDate : undefined,
      scheduleFollowUp ? followUpTime : undefined,
      scheduleFollowUp ? followUpTitle : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/50">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Conclude Meeting
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {meetingSourceTask.title}
              {meetingSourceTask.meetingWith ? ` · ${meetingSourceTask.meetingWith}` : ''}
            </p>
          </div>
          <button
            onClick={closeMeetingModal}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Meeting Outcome & Decision Notes
            </label>
            <textarea
              rows={4}
              required
              placeholder="What was decided? What commitments were made? Next action items..."
              value={outcomeNotes}
              onChange={e => setOutcomeNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900 bg-white resize-none"
            />
          </div>

          <div className="pt-2 border-t border-neutral-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={scheduleFollowUp}
                onChange={e => setScheduleFollowUp(e.target.checked)}
                className="rounded text-neutral-900 focus:ring-neutral-900 w-4 h-4"
              />
              Schedule follow-up task based on meeting
            </label>

            {scheduleFollowUp && (
              <div className="mt-3 p-3 bg-neutral-50 rounded-md border border-neutral-200 space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Follow-up Action Title
                  </label>
                  <input
                    type="text"
                    required={scheduleFollowUp}
                    value={followUpTitle}
                    onChange={e => setFollowUpTitle(e.target.value)}
                    className="w-full px-2.5 py-1 text-sm border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required={scheduleFollowUp}
                      value={followUpDate}
                      onChange={e => setFollowUpDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 rounded-md font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={e => setFollowUpTime(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 rounded-md font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={closeMeetingModal}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Record Outcome & Complete</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
