import React, { useState, useEffect } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import { MONTH_NAMES, getTodayISO } from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle2,
  Save,
  Calendar,
  Briefcase,
  PhoneCall,
  Video,
  PenTool,
} from 'lucide-react';
import { MonthlyReflection } from '../../types';

export const MonthlyReportView: React.FC = () => {
  const {
    tasks,
    monthlyReports,
    saveMonthlyReflection,
    getMonthlyStats,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const [activeMonth, setActiveMonth] = useState<string>(todayISO.slice(0, 7)); // YYYY-MM

  const [yearStr, monthNumStr] = activeMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);

  // Compute live statistics for this month
  const stats = getMonthlyStats(activeMonth);

  // Missed or skipped tasks
  const missedTasks = tasks.filter(
    t => t.date.startsWith(`${activeMonth}-`) && (t.status === 'skipped' || t.status === 'overdue')
  );

  // Completed follow-ups and meetings
  const completedFollowUps = tasks.filter(
    t => t.date.startsWith(`${activeMonth}-`) && t.type === 'follow_up' && t.status === 'completed'
  );

  const completedMeetings = tasks.filter(
    t => t.date.startsWith(`${activeMonth}-`) && t.type === 'meeting' && t.status === 'completed'
  );

  // Load existing reflection
  const existingReport = monthlyReports.find(r => r.monthIdentifier === activeMonth);

  const [reflection, setReflection] = useState<MonthlyReflection>({
    majorAccomplishments: '',
    problems: '',
    missedGoals: '',
    lessonsLearned: '',
    nextMonthPriorities: '',
  });

  const [savedNotification, setSavedNotification] = useState(false);

  useEffect(() => {
    if (existingReport) {
      setReflection(existingReport.reflection);
    } else {
      setReflection({
        majorAccomplishments: '',
        problems: '',
        missedGoals: '',
        lessonsLearned: '',
        nextMonthPriorities: '',
      });
    }
  }, [existingReport, activeMonth]);

  const handlePrevMonth = () => {
    let y = year;
    let m = monthNum - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setActiveMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let y = year;
    let m = monthNum + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setActiveMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    saveMonthlyReflection(activeMonth, reflection);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Month Selector Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-neutral-200 rounded-md bg-white">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-l-md transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-mono font-semibold border-x border-neutral-200 text-neutral-900">
              {MONTH_NAMES[monthNum - 1]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-r-md transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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
                Monthly Work Summary & Audit
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
                {MONTH_NAMES[monthNum - 1]} {year} Personal Self-Report
              </h2>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                Comprehensive data aggregation across all working days
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {stats.completionRate}%
              </div>
              <span className="text-xs font-mono text-neutral-500">Monthly Completion</span>
            </div>
          </div>
        </div>

        {/* High-level Totals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-neutral-200 rounded-lg p-4 bg-neutral-50/40">
          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Total Planned</span>
            <div className="text-xl font-bold font-mono text-neutral-900 tabular-nums mt-0.5">
              {stats.total}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Total Completed</span>
            <div className="text-xl font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
              {stats.completed}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-neutral-500 font-medium">Pending / Active</span>
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

        {/* Specialized Outcomes Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 border border-neutral-200 rounded-lg bg-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
              <span>Follow-ups Completed</span>
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-2">
              {stats.followUpsCompleted}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Active touchpoints and client re-engagements
            </p>
          </div>

          <div className="p-4 border border-neutral-200 rounded-lg bg-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>Meetings Executed</span>
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-2">
              {stats.meetingsCompleted}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Client consultations & internal reviews
            </p>
          </div>

          <div className="p-4 border border-neutral-200 rounded-lg bg-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <PenTool className="w-3.5 h-3.5 text-emerald-600" />
              <span>Content Activities</span>
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-2">
              {stats.contentCompleted}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Posters, articles, carousels & social posts
            </p>
          </div>
        </div>

        {/* Weekly Performance Progression */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
            1. Weekly Performance Progression
          </h3>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3 text-right">Total Planned</th>
                  <th className="py-2.5 px-3 text-right">Completed</th>
                  <th className="py-2.5 px-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {stats.byWeek.map((w, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{w.weekName}</td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-600">
                      {w.total}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-900 font-semibold">
                      {w.completed}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-800">
                      <div className="inline-flex items-center gap-2">
                        <span>{w.completionRate}%</span>
                        <div className="w-16 bg-neutral-200 rounded-full h-1 hidden sm:inline-block">
                          <div
                            className="bg-neutral-900 h-1 rounded-full"
                            style={{ width: `${w.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recurring Routines Performance Scorecard */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
            2. Core Routine Delivery Scorecard
          </h3>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Activity Title</th>
                  <th className="py-2.5 px-3 text-right">Planned Total</th>
                  <th className="py-2.5 px-3 text-right">Completed</th>
                  <th className="py-2.5 px-3 text-right">Delivery Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {Object.entries(stats.byRoutine).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-center text-neutral-400 italic">
                      No recurring routines recorded for this month.
                    </td>
                  </tr>
                ) : (
                  Object.entries(stats.byRoutine).map(([tag, routine]) => {
                    const rate =
                      routine.total > 0 ? Math.round((routine.completed / routine.total) * 100) : 0;
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

        {/* Missed / Skipped Tasks Section */}
        {missedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
              3. Missed or Skipped Tasks Log ({missedTasks.length})
            </h3>
            <div className="border border-neutral-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5 bg-neutral-50/30 text-xs">
              {missedTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-neutral-400">{t.date}</span>
                    <span className="font-medium">{t.title}</span>
                  </div>
                  <span className="capitalize text-[11px] font-mono text-neutral-500">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Monthly Reflection Form */}
        <div className="space-y-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide text-xs">
              4. Monthly Executive Reflection & Audit
            </h3>
            {existingReport && (
              <span className="text-[11px] font-mono text-neutral-400">
                Archived: {new Date(existingReport.savedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveReflection} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Major Accomplishments
              </label>
              <textarea
                rows={3}
                placeholder="High-impact milestones achieved, revenue goals reached, project completions..."
                value={reflection.majorAccomplishments}
                onChange={e => setReflection({ ...reflection, majorAccomplishments: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Problems & Operational Friction
                </label>
                <textarea
                  rows={2}
                  placeholder="Root causes of delays or dropped balls..."
                  value={reflection.problems}
                  onChange={e => setReflection({ ...reflection, problems: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Missed Goals
                </label>
                <textarea
                  rows={2}
                  placeholder="Targets that were planned but unfulfilled..."
                  value={reflection.missedGoals}
                  onChange={e => setReflection({ ...reflection, missedGoals: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Key Lessons Learned
                </label>
                <textarea
                  rows={2}
                  placeholder="Insights on scheduling, workload capacity, batching..."
                  value={reflection.lessonsLearned}
                  onChange={e => setReflection({ ...reflection, lessonsLearned: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Next Month's Core Priorities
                </label>
                <textarea
                  rows={2}
                  placeholder="Primary areas of focus for the upcoming planning cycle..."
                  value={reflection.nextMonthPriorities}
                  onChange={e => setReflection({ ...reflection, nextMonthPriorities: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 no-print">
              <div>
                {savedNotification && (
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Monthly report reflection saved!
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Monthly Report</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
