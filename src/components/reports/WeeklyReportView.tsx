import React, { useState, useEffect, useMemo } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  getWeekRange,
  formatDisplayDate,
  formatShortDate,
  parseISODate,
  formatISODate,
  getTodayISO,
  getWeekIdentifier,
  getDaysOfWeek,
  isWeeklyOff,
  isTaskOverdue,
  DAY_NAMES,
} from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle2,
  Save,
  Clock,
  Download,
  CalendarCheck,
  PhoneCall,
  PenTool,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
} from 'lucide-react';
import { WeeklyReflection, Task } from '../../types';
import { AppLogo } from '../common/AppLogo';

export const WeeklyReportView: React.FC = () => {
  const {
    tasks,
    weeklyReports,
    saveWeeklyReflection,
    settings,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const [activeDate, setActiveDate] = useState<string>(todayISO);

  const weekRange = useMemo(() => getWeekRange(activeDate), [activeDate]);
  const weekId = useMemo(() => getWeekIdentifier(parseISODate(activeDate)), [activeDate]);

  // Tasks belonging to this week
  const weekTasks = useMemo(() => {
    return tasks.filter(
      t => t.date >= weekRange.startISO && t.date <= weekRange.endISO && (!settings.startDate || t.date >= settings.startDate)
    );
  }, [tasks, weekRange.startISO, weekRange.endISO, settings.startDate]);

  // Aggregate quantitative metrics (Requirement 4)
  const totalTasks = weekTasks.length;
  const completedTasks = weekTasks.filter(t => t.status === 'completed').length;
  const pendingTasks = weekTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length;
  const skippedTasks = weekTasks.filter(t => t.status === 'skipped').length;
  const rescheduledTasks = weekTasks.filter(t => t.status === 'rescheduled').length;
  const overdueTasks = weekTasks.filter(t => isTaskOverdue(t.date, t.startTime, t.status)).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Daily breakdown for all 7 days of the week (Requirement 5)
  const daysOfWeek = useMemo(() => {
    const dates = getDaysOfWeek(weekRange.start);
    return dates.map(dateISO => {
      const dObj = parseISODate(dateISO);
      const dayName = DAY_NAMES[dObj.getDay()];
      const dayTasks = weekTasks.filter(t => t.date === dateISO);
      const isOff = isWeeklyOff(dateISO, settings.weeklyOffDays);

      const dTotal = dayTasks.length;
      const dCompleted = dayTasks.filter(t => t.status === 'completed').length;
      const dPending = dayTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length;
      const dSkipped = dayTasks.filter(t => t.status === 'skipped').length;
      const dOverdue = dayTasks.filter(t => isTaskOverdue(t.date, t.startTime, t.status)).length;
      const dRate = dTotal > 0 ? Math.round((dCompleted / dTotal) * 100) : 0;

      return {
        dateISO,
        dayName,
        isOff,
        total: dTotal,
        completed: dCompleted,
        pending: dPending,
        skipped: dSkipped,
        overdue: dOverdue,
        completionRate: dRate,
        tasks: dayTasks,
      };
    });
  }, [weekRange.start, weekTasks, settings.weeklyOffDays]);

  // Weekly Task Type / Routine Breakdown (Requirement 6)
  const routineBreakdown = useMemo(() => {
    const routineMap: Record<string, { title: string; category: string; planned: number; completed: number; pending: number }> = {};

    weekTasks.forEach(t => {
      const key = t.recurrenceTag || t.title;
      if (!routineMap[key]) {
        routineMap[key] = {
          title: t.title,
          category: t.category || t.type,
          planned: 0,
          completed: 0,
          pending: 0,
        };
      }
      routineMap[key].planned += 1;
      if (t.status === 'completed') {
        routineMap[key].completed += 1;
      } else if (t.status === 'planned' || t.status === 'in_progress') {
        routineMap[key].pending += 1;
      }
    });

    return Object.values(routineMap).sort((a, b) => b.planned - a.planned);
  }, [weekTasks]);

  // Weekly Meeting & Follow-up Summary (Requirement 7)
  const meetingSummary = useMemo(() => {
    const meetingTasks = weekTasks.filter(t => t.type === 'meeting');
    return {
      scheduled: meetingTasks.length,
      completed: meetingTasks.filter(t => t.status === 'completed').length,
      skipped: meetingTasks.filter(t => t.status === 'skipped').length,
      rescheduled: meetingTasks.filter(t => t.status === 'rescheduled').length,
      tasks: meetingTasks,
    };
  }, [weekTasks]);

  const followUpSummary = useMemo(() => {
    const followUpTasks = weekTasks.filter(t => t.type === 'follow_up');
    return {
      scheduled: followUpTasks.length,
      completed: followUpTasks.filter(t => t.status === 'completed').length,
      pending: followUpTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length,
      tasks: followUpTasks,
    };
  }, [weekTasks]);

  // Weekly Content Summary (Requirement 8)
  const contentSummary = useMemo(() => {
    const contentTasks = weekTasks.filter(
      t =>
        t.category === 'Content' ||
        ['daily_poster', 'ig_carousel', 'weekly_reel', 'linkedin_post', 'x_post', 'blog_post'].includes(t.recurrenceTag || '')
    );

    const grouped: Record<string, { title: string; scheduled: number; completed: number; remaining: number }> = {};

    contentTasks.forEach(t => {
      const key = t.title;
      if (!grouped[key]) {
        grouped[key] = {
          title: t.title,
          scheduled: 0,
          completed: 0,
          remaining: 0,
        };
      }
      grouped[key].scheduled += 1;
      if (t.status === 'completed') {
        grouped[key].completed += 1;
      } else {
        grouped[key].remaining += 1;
      }
    });

    return Object.values(grouped);
  }, [weekTasks]);

  // Completed important tasks / milestones
  const completedImportantTasks = useMemo(() => {
    return weekTasks.filter(t => t.status === 'completed' && t.isImportant);
  }, [weekTasks]);

  // Reflection data management (Requirement 9 & 10)
  const existingReport = weeklyReports.find(r => r.weekIdentifier === weekId);

  const [reflection, setReflection] = useState<WeeklyReflection>({
    wentWell: '',
    failedOrDelayed: '',
    nextWeekFocus: '',
    importantNotes: '',
    accomplishments: '',
  });

  const [savedNotification, setSavedNotification] = useState(false);

  useEffect(() => {
    if (existingReport) {
      setReflection({
        wentWell: existingReport.reflection.wentWell || '',
        failedOrDelayed: existingReport.reflection.failedOrDelayed || '',
        nextWeekFocus: existingReport.reflection.nextWeekFocus || '',
        importantNotes: existingReport.reflection.importantNotes || '',
        accomplishments: existingReport.reflection.accomplishments || '',
      });
    } else {
      setReflection({
        wentWell: '',
        failedOrDelayed: '',
        nextWeekFocus: '',
        importantNotes: '',
        accomplishments: '',
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

  const handleCurrentWeek = () => {
    setActiveDate(todayISO);
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

  // CSV Export (Requirement 23)
  const handleExportCSV = () => {
    const rows: (string | number)[][] = [];

    // Header
    rows.push(['Weekly Self-Report', weekId]);
    rows.push(['Date Range', `${weekRange.startISO} to ${weekRange.endISO}`]);
    rows.push([]);

    // Summary
    rows.push(['WEEKLY SUMMARY METRICS']);
    rows.push(['Total Tasks', totalTasks]);
    rows.push(['Completed', completedTasks]);
    rows.push(['Pending', pendingTasks]);
    rows.push(['Skipped', skippedTasks]);
    rows.push(['Overdue', overdueTasks]);
    rows.push(['Rescheduled', rescheduledTasks]);
    rows.push(['Completion Rate', `${completionRate}%`]);
    rows.push([]);

    // Daily breakdown
    rows.push(['DAILY BREAKDOWN']);
    rows.push(['Date', 'Day', 'Classification', 'Total Tasks', 'Completed', 'Pending', 'Skipped', 'Completion Rate']);
    daysOfWeek.forEach(d => {
      const classStr = d.isOff ? (d.total > 0 ? 'Off Day (Work Scheduled)' : 'OFF DAY') : 'Working Day';
      rows.push([d.dateISO, d.dayName, classStr, d.total, d.completed, d.pending, d.skipped, `${d.completionRate}%`]);
    });
    rows.push([]);

    // Content summary
    rows.push(['CONTENT ACTIVITIES SUMMARY']);
    rows.push(['Content Title', 'Scheduled', 'Completed', 'Remaining', 'Delivery Rate']);
    contentSummary.forEach(c => {
      const rate = c.scheduled > 0 ? `${Math.round((c.completed / c.scheduled) * 100)}%` : '0%';
      rows.push([c.title, c.scheduled, c.completed, c.remaining, rate]);
    });
    rows.push([]);

    // Reflection
    rows.push(['WEEKLY REFLECTION']);
    rows.push(['What went well?', reflection.wentWell]);
    rows.push(['What was not completed?', reflection.failedOrDelayed]);
    rows.push(['What should I improve next week?', reflection.nextWeekFocus]);
    rows.push(['Important notes', reflection.importantNotes || '']);

    const csvContent = rows
      .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Weekly_Report_${weekId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Week Selector Bar & Action Controls (no-print) */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs no-print">
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-50 rounded-l-md transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-mono font-semibold border-x border-[#E5E7EB] text-[#111111]">
              {weekId}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-[#4B5563] hover:text-[#111111] hover:bg-neutral-50 rounded-r-md transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs sm:text-sm font-semibold text-[#111111]">
            {formatShortDate(weekRange.startISO)} – {formatShortDate(weekRange.endISO)}, {parseISODate(weekRange.startISO).getFullYear()}
          </div>

          <button
            onClick={handleCurrentWeek}
            className="text-xs text-[#4B5563] hover:text-[#111111] font-medium px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            This Week
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111111] bg-white border border-[#E5E7EB] rounded-md hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
            title="Download report data as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-[#4B5563]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111111] bg-white border border-[#E5E7EB] rounded-md hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
            title="Print or save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#4B5563]" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-8 space-y-8 shadow-xs">
        {/* Document Header */}
        <div className="border-b border-[#E5E7EB] pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AppLogo size="lg" variant="badge" />
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#4B5563] font-semibold">
                  Personal Self-Report
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111] mt-0.5">
                  Weekly Execution & Performance Review
                </h2>
                <p className="text-xs text-[#4B5563] mt-1 font-mono">
                  {formatDisplayDate(weekRange.startISO)} → {formatDisplayDate(weekRange.endISO)} ({weekId})
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E5E7EB]">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#111111] tabular-nums">
                {completionRate}%
              </div>
              <span className="text-xs font-mono text-[#4B5563]">
                Weekly Completion Rate
              </span>
            </div>
          </div>
        </div>

        {/* 1. Quantitative Summary Strip (Requirement 4) */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
              <span className="text-[11px] text-neutral-500 font-medium block">Total Tasks</span>
              <span className="text-xl font-bold font-mono text-neutral-900 tabular-nums mt-0.5 block">
                {totalTasks}
              </span>
            </div>

            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
              <span className="text-[11px] text-emerald-700 font-medium block">Completed</span>
              <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums mt-0.5 block">
                {completedTasks}
              </span>
            </div>

            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
              <span className="text-[11px] text-neutral-600 font-medium block">Remaining</span>
              <span className="text-xl font-bold font-mono text-neutral-900 tabular-nums mt-0.5 block">
                {pendingTasks}
              </span>
            </div>

            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
              <span className="text-[11px] text-neutral-500 font-medium block">Skipped</span>
              <span className="text-xl font-bold font-mono text-neutral-600 tabular-nums mt-0.5 block">
                {skippedTasks}
              </span>
            </div>

            <div className={`border rounded-lg p-3 ${overdueTasks > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-neutral-50/50 border-neutral-200'}`}>
              <span className={`text-[11px] font-medium block ${overdueTasks > 0 ? 'text-rose-700' : 'text-neutral-500'}`}>
                Overdue
              </span>
              <span className={`text-xl font-bold font-mono tabular-nums mt-0.5 block ${overdueTasks > 0 ? 'text-rose-700' : 'text-neutral-900'}`}>
                {overdueTasks}
              </span>
            </div>

            <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
              <span className="text-[11px] text-blue-700 font-medium block">Rescheduled</span>
              <span className="text-xl font-bold font-mono text-blue-700 tabular-nums mt-0.5 block">
                {rescheduledTasks}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#E50914] h-2 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
            />
          </div>
        </div>

        {/* 2. Daily Breakdown (Requirement 5) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              1. Daily Performance Breakdown
            </h3>
            <span className="text-xs font-mono text-neutral-500">
              7-Day Schedule Audit
            </span>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date & Day</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Completed</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                  <th className="py-2.5 px-3 text-right">Skipped</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {daysOfWeek.map(d => {
                  const isCurrentDay = d.dateISO === todayISO;
                  return (
                    <tr
                      key={d.dateISO}
                      className={`hover:bg-neutral-50/60 ${isCurrentDay ? 'bg-neutral-50/80 font-medium' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900">{d.dayName}</span>
                          <span className="font-mono text-neutral-400 text-[11px]">
                            {formatShortDate(d.dateISO)}
                          </span>
                          {isCurrentDay && (
                            <span className="text-[10px] font-bold text-neutral-700 bg-neutral-200 px-1.5 py-0.2 rounded">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        {d.isOff ? (
                          d.total > 0 ? (
                            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              OFF DAY ({d.total} active)
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                              OFF DAY
                            </span>
                          )
                        ) : d.total === 0 ? (
                          <span className="text-[11px] text-neutral-400 italic">No tasks</span>
                        ) : (
                          <span className="text-[11px] text-neutral-600">Workday</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-900">
                        {d.total}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-right tabular-nums text-emerald-700 font-semibold">
                        {d.completed}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-600">
                        {d.pending}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-500">
                        {d.skipped}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-right tabular-nums">
                        {d.total > 0 ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <span className="font-semibold text-neutral-900">{d.completionRate}%</span>
                            <div className="w-12 bg-neutral-100 rounded-full h-1 hidden sm:inline-block">
                              <div
                                className="bg-neutral-800 h-1 rounded-full"
                                style={{ width: `${d.completionRate}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Content Summary (Requirement 8) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-neutral-700" />
              <span>2. Weekly Content Production Summary</span>
            </h3>
            <span className="text-xs font-mono text-neutral-500">
              {contentSummary.length} Deliverable Types
            </span>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Content Item</th>
                  <th className="py-2.5 px-3 text-right">Scheduled</th>
                  <th className="py-2.5 px-3 text-right">Completed</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-3 text-right">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {contentSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 px-3 text-center text-neutral-400 italic">
                      No content production tasks scheduled for this week.
                    </td>
                  </tr>
                ) : (
                  contentSummary.map(c => {
                    const rate = c.scheduled > 0 ? Math.round((c.completed / c.scheduled) * 100) : 0;
                    return (
                      <tr key={c.title} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-3 font-medium text-neutral-900">{c.title}</td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-600">
                          {c.scheduled}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-900 font-semibold">
                          {c.completed}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-500">
                          {c.remaining}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums font-semibold text-neutral-800">
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

        {/* 4. Meetings & Follow-ups Summary (Requirement 7) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meetings Card */}
          <div className="border border-neutral-200 rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  Meetings Summary
                </h4>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {meetingSummary.completed} / {meetingSummary.scheduled} Done
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-neutral-50 p-2 rounded border border-neutral-100">
                <span className="text-[10px] text-neutral-400 block font-sans">Scheduled</span>
                <span className="font-bold text-neutral-900">{meetingSummary.scheduled}</span>
              </div>
              <div className="bg-blue-50/50 p-2 rounded border border-blue-100 text-blue-800">
                <span className="text-[10px] block font-sans">Completed</span>
                <span className="font-bold">{meetingSummary.completed}</span>
              </div>
              <div className="bg-neutral-50 p-2 rounded border border-neutral-100">
                <span className="text-[10px] text-neutral-400 block font-sans">Skipped</span>
                <span className="font-bold text-neutral-600">{meetingSummary.skipped}</span>
              </div>
              <div className="bg-neutral-50 p-2 rounded border border-neutral-100">
                <span className="text-[10px] text-neutral-400 block font-sans">Resched</span>
                <span className="font-bold text-neutral-600">{meetingSummary.rescheduled}</span>
              </div>
            </div>

            {meetingSummary.tasks.length > 0 && (
              <div className="space-y-1.5 pt-1 text-xs">
                {meetingSummary.tasks.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-neutral-700 py-0.5">
                    <span className="truncate pr-2 font-medium">{m.title}</span>
                    <span className="font-mono text-[11px] text-neutral-500 shrink-0 capitalize">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Follow-ups Card */}
          <div className="border border-neutral-200 rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  Follow-ups Summary
                </h4>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {followUpSummary.completed} / {followUpSummary.scheduled} Done
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-neutral-50 p-2 rounded border border-neutral-100">
                <span className="text-[10px] text-neutral-400 block font-sans">Scheduled</span>
                <span className="font-bold text-neutral-900">{followUpSummary.scheduled}</span>
              </div>
              <div className="bg-purple-50/50 p-2 rounded border border-purple-100 text-purple-800">
                <span className="text-[10px] block font-sans">Completed</span>
                <span className="font-bold">{followUpSummary.completed}</span>
              </div>
              <div className="bg-neutral-50 p-2 rounded border border-neutral-100">
                <span className="text-[10px] text-neutral-400 block font-sans">Pending</span>
                <span className="font-bold text-neutral-700">{followUpSummary.pending}</span>
              </div>
            </div>

            {followUpSummary.tasks.length > 0 && (
              <div className="space-y-1.5 pt-1 text-xs">
                {followUpSummary.tasks.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-neutral-700 py-0.5">
                    <span className="truncate pr-2 font-medium">{f.title}</span>
                    <span className="font-mono text-[11px] text-neutral-500 shrink-0 capitalize">
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. Routine & Task Breakdown (Requirement 6) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
            3. Task & Routine Workload Distribution
          </h3>

          <div className="border border-neutral-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Activity Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Planned</th>
                  <th className="py-2.5 px-3 text-right">Completed</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {routineBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 px-3 text-center text-neutral-400 italic">
                      No task activity recorded for this period.
                    </td>
                  </tr>
                ) : (
                  routineBreakdown.map(r => {
                    const rate = r.planned > 0 ? Math.round((r.completed / r.planned) * 100) : 0;
                    return (
                      <tr key={r.title} className="hover:bg-neutral-50">
                        <td className="py-2.5 px-3 font-medium text-neutral-900">{r.title}</td>
                        <td className="py-2.5 px-3 text-neutral-500 capitalize">{r.category}</td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-600">
                          {r.planned}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-900 font-semibold">
                          {r.completed}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-500">
                          {r.pending}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums font-semibold text-neutral-800">
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

        {/* 6. Completed Milestones Highlight */}
        {completedImportantTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              4. Key Milestones Completed This Week
            </h3>
            <div className="space-y-1.5 border border-neutral-200 rounded-lg p-3 bg-neutral-50/30">
              {completedImportantTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-neutral-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-neutral-900">{t.title}</span>
                  <span className="font-mono text-[11px] text-neutral-400">({t.date})</span>
                  {t.notes && <span className="text-neutral-500 truncate">— {t.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Weekly Qualitative Reflection (Requirement 9 & 10) */}
        <div className="space-y-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                5. Weekly Qualitative Reflection
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Record subjective analysis and friction points. This reflection is saved against {weekId}.
              </p>
            </div>
            {existingReport && (
              <span className="text-[11px] font-mono text-neutral-400">
                Last saved: {new Date(existingReport.savedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveReflection} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What went well?
                </label>
                <textarea
                  rows={3}
                  placeholder="Processes that were smooth, positive routines, effective execution..."
                  value={reflection.wentWell}
                  onChange={e => setReflection({ ...reflection, wentWell: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What was not completed?
                </label>
                <textarea
                  rows={3}
                  placeholder="Incomplete tasks, delayed deliverables, missed routines..."
                  value={reflection.failedOrDelayed}
                  onChange={e => setReflection({ ...reflection, failedOrDelayed: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What should I improve next week?
                </label>
                <textarea
                  rows={3}
                  placeholder="Scheduling adjustments, focus areas, batching improvements..."
                  value={reflection.nextWeekFocus}
                  onChange={e => setReflection({ ...reflection, nextWeekFocus: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Important Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Observations, client feedback, personal takeaways..."
                  value={reflection.importantNotes || ''}
                  onChange={e => setReflection({ ...reflection, importantNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 no-print">
              <div>
                {savedNotification && (
                  <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Weekly reflection saved successfully for {weekId}!
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#c80812] active:scale-[0.98] rounded-md transition-all shadow-xs shadow-[#E50914]/20 cursor-pointer"
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
