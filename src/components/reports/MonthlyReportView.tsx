import React, { useState, useEffect, useMemo } from 'react';
import { useWorkPlan } from '../../context/WorkPlanContext';
import {
  MONTH_NAMES,
  DAY_NAMES,
  getTodayISO,
  parseISODate,
  formatISODate,
  formatShortDate,
  formatDisplayDate,
  isWeeklyOff,
  isTaskOverdue,
} from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle2,
  Save,
  Download,
  CalendarCheck,
  PhoneCall,
  PenTool,
  Calendar,
  Layers,
  ArrowRight,
  Briefcase,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { MonthlyReflection } from '../../types';

export const MonthlyReportView: React.FC = () => {
  const {
    tasks,
    monthlyReports,
    saveMonthlyReflection,
    settings,
    openMonthlySetup,
    setCurrentMonth,
    setActiveNavTab,
    setPlannerSubTab,
  } = useWorkPlan();

  const todayISO = getTodayISO();
  const [activeMonth, setActiveMonth] = useState<string>(todayISO.slice(0, 7)); // YYYY-MM

  const [yearStr, monthNumStr] = activeMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Tasks belonging to this month
  const monthPrefix = `${activeMonth}-`;
  const monthTasks = useMemo(() => {
    return tasks.filter(t => t.date.startsWith(monthPrefix));
  }, [tasks, monthPrefix]);

  // Aggregate quantitative metrics (Requirement 12)
  const totalTasks = monthTasks.length;
  const completedTasks = monthTasks.filter(t => t.status === 'completed').length;
  const pendingTasks = monthTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length;
  const skippedTasks = monthTasks.filter(t => t.status === 'skipped').length;
  const rescheduledTasks = monthTasks.filter(t => t.status === 'rescheduled').length;
  const overdueTasks = monthTasks.filter(t => isTaskOverdue(t.date, t.startTime, t.status)).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Monthly Daily Performance: All dates 1..daysInMonth (Requirement 13)
  const dailyPerformance = useMemo(() => {
    const list: Array<{
      dateISO: string;
      dayNumber: number;
      dayName: string;
      isOff: boolean;
      total: number;
      completed: number;
      pending: number;
      skipped: number;
      overdue: number;
      completionRate: number;
      tasks: typeof monthTasks;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateISO = `${activeMonth}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(year, monthNum - 1, d);
      const dayName = DAY_NAMES[dObj.getDay()];
      const isOff = isWeeklyOff(dateISO, settings.weeklyOffDays);

      const dTasks = monthTasks.filter(t => t.date === dateISO);
      const dTotal = dTasks.length;
      const dComp = dTasks.filter(t => t.status === 'completed').length;
      const dPend = dTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length;
      const dSkip = dTasks.filter(t => t.status === 'skipped').length;
      const dOver = dTasks.filter(t => isTaskOverdue(t.date, t.startTime, t.status)).length;
      const dRate = dTotal > 0 ? Math.round((dComp / dTotal) * 100) : 0;

      list.push({
        dateISO,
        dayNumber: d,
        dayName,
        isOff,
        total: dTotal,
        completed: dComp,
        pending: dPend,
        skipped: dSkip,
        overdue: dOver,
        completionRate: dRate,
        tasks: dTasks,
      });
    }

    return list;
  }, [activeMonth, daysInMonth, monthTasks, monthNum, year, settings.weeklyOffDays]);

  // Weekly Progression for Work Overview (Requirement 17)
  const weeklyProgression = useMemo(() => {
    const weeks: Array<{
      weekLabel: string;
      startDay: number;
      endDay: number;
      total: number;
      completed: number;
      completionRate: number;
    }> = [];

    const totalWeeks = Math.ceil(daysInMonth / 7);
    for (let w = 0; w < totalWeeks; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min((w + 1) * 7, daysInMonth);
      const startISO = `${activeMonth}-${String(startDay).padStart(2, '0')}`;
      const endISO = `${activeMonth}-${String(endDay).padStart(2, '0')}`;

      const wTasks = monthTasks.filter(t => t.date >= startISO && t.date <= endISO);
      const wTotal = wTasks.length;
      const wComp = wTasks.filter(t => t.status === 'completed').length;
      const wRate = wTotal > 0 ? Math.round((wComp / wTotal) * 100) : 0;

      weeks.push({
        weekLabel: `Week ${w + 1} (${startDay}–${endDay})`,
        startDay,
        endDay,
        total: wTotal,
        completed: wComp,
        completionRate: wRate,
      });
    }

    return weeks;
  }, [activeMonth, daysInMonth, monthTasks]);

  // Task & Routine Breakdown (Requirement 14)
  const routineBreakdown = useMemo(() => {
    const routineMap: Record<string, { title: string; category: string; planned: number; completed: number; pending: number }> = {};

    monthTasks.forEach(t => {
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
  }, [monthTasks]);

  // Monthly Content Summary (Requirement 15)
  const contentSummary = useMemo(() => {
    const contentTasks = monthTasks.filter(
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
  }, [monthTasks]);

  // Monthly Meetings & Follow-ups Summary (Requirement 16)
  const meetingSummary = useMemo(() => {
    const meetingTasks = monthTasks.filter(t => t.type === 'meeting');
    return {
      scheduled: meetingTasks.length,
      completed: meetingTasks.filter(t => t.status === 'completed').length,
      skipped: meetingTasks.filter(t => t.status === 'skipped').length,
      rescheduled: meetingTasks.filter(t => t.status === 'rescheduled').length,
      tasks: meetingTasks,
    };
  }, [monthTasks]);

  const followUpSummary = useMemo(() => {
    const followUpTasks = monthTasks.filter(t => t.type === 'follow_up');
    // Follow-ups generated from meetings (where parentTaskId references a meeting)
    const generatedFromMeetings = followUpTasks.filter(f => {
      if (!f.parentTaskId) return false;
      const parent = tasks.find(t => t.id === f.parentTaskId);
      return parent?.type === 'meeting';
    }).length;

    return {
      scheduled: followUpTasks.length,
      completed: followUpTasks.filter(t => t.status === 'completed').length,
      pending: followUpTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length,
      generatedFromMeetings,
      tasks: followUpTasks,
    };
  }, [monthTasks, tasks]);

  // Missed or Skipped Tasks Log
  const missedOrSkippedTasks = useMemo(() => {
    return monthTasks.filter(t => t.status === 'skipped' || t.status === 'overdue');
  }, [monthTasks]);

  // Reflection data management (Requirement 18)
  const existingReport = monthlyReports.find(r => r.monthIdentifier === activeMonth);

  const [reflection, setReflection] = useState<MonthlyReflection>({
    majorAccomplishments: '',
    problems: '',
    missedGoals: '',
    lessonsLearned: '',
    nextMonthPriorities: '',
    importantNotes: '',
  });

  const [savedNotification, setSavedNotification] = useState(false);

  useEffect(() => {
    if (existingReport) {
      setReflection({
        majorAccomplishments: existingReport.reflection.majorAccomplishments || '',
        problems: existingReport.reflection.problems || '',
        missedGoals: existingReport.reflection.missedGoals || '',
        lessonsLearned: existingReport.reflection.lessonsLearned || '',
        nextMonthPriorities: existingReport.reflection.nextMonthPriorities || '',
        importantNotes: existingReport.reflection.importantNotes || '',
      });
    } else {
      setReflection({
        majorAccomplishments: '',
        problems: '',
        missedGoals: '',
        lessonsLearned: '',
        nextMonthPriorities: '',
        importantNotes: '',
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

  const handleCurrentMonth = () => {
    setActiveMonth(todayISO.slice(0, 7));
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

  // Plan Next Month Action (Requirement 19)
  const handlePlanNextMonth = () => {
    let nextY = year;
    let nextM = monthNum + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextMonthISO = `${nextY}-${String(nextM).padStart(2, '0')}`;
    setCurrentMonth(nextMonthISO);
    setActiveNavTab('planner');
    setPlannerSubTab('monthly');
    openMonthlySetup();
  };

  // CSV Export (Requirement 23)
  const handleExportCSV = () => {
    const rows: (string | number)[][] = [];

    // Header
    rows.push(['Monthly Self-Report', `${MONTH_NAMES[monthNum - 1]} ${year}`]);
    rows.push(['Period Identifier', activeMonth]);
    rows.push([]);

    // Summary
    rows.push(['MONTHLY SUMMARY METRICS']);
    rows.push(['Total Tasks', totalTasks]);
    rows.push(['Completed', completedTasks]);
    rows.push(['Pending', pendingTasks]);
    rows.push(['Skipped', skippedTasks]);
    rows.push(['Overdue', overdueTasks]);
    rows.push(['Rescheduled', rescheduledTasks]);
    rows.push(['Completion Rate', `${completionRate}%`]);
    rows.push([]);

    // Daily breakdown
    rows.push(['MONTHLY DAILY PERFORMANCE']);
    rows.push(['Date', 'Day', 'Classification', 'Total Tasks', 'Completed', 'Pending', 'Skipped', 'Completion Rate']);
    dailyPerformance.forEach(d => {
      const classStr = d.isOff ? (d.total > 0 ? 'Off Day (Work Scheduled)' : 'OFF DAY') : 'Working Day';
      rows.push([d.dateISO, d.dayName, classStr, d.total, d.completed, d.pending, d.skipped, `${d.completionRate}%`]);
    });
    rows.push([]);

    // Content summary
    rows.push(['CONTENT PRODUCTION SUMMARY']);
    rows.push(['Content Title', 'Scheduled', 'Completed', 'Remaining', 'Delivery Rate']);
    contentSummary.forEach(c => {
      const rate = c.scheduled > 0 ? `${Math.round((c.completed / c.scheduled) * 100)}%` : '0%';
      rows.push([c.title, c.scheduled, c.completed, c.remaining, rate]);
    });
    rows.push([]);

    // Reflection
    rows.push(['MONTHLY EXECUTIVE REFLECTION']);
    rows.push(['Major Accomplishments', reflection.majorAccomplishments]);
    rows.push(['Missed Goals', reflection.missedGoals]);
    rows.push(['Problems & Friction', reflection.problems]);
    rows.push(['Lessons Learned', reflection.lessonsLearned]);
    rows.push(['Next Month Priorities', reflection.nextMonthPriorities]);
    rows.push(['Important Notes', reflection.importantNotes || '']);

    const csvContent = rows
      .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Report_${activeMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Month Selector Bar & Action Controls (no-print) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs no-print">
        <div className="flex items-center flex-wrap gap-3">
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

          <button
            onClick={handleCurrentMonth}
            className="text-xs text-neutral-600 hover:text-neutral-900 font-medium px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            This Month
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-2xs"
            title="Download report data as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors shadow-2xs"
            title="Print or save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 space-y-8 shadow-xs">
        {/* Document Header */}
        <div className="border-b border-neutral-200 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold">
                Monthly Work Summary & Audit
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
                {MONTH_NAMES[monthNum - 1]} {year} Personal Self-Report
              </h2>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                Comprehensive data aggregation across all calendar and working days ({activeMonth})
              </p>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
              <div className="text-3xl font-bold font-mono text-neutral-900 tabular-nums">
                {completionRate}%
              </div>
              <span className="text-xs font-mono text-neutral-500">
                Monthly Completion Rate
              </span>
            </div>
          </div>
        </div>

        {/* 1. Quantitative Summary Strip (Requirement 12) */}
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
              className="bg-neutral-900 h-2 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
            />
          </div>
        </div>

        {/* 2. Monthly Work Overview: Weekly Progression & Category Ratios (Requirement 17) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-700" />
              <span>1. Monthly Work Overview & Progression</span>
            </h3>
            <span className="text-xs font-mono text-neutral-500">
              Throughput by Week
            </span>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3 text-right">Total Planned</th>
                  <th className="py-2.5 px-3 text-right">Completed</th>
                  <th className="py-2.5 px-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {weeklyProgression.map(w => (
                  <tr key={w.weekLabel} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{w.weekLabel}</td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-600">
                      {w.total}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums text-neutral-900 font-semibold">
                      {w.completed}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right tabular-nums">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="font-semibold text-neutral-900">{w.completionRate}%</span>
                        <div className="w-20 bg-neutral-100 rounded-full h-1.5 hidden sm:inline-block">
                          <div
                            className="bg-neutral-900 h-1.5 rounded-full"
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

        {/* 3. Monthly Daily Performance Table (Requirement 13) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              2. Complete Monthly Daily Performance Log
            </h3>
            <span className="text-xs font-mono text-neutral-500">
              {daysInMonth} Days Audited
            </span>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Day</th>
                  <th className="py-2 px-3">Classification</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-right">Done</th>
                  <th className="py-2 px-3 text-right">Pending</th>
                  <th className="py-2 px-3 text-right">Skipped</th>
                  <th className="py-2 px-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {dailyPerformance.map(d => {
                  const isCurrentDay = d.dateISO === todayISO;
                  return (
                    <tr
                      key={d.dateISO}
                      className={`hover:bg-neutral-50/60 ${isCurrentDay ? 'bg-neutral-50/80 font-medium' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono text-neutral-600">
                        {d.dateISO}
                      </td>
                      <td className="py-2 px-3 font-medium text-neutral-900">
                        {d.dayName}
                      </td>
                      <td className="py-2 px-3">
                        {d.isOff ? (
                          d.total > 0 ? (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              OFF DAY ({d.total} active)
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 px-1.5 py-0.2 rounded">
                              OFF DAY
                            </span>
                          )
                        ) : d.total === 0 ? (
                          <span className="text-[10px] text-neutral-400 italic">No tasks</span>
                        ) : (
                          <span className="text-[10px] text-neutral-600">Workday</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-900">
                        {d.total}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-emerald-700 font-semibold">
                        {d.completed}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-600">
                        {d.pending}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-neutral-500">
                        {d.skipped}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums">
                        {d.total > 0 ? `${d.completionRate}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Monthly Content Summary (Requirement 15) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-neutral-700" />
              <span>3. Monthly Content Production Output</span>
            </h3>
            <span className="text-xs font-mono text-neutral-500">
              {contentSummary.length} Content Deliverable Streams
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
                  <th className="py-2.5 px-3 text-right">Delivery Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {contentSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-3 px-3 text-center text-neutral-400 italic">
                      No content production tasks scheduled for this month.
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

        {/* 5. Meetings & Follow-ups Summary (Requirement 16) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meetings Card */}
          <div className="border border-neutral-200 rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  Monthly Meetings
                </h4>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {meetingSummary.completed} / {meetingSummary.scheduled} Executed
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
              <div className="space-y-1.5 pt-1 text-xs max-h-36 overflow-y-auto">
                {meetingSummary.tasks.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-neutral-700 py-0.5">
                    <span className="truncate pr-2 font-medium">{m.title}</span>
                    <span className="font-mono text-[11px] text-neutral-500 shrink-0">
                      {formatShortDate(m.date)} · <span className="capitalize">{m.status}</span>
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
                  Monthly Follow-ups
                </h4>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {followUpSummary.completed} / {followUpSummary.scheduled} Done
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
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
              <div className="bg-neutral-50 p-2 rounded border border-neutral-100" title="Follow-ups created from completed meetings">
                <span className="text-[10px] text-neutral-400 block font-sans">From Meet</span>
                <span className="font-bold text-neutral-800">{followUpSummary.generatedFromMeetings}</span>
              </div>
            </div>

            {followUpSummary.tasks.length > 0 && (
              <div className="space-y-1.5 pt-1 text-xs max-h-36 overflow-y-auto">
                {followUpSummary.tasks.map(f => (
                  <div key={f.id} className="flex items-center justify-between text-neutral-700 py-0.5">
                    <span className="truncate pr-2 font-medium">{f.title}</span>
                    <span className="font-mono text-[11px] text-neutral-500 shrink-0">
                      {formatShortDate(f.date)} · <span className="capitalize">{f.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 6. Routine Distribution Breakdown (Requirement 14) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
            4. Routine & Task Distribution Breakdown
          </h3>

          <div className="border border-neutral-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Activity Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Planned Total</th>
                  <th className="py-2.5 px-3 text-right">Completed</th>
                  <th className="py-2.5 px-3 text-right">Pending</th>
                  <th className="py-2.5 px-3 text-right">Delivery Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {routineBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 px-3 text-center text-neutral-400 italic">
                      No routines or task activities recorded for this month.
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

        {/* 7. Missed / Skipped Tasks Log */}
        {missedOrSkippedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              5. Skipped & Overdue Exceptions Log ({missedOrSkippedTasks.length})
            </h3>
            <div className="border border-neutral-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5 bg-neutral-50/40 text-xs">
              {missedOrSkippedTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between text-neutral-700">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-neutral-400">{t.date}</span>
                    <span className="font-medium text-neutral-900">{t.title}</span>
                    {t.skippedReason && (
                      <span className="text-[11px] text-neutral-500 italic">— "{t.skippedReason}"</span>
                    )}
                  </div>
                  <span className="capitalize text-[11px] font-mono font-medium text-neutral-600 px-1.5 py-0.5 rounded bg-neutral-100">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Monthly Executive Reflection & Audit (Requirement 18) */}
        <div className="space-y-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                6. Monthly Executive Reflection & Operational Audit
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Saved against {MONTH_NAMES[monthNum - 1]} {year} ({activeMonth})
              </p>
            </div>
            {existingReport && (
              <span className="text-[11px] font-mono text-neutral-400">
                Archived: {new Date(existingReport.savedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveReflection} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Biggest Accomplishments
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
                  What was left unfinished?
                </label>
                <textarea
                  rows={2}
                  placeholder="Goals or tasks planned but left unfulfilled..."
                  value={reflection.missedGoals}
                  onChange={e => setReflection({ ...reflection, missedGoals: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What caused delays / problems?
                </label>
                <textarea
                  rows={2}
                  placeholder="Operational friction, unexpected emergencies, bottleneck causes..."
                  value={reflection.problems}
                  onChange={e => setReflection({ ...reflection, problems: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  What should change next month?
                </label>
                <textarea
                  rows={2}
                  placeholder="Key lessons learned and tactical changes for the next cycle..."
                  value={reflection.nextMonthPriorities}
                  onChange={e => setReflection({ ...reflection, nextMonthPriorities: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-neutral-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Important Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Operational takeaways, personal reflections, strategic notes..."
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
                    Monthly report reflection saved for {MONTH_NAMES[monthNum - 1]} {year}!
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

        {/* 9. Month-End Planning Connection (Requirement 19) */}
        <div className="pt-6 border-t border-neutral-200 no-print">
          <div className="bg-neutral-900 text-white rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Continuous Operational Cycle
              </span>
              <h3 className="text-sm font-bold mt-1">
                Conclude {MONTH_NAMES[monthNum - 1]} & Plan Next Month
              </h3>
              <p className="text-xs text-neutral-300 mt-1 max-w-xl">
                Seamlessly bridge your review into the next cycle: generate next month's calendar, apply active recurring templates, and register key milestone dates.
              </p>
            </div>

            <button
              onClick={handlePlanNextMonth}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 rounded-md transition-colors shrink-0 shadow-sm"
            >
              <span>Plan Next Month</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
