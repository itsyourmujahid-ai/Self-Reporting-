import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  getWeekRange,
  formatDisplayDate,
  formatShortDate,
  parseISODate,
  formatISODate,
  getTodayISO,
  getWeekIdentifier,
} from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle2,
  Save,
  Clock,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { WeeklyReflection } from '../../types';

export const WeeklyReportView: React.FC = () => {
  const {
    tasks,
    weeklyReports,
    saveWeeklyReflection,
    getWeeklyStats,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const [activeDate, setActiveDate] = useState<string>(todayISO);

  const weekRange = getWeekRange(activeDate);
  const weekId = getWeekIdentifier(parseISODate(activeDate));

  // Compute live statistics for this week
  const stats = getWeeklyStats(weekRange.startISO, weekRange.endISO);

  // Completed important tasks
  const completedImportantTasks = tasks.filter(
    t =>
      t.date >= weekRange.startISO &&
      t.date <= weekRange.endISO &&
      t.status === 'completed' &&
      t.isImportant
  );

  // Load existing reflection or initialize
  const existingReport = weeklyReports.find(r => r.weekIdentifier === weekId);

  const [reflection, setReflection] = useState<WeeklyReflection>({
    accomplishments: '',
    wentWell: '',
    failedOrDelayed: '',
    causesOfDelays: '',
    nextWeekFocus: '',
  });

  const [savedNotification, setSavedNotification] = useState(false);

  useEffect(() => {
    if (existingReport) {
      setReflection(existingReport.reflection);
    } else {
      setReflection({
        accomplishments: '',
        wentWell: '',
        failedOrDelayed: '',
        causesOfDelays: '',
        nextWeekFocus: '',
      });
    }
  }, [existingReport, weekId]);

  const handlePrevWeek = () => {
    const d = parseISODate(activeDate);
    d.setDate(d.getDate() - 7);
    setActiveDate(formatISODate(d));
  };

  const handleNextWeek = () => {
    const d = parseISODate(activeDate);
    d.setDate(d.getDate() + 7);
    setActiveDate(formatISODate(d));
  };

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    saveWeeklyReflection(weekId, weekRange.startISO, weekRange.endISO, reflection);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Week Selector & Action Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-neutral-200 rounded-md bg-white">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-l-md transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-mono font-semibold border-x border-neutral-200 text-neutral-900">
              {weekId}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-r-md transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-sm font-semibold text-neutral-900">
            {formatShortDate(weekRange.startISO)} – {formatShortDate(weekRange.endISO)}
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
        >
          <Printer className="w-3.5 h-3.5 text-neutral-600" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Printable Report Document */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 space-y-8 shadow-xs">
        {/* Document Header */}
        <div className="border-b border-neutral-200 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Personal Self-Report
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
                Weekly Execution & Performance Review
              </h2>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                Period: {weekRange.startISO} to {weekRange.endISO} ({weekId})
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {stats.completionRate}%
              </div>
              <span className="text-xs font-mono text-neutral-500">Overall Completion</span>
            </div>
          </div>
        </div>

        {/* Quantitative Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-neutral-200 rounded-lg p-4 bg-neutral-50/40">
          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Total Tasks</span>
            <div className="text-xl font-bold font-mono text-neutral-900 tabular-nums mt-0.5">
              {stats.total}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Completed</span>
            <div className="text-xl font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
              {stats.completed}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Pending</span>
            <div className="text-xl font-bold font-mono text-amber-700 tabular-nums mt-0.5">
              {stats.pending}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Skipped</span>
            <div className="text-xl font-bold font-mono text-neutral-500 tabular-nums mt-0.5">
              {stats.skipped}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Rescheduled</span>
            <div className="text-xl font-bold font-mono text-blue-700 tabular-nums mt-0.5">
              {stats.rescheduled}
            </div>
          </div>
        </div>

        {/* Breakdown by Task Type */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
            1. Task Type Breakdown
          </h3>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-right">Planned</th>
                  <th className="py-2 px-3 text-right">Completed</th>
                  <th className="py-2 px-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {Object.entries(stats.byType).map(([typeKey, val]) => {
                  const rate = val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0;
                  return (
                    <tr key={typeKey} className="hover:bg-neutral-50">
                      <td className="py-2 px-3 font-medium capitalize text-neutral-900">
                        {typeKey.replace('_', ' ')}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-600">
                        {val.total}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-900 font-semibold">
                        {val.completed}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-600">
                        {val.total > 0 ? `${rate}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recurring Routine Performance */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
            2. Recurring Routine Delivery
          </h3>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2 px-3">Routine Activity</th>
                  <th className="py-2 px-3 text-right">Target</th>
                  <th className="py-2 px-3 text-right">Delivered</th>
                  <th className="py-2 px-3 text-right">Adherence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {Object.entries(stats.byRoutine).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-center text-neutral-400 italic">
                      No recurring routines recorded for this period.
                    </td>
                  </tr>
                ) : (
                  Object.entries(stats.byRoutine).map(([tag, routine]) => {
                    const rate = routine.total > 0 ? Math.round((routine.completed / routine.total) * 100) : 0;
                    return (
                      <tr key={tag} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-medium text-neutral-900">
                          {routine.title}
                        </td>
                        <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-600">
                          {routine.total}
                        </td>
                        <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-900 font-semibold">
                          {routine.completed}
                        </td>
                        <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-600">
                          {rate}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Important Completed Work */}
        {completedImportantTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
              3. Key Milestones Completed This Week
            </h3>
            <div className="space-y-1.5">
              {completedImportantTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-neutral-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{t.title}</span>
                  <span className="font-mono text-[11px] text-neutral-400">({t.date})</span>
                  {t.notes && <span className="text-neutral-500">— {t.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Weekly Reflection Form */}
        <div className="space-y-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
              4. Weekly Qualitative Reflection
            </h3>
            {existingReport && (
              <span className="text-[11px] font-mono text-neutral-400">
                Last updated: {new Date(existingReport.savedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveReflection} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                What did I accomplish this week?
              </label>
              <textarea
                rows={2}
                placeholder="Key deliveries, finished tasks, closed agreements..."
                value={reflection.accomplishments}
                onChange={e => setReflection({ ...reflection, accomplishments: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What went well?
                </label>
                <textarea
                  rows={2}
                  placeholder="Processes that were smooth, positive habits..."
                  value={reflection.wentWell}
                  onChange={e => setReflection({ ...reflection, wentWell: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What did I fail to complete?
                </label>
                <textarea
                  rows={2}
                  placeholder="Incomplete tasks or skipped activities..."
                  value={reflection.failedOrDelayed}
                  onChange={e => setReflection({ ...reflection, failedOrDelayed: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What caused delays or friction?
                </label>
                <textarea
                  rows={2}
                  placeholder="Distractions, poor estimation, logistical bottlenecks..."
                  value={reflection.causesOfDelays}
                  onChange={e => setReflection({ ...reflection, causesOfDelays: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What should I focus on next week?
                </label>
                <textarea
                  rows={2}
                  placeholder="Top 3 priorities for the upcoming cycle..."
                  value={reflection.nextWeekFocus}
                  onChange={e => setReflection({ ...reflection, nextWeekFocus: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 no-print">
              <div>
                {savedNotification && (
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Weekly reflection saved successfully!
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Weekly Reflection</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
