import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import { PLAN_START_DATE, dateToDayNum, dayNumToDate } from './schedule';

function dayStatus(dayNum, tasks, progress) {
  if (progress.dayDone?.[`d${dayNum}`]) return 'completed';
  const done = (tasks || []).filter((_, i) => progress.checked?.[`${dayNum}_${i}`]).length;
  if (!tasks?.length) return 'not_started';
  if (done === tasks.length) return 'partial';
  if (done > 0) return 'partial';
  return 'not_started';
}

function completionPct(dayNum, tasks, progress) {
  if (progress.dayDone?.[`d${dayNum}`]) return 100;
  if (!tasks?.length) return 0;
  const done = tasks.filter((_, i) => progress.checked?.[`${dayNum}_${i}`]).length;
  return Math.round((done / tasks.length) * 100);
}

function computeStreaks(dayActivity) {
  const dates = Object.values(dayActivity || {})
    .map((activity) => activity?.lastStudiedAt)
    .filter(Boolean)
    .map((value) => format(startOfDay(new Date(value)), 'yyyy-MM-dd'));
  const unique = [...new Set(dates)].sort();
  if (!unique.length) return { current: 0, longest: 0 };

  let longest = 1;
  let streak = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const prev = parseISO(unique[i - 1]);
    const curr = parseISO(unique[i]);
    const diff = Math.round((curr - prev) / 86400000);
    if (diff === 1) streak += 1;
    else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  let current = 0;
  let check = startOfDay(new Date());
  const set = new Set(unique);
  while (set.has(format(check, 'yyyy-MM-dd'))) {
    current += 1;
    check = subDays(check, 1);
  }
  return { current, longest };
}

function scheduledStudyDay(totalDays) {
  let cursor = startOfDay(new Date());
  for (let i = 0; i < 8; i += 1) {
    const dayNum = dateToDayNum(cursor, PLAN_START_DATE, totalDays);
    if (dayNum) return dayNum;
    cursor = addDays(cursor, 1);
  }
  return 1;
}

export function buildLocalAnalytics(plan, progress) {
  const bookmarks = new Set(progress.bookmarks || []);
  const allDays = [];

  plan.forEach((week) => {
    week.days.forEach((day, idx) => {
      const status = dayStatus(day._n, day.tasks, progress);
      allDays.push({
        ...day,
        week: week.w,
        phase: week.phase,
        weekTitle: week.title,
        dayIndexInWeek: idx,
        status,
        isBookmarked: bookmarks.has(day._n),
        studyMinutes: progress.dayActivity?.[`d${day._n}`]?.studyMinutes || 0,
      });
    });
  });

  const daysCompleted = allDays.filter((day) => progress.dayDone?.[`d${day._n}`]).length;
  const progressDay = allDays.find((day) => !progress.dayDone?.[`d${day._n}`]) || allDays[allDays.length - 1] || null;
  const currentDayNum = progressDay?._n || 1;
  const scheduledToday = scheduledStudyDay(allDays.length);

  const phaseMap = new Map();
  allDays.forEach((day) => {
    if (!phaseMap.has(day.phase)) {
      phaseMap.set(day.phase, { id: day.phase, label: day.weekTitle, total: 0, done: 0 });
    }
    const phase = phaseMap.get(day.phase);
    phase.total += 1;
    phase.label = day.weekTitle || phase.label;
    if (progress.dayDone?.[`d${day._n}`]) phase.done += 1;
  });

  const heatmap = {};
  allDays.forEach((day) => {
    const date = dayNumToDate(day._n, PLAN_START_DATE);
    heatmap[format(date, 'yyyy-MM-dd')] = {
      dayNum: day._n,
      topic: day.topic,
      progress: completionPct(day._n, day.tasks, progress),
      studyMinutes: day.studyMinutes,
      status: day.status,
    };
  });

  let tasksChecked = 0;
  allDays.forEach((day) => {
    day.tasks.forEach((_, i) => {
      if (progress.checked?.[`${day._n}_${i}`]) tasksChecked += 1;
    });
  });

  const studyMinutes = Object.values(progress.dayActivity || {}).reduce(
    (sum, activity) => sum + (activity?.studyMinutes || 0),
    0,
  );

  return {
    allDays,
    currentDay: progressDay,
    currentDayNum,
    skillPhaseId: Math.max(0, (progressDay?.phase || 1) - 1),
    scheduledToday,
    scheduledDateKey: format(dayNumToDate(scheduledToday || currentDayNum, PLAN_START_DATE), 'yyyy-MM-dd'),
    totalPlanDays: allDays.length,
    overallProgress: allDays.length ? Math.round((daysCompleted / allDays.length) * 100) : 0,
    daysCompleted,
    daysRemaining: Math.max(0, allDays.length - daysCompleted),
    planStartDate: PLAN_START_DATE,
    phaseProgress: [...phaseMap.values()].map((phase) => ({
      id: phase.id,
      label: phase.label,
      total: phase.total,
      done: phase.done,
      progress: phase.total ? Math.round((phase.done / phase.total) * 100) : 0,
      current: phase.id === progressDay?.phase,
      complete: phase.total > 0 && phase.done === phase.total,
    })),
    streaks: computeStreaks(progress.dayActivity),
    tasksChecked,
    studyMinutes,
    avgStudyMinutes: daysCompleted ? Math.round(studyMinutes / daysCompleted) : 0,
    heatmap,
  };
}
