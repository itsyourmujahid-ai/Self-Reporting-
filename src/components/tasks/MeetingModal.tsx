import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { X, CheckCircle } from 'lucide-react';
import { formatISODate, parseISODate } from '../../utils/dateUtils';

export const MeetingModal: React.FC = () => {
  const {
    isMeetingModalOpen,
    meetingSourceTask,
    closeMeetingModal,
    completeMeeting,
    isDateOffDay,
    getNextWorkingDayDate,
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
      setFollowUpDate(getNextWorkingDayDate(formatISODate(d)));
      setFollowUpTime('10:00');
      setFollowUpTitle(`Follow-up after meeting with ${meetingSourceTask.meetingWith || meetingSourceTask.title}`);
    }
  }, [meetingSourceTask, isMeetingModalOpen, getNextWorkingDayDate]);

  const isFollowUpDateOff = scheduleFollowUp && isDateOffDay(followUpDate);

  if (!isMeetingModalOpen || !meetingSourceTask) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduleFollowUp && isFollowUpDateOff) {
      alert('This is an OFF DAY. Tasks cannot be scheduled on this date.');
      return;
    }
    completeMeeting(
      meetingSourceTask.id,
      outcomeNotes,
      scheduleFollowUp ? followUpDate : undefined,
      scheduleFollowUp ? followUpTime : undefined,
      scheduleFollowUp ? followUpTitle : undefined
    );
  };

  const handleApplyPresetDays = (days: number) => {
    const base = parseISODate(meetingSourceTask.date);
    base.setDate(base.getDate() + days);
    setFollowUpDate(getNextWorkingDayDate(formatISODate(base)));
  };

  const handleApplyNextMonday = () => {
    const base = parseISODate(meetingSourceTask.date);
    const day = base.getDay();
    const daysUntilMonday = ((1 - day + 7) % 7) || 7;
    base.setDate(base.getDate() + daysUntilMonday);
    setFollowUpDate(getNextWorkingDayDate(formatISODate(base)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-neutral-950/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E5E7EB] flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E5E7EB] bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914] shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-[#111111]">
                Conclude Meeting
              </h3>
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5 break-words">
              <strong className="text-[#111111]">{meetingSourceTask.title}</strong>
              {meetingSourceTask.meetingWith ? ` · ${meetingSourceTask.meetingWith}` : ''}
            </p>
          </div>
          <button
            onClick={closeMeetingModal}
            className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meeting Details Bar */}
        {(meetingSourceTask.meetingWith || meetingSourceTask.locationOrLink) && (
          <div className="px-5 py-2.5 bg-neutral-50 border-b border-[#E5E7EB] text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-[#4B5563] shrink-0">
            {meetingSourceTask.meetingWith && (
              <div>
                <span className="text-[#4B5563]/70">With:</span>{' '}
                <strong className="text-[#111111]">{meetingSourceTask.meetingWith}</strong>
              </div>
            )}
            {meetingSourceTask.locationOrLink && (
              <div>
                <span className="text-[#4B5563]/70">Location/Link:</span>{' '}
                <span className="font-mono text-[#111111]">{meetingSourceTask.locationOrLink}</span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Meeting Outcome & Decision Notes <span className="text-[#E50914]">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="What was decided? What commitments were made? Next action items..."
              value={outcomeNotes}
              onChange={e => setOutcomeNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] placeholder:text-[#4B5563]/60 focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] resize-none transition-colors"
            />
          </div>

          <div className="pt-2 border-t border-[#E5E7EB]">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#111111] select-none">
              <input
                type="checkbox"
                checked={scheduleFollowUp}
                onChange={e => setScheduleFollowUp(e.target.checked)}
                className="rounded text-[#E50914] focus:ring-[#E50914] w-4 h-4"
              />
              <span>Schedule follow-up task based on this meeting</span>
            </label>

            {scheduleFollowUp && (
              <div className="mt-3 p-3.5 bg-neutral-50 rounded-lg border border-[#E5E7EB] space-y-3 animate-in fade-in-50 duration-150">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Follow-up Action Title <span className="text-[#E50914]">*</span>
                  </label>
                  <input
                    type="text"
                    required={scheduleFollowUp}
                    value={followUpTitle}
                    onChange={e => setFollowUpTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
                      Date <span className="text-[#E50914]">*</span>
                    </label>
                    <input
                      type="date"
                      required={scheduleFollowUp}
                      value={followUpDate}
                      onChange={e => setFollowUpDate(e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-sm border rounded-md font-mono bg-white text-[#111111] focus:outline-hidden ${
                        isFollowUpDateOff ? 'border-rose-500 focus:border-rose-600' : 'border-[#E5E7EB] focus:border-[#E50914]'
                      }`}
                    />
                    {isFollowUpDateOff && (
                      <div className="mt-1 p-1.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 space-y-0.5 animate-in fade-in-50">
                        <span className="font-bold">⚠️ OFF DAY:</span>
                        <p>Tasks cannot be scheduled on this date.</p>
                        <button
                          type="button"
                          onClick={() => setFollowUpDate(getNextWorkingDayDate(followUpDate))}
                          className="underline font-semibold hover:text-rose-950 block cursor-pointer"
                        >
                          Pick Next Working Day ({getNextWorkingDayDate(followUpDate)})
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={followUpTime}
                      onChange={e => setFollowUpTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-[#E5E7EB] rounded-md font-mono bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[#4B5563] text-[11px]">Shortcuts:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDays(1)}
                    className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] hover:bg-neutral-100 text-[#111111] text-[11px] font-medium"
                  >
                    +1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDays(2)}
                    className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] hover:bg-neutral-100 text-[#111111] text-[11px] font-medium"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDays(7)}
                    className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] hover:bg-neutral-100 text-[#111111] text-[11px] font-medium"
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyNextMonday}
                    className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] hover:bg-neutral-100 text-[#111111] text-[11px] font-medium"
                  >
                    Next Monday
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={closeMeetingModal}
              className="px-3.5 py-2 text-xs font-medium text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isFollowUpDateOff}
              title={isFollowUpDateOff ? 'This is an OFF DAY. Tasks cannot be scheduled on this date.' : undefined}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all active:scale-[0.98] shadow-xs ${
                isFollowUpDateOff
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'text-white bg-[#E50914] hover:bg-[#c80812] shadow-[#E50914]/20 cursor-pointer'
              }`}
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
