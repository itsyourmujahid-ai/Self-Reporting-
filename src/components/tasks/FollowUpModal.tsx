import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { X, ArrowRight, CheckCircle2, User, FileText } from 'lucide-react';
import { formatISODate, parseISODate } from '../../utils/dateUtils';

export const FollowUpModal: React.FC = () => {
  const {
    isFollowUpModalOpen,
    followUpSourceTask,
    closeFollowUpModal,
    completeFollowUpAndScheduleNext,
    completeTask,
    isDateOffDay,
    getNextWorkingDayDate,
  } = useWorkPlan();

  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('10:00');
  const [nextTitle, setNextTitle] = useState('');
  const [nextNotes, setNextNotes] = useState('');

  useEffect(() => {
    if (followUpSourceTask) {
      // Suggest date 3 days later, skipping off days
      const d = parseISODate(followUpSourceTask.date);
      d.setDate(d.getDate() + 3);
      setNextDate(getNextWorkingDayDate(formatISODate(d)));
      setNextTime(followUpSourceTask.startTime || '10:00');
      setNextTitle(`Follow-up: ${followUpSourceTask.contactName || followUpSourceTask.title}`);
      setNextNotes('');
    }
  }, [followUpSourceTask, isFollowUpModalOpen, getNextWorkingDayDate]);

  const isOffDay = isDateOffDay(nextDate);

  if (!isFollowUpModalOpen || !followUpSourceTask) return null;

  const handleApplyPresetDays = (days: number) => {
    const base = parseISODate(followUpSourceTask.date);
    base.setDate(base.getDate() + days);
    setNextDate(getNextWorkingDayDate(formatISODate(base)));
  };

  const handleApplyNextMonday = () => {
    const base = parseISODate(followUpSourceTask.date);
    const day = base.getDay();
    const daysUntilMonday = ((1 - day + 7) % 7) || 7;
    base.setDate(base.getDate() + daysUntilMonday);
    setNextDate(getNextWorkingDayDate(formatISODate(base)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextDate) return;
    if (isOffDay) {
      alert('This is an OFF DAY. Tasks cannot be scheduled on this date.');
      return;
    }
    completeFollowUpAndScheduleNext(
      followUpSourceTask.id,
      nextDate,
      nextTime,
      nextTitle,
      nextNotes
    );
  };

  const handleJustComplete = () => {
    completeTask(followUpSourceTask.id);
    closeFollowUpModal();
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
                Follow-Up Workflow
              </h3>
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5 break-words">
              Completing: <strong className="text-[#111111]">{followUpSourceTask.title}</strong>
            </p>
          </div>
          <button
            onClick={closeFollowUpModal}
            className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source context summary */}
        <div className="px-5 py-3 bg-neutral-50 border-b border-[#E5E7EB] text-xs space-y-1 shrink-0">
          {followUpSourceTask.contactName && (
            <div className="flex items-center gap-1.5 text-[#111111]">
              <User className="w-3.5 h-3.5 text-[#4B5563] shrink-0" />
              <span>Contact: <strong>{followUpSourceTask.contactName}</strong></span>
            </div>
          )}
          {followUpSourceTask.notes && (
            <div className="flex items-start gap-1.5 text-[#4B5563] italic">
              <FileText className="w-3.5 h-3.5 text-[#4B5563]/60 shrink-0 mt-0.5" />
              <span className="break-words">&quot;{followUpSourceTask.notes}&quot;</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Next Task Title <span className="text-[#E50914]">*</span>
            </label>
            <input
              type="text"
              required
              value={nextTitle}
              onChange={e => setNextTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Follow-up Date <span className="text-[#E50914]">*</span>
              </label>
              <input
                type="date"
                required
                value={nextDate}
                onChange={e => setNextDate(e.target.value)}
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
                    onClick={() => setNextDate(getNextWorkingDayDate(nextDate))}
                    className="text-xs text-rose-800 underline font-semibold hover:text-rose-950 inline-block cursor-pointer"
                  >
                    Select Next Working Day ({getNextWorkingDayDate(nextDate)})
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                Preferred Time
              </label>
              <input
                type="time"
                value={nextTime}
                onChange={e => setNextTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md font-mono bg-white text-[#111111] focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
              />
            </div>
          </div>

          {/* Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[#4B5563] text-[11px]">Quick presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPresetDays(1)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[11px] font-medium"
            >
              +1 Day
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetDays(3)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[11px] font-medium"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetDays(7)}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[11px] font-medium"
            >
              +1 Week
            </button>
            <button
              type="button"
              onClick={handleApplyNextMonday}
              className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-[#111111] text-[11px] font-medium"
            >
              Next Monday
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              Next Steps / Agenda Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Check agreement sign-off, confirm invoice, discuss implementation timeline..."
              value={nextNotes}
              onChange={e => setNextNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-md bg-white text-[#111111] placeholder:text-[#4B5563]/60 focus:outline-hidden focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] resize-none"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={handleJustComplete}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
              title="Mark this task done without creating another follow-up"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Only (No Next)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={closeFollowUpModal}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-medium text-[#4B5563] hover:text-[#111111] hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isOffDay}
                title={isOffDay ? 'This is an OFF DAY. Tasks cannot be scheduled on this date.' : undefined}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-all active:scale-[0.98] shadow-xs ${
                  isOffDay
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'text-white bg-[#E50914] hover:bg-[#c80812] shadow-[#E50914]/20 cursor-pointer'
                }`}
              >
                <span>Schedule Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
