import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  startOfDay,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { PLAN_START_DATE, dayNumToDate } from './schedule.js';

/**
 * Activity rule
 * --------------
 * A contribution is one skill topic whose status changes to "done".
 * The date is the timestamp stored on skillMap.activity at that moment.
 * Topics already marked done before a timestamp existed stay in the totals
 * and are omitted from the heatmap. Their dates were never recorded.
 *
 * Study-plan checks and completed days are placed on that day's plan date,
 * not the moment the box was clicked. Study minutes come only from
 * progress.dayActivity.studyMinutes, placed on lastStudiedAt. Minutes are
 * never estimated from topic counts.
 *
 * Cell level for a study day:
 *   0  nothing checked
 *   1  the first tasks, lightest shade
 *   2  about half the tasks
 *   3  most or all tasks, still short of marking the day
 *   4  the day is marked complete, darkest shade
 *
 * Logged study time and checked tasks never count as a completed topic.
 * A finished study day whose topic matches a skill leaf counts as that leaf.
 */

export const MASTERY_BANDS = [
  { id: 'none', label: 'Not started', min: 0, max: 0 },
  { id: 'started', label: 'Started', min: 1, max: 39 },
  { id: 'developing', label: 'Developing', min: 40, max: 69 },
  { id: 'strong', label: 'Strong', min: 70, max: 99 },
  { id: 'complete', label: 'Complete', min: 100, max: 100 },
];

export const RANGE_OPTIONS = [
  { id: 'year', label: 'Oct – next Oct' },
  { id: '3m', label: 'Last 3 months' },
  { id: '6m', label: 'Last 6 months' },
  { id: '1y', label: 'Last year' },
  { id: 'all', label: 'All time' },
];

const HORIZON_LABELS = {
  core: '12-month core',
  extended: '18-month extension',
  later: 'Later path',
};

export function cellLevel(topicsCompleted, studyMinutes, taskChecks = 0) {
  const topics = topicsCompleted || 0;
  const minutes = studyMinutes || 0;
  const tasks = taskChecks || 0;
  if (topics >= 5) return 4;
  if (topics >= 3) return 3;
  if (topics === 2) return 2;
  if (topics === 1 || minutes > 0 || tasks > 0) return 1;
  return 0;
}

export function activityLevel({ topics = 0, minutes = 0, tasks = 0, taskTotal = 0, dayDone = false } = {}) {
  if (dayDone) return 4;
  let fromTasks = 0;
  if (tasks > 0) {
    if (taskTotal > 0) {
      fromTasks = tasks >= taskTotal ? 3 : Math.min(3, Math.max(1, Math.ceil((tasks / taskTotal) * 3)));
    } else {
      fromTasks = 1;
    }
  }
  return Math.max(fromTasks, cellLevel(topics, minutes, 0));
}

export function planTopicName(topic) {
  return String(topic || '').replace(/\s*·\s*practice\s*$/i, '').trim();
}

function dayChecks(progress, day) {
  return (day.tasks || []).filter((_, index) => progress.checked?.[`${day._n}_${index}`]).length;
}

function dayMarkedDone(progress, day) {
  return !!progress.dayDone?.[`d${day._n}`];
}

function planDayKey(day) {
  return format(dayNumToDate(day._n, PLAN_START_DATE), 'yyyy-MM-dd');
}

function planDayInstant(day) {
  return `${planDayKey(day)}T12:00:00`;
}

export function applyStudyDays(index, progress = {}, studyDays = []) {
  const base = progress.skillMap || {};
  const topics = { ...(base.topics || {}) };
  const activity = Array.isArray(base.activity) ? base.activity.slice() : [];
  const recorded = new Set(
    activity.filter((event) => event.action === 'completed' && event.topicId).map((event) => event.topicId),
  );
  const byName = new Map();
  (index.leaves || []).forEach((leaf) => {
    const key = leaf.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, leaf);
  });

  studyDays.forEach((day) => {
    const leaf = byName.get(planTopicName(day.topic).toLowerCase());
    if (!dayMarkedDone(progress, day) || !leaf) return;
    if (topics[leaf.id] !== 'done') topics[leaf.id] = 'done';
    const at = planDayInstant(day);
    const existing = activity.find((event) => event.action === 'completed' && event.topicId === leaf.id);
    if (existing) {
      existing.at = at;
      existing.dayNum = day._n;
      existing.source = existing.source || 'plan';
      recorded.add(leaf.id);
      return;
    }
    activity.push({ topicId: leaf.id, action: 'completed', at, source: 'plan', dayNum: day._n });
    recorded.add(leaf.id);
  });

  return {
    topics,
    phases: base.phases || {},
    gates: base.gates || {},
    activity,
  };
}

export function masteryRatio(done, total) {
  if (!total || done <= 0) return 0;
  return Math.min(100, (done / total) * 100);
}

export function masteryBand(done, total) {
  if (!total || done <= 0) return 'none';
  if (done >= total) return 'complete';
  const pct = (done / total) * 100;
  if (pct >= 70) return 'strong';
  if (pct >= 40) return 'developing';
  return 'started';
}

export function recordSkillChanges(prevMap = {}, nextMap = {}, now = new Date()) {
  const at = now.toISOString();
  const activity = Array.isArray(prevMap.activity) ? prevMap.activity.slice() : [];
  const prevTopics = prevMap.topics || {};
  const nextTopics = nextMap.topics || {};
  Object.entries(nextTopics).forEach(([id, status]) => {
    if (status === 'done' && prevTopics[id] !== 'done') {
      activity.push({ topicId: id, action: 'completed', at });
    }
  });
  const prevGates = prevMap.gates || {};
  const nextGates = nextMap.gates || {};
  Object.entries(nextGates).forEach(([id, passed]) => {
    if (passed && prevGates[id] !== true && prevGates[id] !== 'true') {
      activity.push({ gateId: Number(id), action: 'gate', at });
    }
  });
  return {
    topics: nextTopics,
    phases: nextMap.phases || prevMap.phases || {},
    gates: nextGates,
    activity,
  };
}

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(startOfDay(date), 'yyyy-MM-dd');
}

function statusOf(topics, id) {
  return topics[id] || 'todo';
}

function leavesFor(index, phaseId) {
  return index.leaves.filter((leaf) => leaf.phaseId === phaseId);
}

function prereqsMet(index, topics, node) {
  return node.prereqs.every((id) => statusOf(topics, id) === 'done');
}

export function buildDayTotals(skillMap = {}, dayActivity = {}, progress = {}, studyDays = []) {
  const byDate = new Map();
  const touch = (key) => {
    if (!byDate.has(key)) byDate.set(key, { topics: 0, minutes: 0, tasks: 0, events: [] });
    return byDate.get(key);
  };

  (skillMap.activity || []).forEach((event) => {
    if (event.action !== 'completed' || !event.topicId) return;
    const key = dayKey(event.at);
    if (!key) return;
    const bucket = touch(key);
    bucket.topics += 1;
    bucket.events.push(event);
  });

  Object.values(dayActivity || {}).forEach((entry) => {
    const minutes = entry?.studyMinutes || 0;
    if (!minutes || !entry.lastStudiedAt) return;
    const key = dayKey(entry.lastStudiedAt);
    if (!key) return;
    touch(key).minutes += minutes;
  });

  studyDays.forEach((day) => {
    const tasks = dayChecks(progress, day);
    const marked = dayMarkedDone(progress, day);
    if (!tasks && !marked) return;
    const key = planDayKey(day);
    const bucket = touch(key);
    bucket.tasks += tasks;
    bucket.taskTotal = (bucket.taskTotal || 0) + (day.tasks?.length || 0);
    bucket.dayDone = bucket.dayDone || marked;
  });

  return byDate;
}

export function streakStats(activeKeys, now = new Date()) {
  const set = new Set(activeKeys);
  const today = startOfDay(now);
  let longest = 0;
  let run = 0;
  const sorted = [...set].sort();
  sorted.forEach((key, index) => {
    if (index === 0) {
      run = 1;
    } else {
      const prev = new Date(`${sorted[index - 1]}T12:00:00`);
      const curr = new Date(`${key}T12:00:00`);
      run = differenceInCalendarDays(curr, prev) === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
  });

  let cursor = today;
  if (!set.has(format(cursor, 'yyyy-MM-dd'))) cursor = addDays(cursor, -1);
  let current = 0;
  while (set.has(format(cursor, 'yyyy-MM-dd'))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, longest, activeDays: set.size };
}

function octoberStart(now) {
  const today = startOfDay(now);
  const year = today.getMonth() >= 9 ? today.getFullYear() : today.getFullYear() - 1;
  return new Date(year, 9, 1);
}

function rangeStart(rangeKey, earliest, now) {
  const today = startOfDay(now);
  if (rangeKey === 'year') return startOfWeek(octoberStart(today), { weekStartsOn: 1 });
  if (rangeKey === 'all') {
    if (!earliest) return startOfWeek(subMonths(today, 12), { weekStartsOn: 1 });
    return startOfWeek(earliest, { weekStartsOn: 1 });
  }
  const months = rangeKey === '3m' ? 3 : rangeKey === '6m' ? 6 : 12;
  return startOfWeek(subMonths(today, months), { weekStartsOn: 1 });
}

function rangeEnd(rangeKey, latest, now) {
  const today = startOfDay(now);
  if (rangeKey === 'year') {
    const start = octoberStart(today);
    return endOfWeek(endOfMonth(new Date(start.getFullYear() + 1, 9, 1)), { weekStartsOn: 1 });
  }
  const anchor = latest && latest > today ? latest : today;
  return endOfWeek(anchor, { weekStartsOn: 1 });
}

export function monthLabels(weeks) {
  const labels = weeks.map(() => '');
  let last = -99;
  weeks.forEach((week, index) => {
    if (!week.month) return;
    if (index - last < 3) labels[last] = '';
    labels[index] = week.month;
    last = index;
  });
  return labels;
}

export function buildHeatmap(byDate, rangeKey, now = new Date()) {
  const dated = [...byDate.keys()].map((key) => new Date(`${key}T12:00:00`));
  const earliest = dated.length ? new Date(Math.min(...dated.map((date) => date.getTime()))) : null;
  const latest = dated.length ? new Date(Math.max(...dated.map((date) => date.getTime()))) : null;
  const start = rangeStart(rangeKey, earliest, now);
  const end = rangeEnd(rangeKey, latest, now);
  const days = eachDayOfInterval({ start, end });
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    const cells = slice.map((date) => {
      const key = format(date, 'yyyy-MM-dd');
      const record = byDate.get(key) || { topics: 0, minutes: 0, tasks: 0, taskTotal: 0, dayDone: false };
      const topics = record.topics || 0;
      const minutes = record.minutes || 0;
      const tasks = record.tasks || 0;
      return {
        key,
        date,
        label: format(date, 'MMMM d, yyyy'),
        topics,
        minutes,
        tasks,
        dayDone: !!record.dayDone,
        level: activityLevel({
          topics,
          minutes,
          tasks,
          taskTotal: record.taskTotal || 0,
          dayDone: !!record.dayDone,
        }),
        future: false,
      };
    });
    const monthStart = slice.find((date) => date.getDate() === 1);
    const monthKey = monthStart
      ? format(monthStart, 'yyyy-MM')
      : (weeks.at(-1)?.monthKey || format(slice[0], 'yyyy-MM'));
    weeks.push({ month: monthStart ? format(monthStart, 'MMM') : '', monthKey, cells });
  }
  return { weeks, hasHistory: dated.length > 0, earliest };
}

function phaseRows(index, topics) {
  return index.phases.map((phase) => {
    const leaves = leavesFor(index, phase.id);
    const done = leaves.filter((leaf) => statusOf(topics, leaf.id) === 'done').length;
    const started = leaves.some((leaf) => {
      const status = statusOf(topics, leaf.id);
      return status === 'done' || status === 'doing';
    });
    const total = leaves.length;
    const ratio = masteryRatio(done, total);
    return {
      ...phase,
      done,
      total,
      started,
      percent: Math.round(ratio),
      band: masteryBand(done, total),
      complete: total > 0 && done === total,
    };
  });
}

export function getCurrentFocus(index, topics) {
  const open = index.leaves.find((leaf) => statusOf(topics, leaf.id) !== 'done' && prereqsMet(index, topics, leaf));
  if (open) {
    const names = open.prereqs
      .map((id) => index.byId.get(id)?.name)
      .filter(Boolean);
    const reason = names.length
      ? `${open.name} is next because these prerequisites are already complete: ${names.join(', ')}.`
      : `${open.name} is the next open topic in ${open.phaseName}. It has no prerequisites.`;
    return { ...open, reason, blocked: false };
  }
  const blocked = index.leaves.find((leaf) => statusOf(topics, leaf.id) !== 'done');
  if (!blocked) return null;
  const missing = blocked.prereqs
    .filter((id) => statusOf(topics, id) !== 'done')
    .map((id) => index.byId.get(id)?.name || id);
  return {
    ...blocked,
    blocked: true,
    reason: missing.length
      ? `${blocked.name} is waiting on ${missing.join(', ')}.`
      : `${blocked.name} is still open in ${blocked.phaseName}.`,
  };
}

function recentItems(index, skillMap, dayActivity, now, progress = {}, studyDays = []) {
  const items = [];
  (skillMap.activity || []).forEach((event) => {
    const at = new Date(event.at);
    if (Number.isNaN(at.getTime())) return;
    if (event.action === 'completed' && event.topicId) {
      const topic = index.byId.get(event.topicId);
      items.push({
        id: `topic-${event.topicId}-${event.at}`,
        at,
        kind: 'completed',
        title: topic?.name || event.topicId,
        detail: topic?.phaseName || 'Skill map',
        topicId: event.topicId,
        phaseId: topic?.phaseId,
      });
    }
    if (event.action === 'gate' && event.gateId != null) {
      const gate = index.gates.find((item) => item.id === Number(event.gateId));
      items.push({
        id: `gate-${event.gateId}-${event.at}`,
        at,
        kind: 'gate',
        title: gate ? `${gate.name} gate passed` : `Gate ${event.gateId} passed`,
        detail: 'Gate',
        gateId: Number(event.gateId),
      });
    }
  });
  studyDays.forEach((day) => {
    const checks = dayChecks(progress, day);
    if (!checks || dayMarkedDone(progress, day)) return;
    const at = new Date(planDayInstant(day));
    if (Number.isNaN(at.getTime())) return;
    const leaf = (index.leaves || []).find(
      (item) => item.name.trim().toLowerCase() === planTopicName(day.topic).toLowerCase(),
    );
    items.push({
      id: `tasks-${day._n}-${at.toISOString()}`,
      at,
      kind: 'studied',
      title: checks === 1 ? 'Checked 1 task' : `Checked ${checks} tasks`,
      detail: day.topic || 'Study plan',
      topicId: leaf?.id,
      phaseId: leaf?.phaseId,
    });
  });
  Object.entries(dayActivity || {}).forEach(([key, entry]) => {
    const minutes = entry?.studyMinutes || 0;
    if (!minutes || !entry.lastStudiedAt) return;
    const at = new Date(entry.lastStudiedAt);
    if (Number.isNaN(at.getTime())) return;
    items.push({
      id: `study-${key}-${entry.lastStudiedAt}`,
      at,
      kind: 'studied',
      title: `Logged ${minutes} min`,
      detail: 'Study plan',
    });
  });
  items.sort((a, b) => b.at - a.at);
  const groups = [];
  items.slice(0, 24).forEach((item) => {
    const diff = differenceInCalendarDays(startOfDay(now), startOfDay(item.at));
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : format(item.at, 'MMMM d');
    let group = groups.find((entry) => entry.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push({
      ...item,
      when: formatDistanceToNow(item.at, { addSuffix: true }),
    });
  });
  return groups;
}

export function buildSkillProfile(index, progress = {}, rangeKey = '1y', now = new Date(), studyDays = []) {
  const skillMap = applyStudyDays(index, progress, studyDays);
  const topics = skillMap.topics || {};
  const gates = skillMap.gates || {};
  const dayActivity = progress.dayActivity || {};
  const rows = phaseRows(index, topics);
  const leavesDone = rows.reduce((sum, row) => sum + row.done, 0);
  const leavesTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const phasesDone = rows.filter((row) => row.complete).length;
  const skillsStarted = rows.filter((row) => row.started).length;
  const gatesPassed = index.gates.filter((gate) => gates[gate.id] === true || gates[String(gate.id)] === true).length;
  const byDate = buildDayTotals(skillMap, dayActivity, progress, studyDays);
  const activeKeys = [...byDate.entries()]
    .filter(([, record]) => (record.topics || 0) > 0 || (record.minutes || 0) > 0)
    .map(([key]) => key);
  const streaks = streakStats(activeKeys, now);
  const heatmap = buildHeatmap(byDate, rangeKey, now);
  const contributions = (skillMap.activity || []).filter((event) => event.action === 'completed').length;
  const studyMinutes = Object.values(dayActivity).reduce((sum, entry) => sum + (entry?.studyMinutes || 0), 0);
  const focus = getCurrentFocus(index, topics);
  const visible = rows.filter((row) => row.total > 0);
  const current = visible.find((row) => !row.complete) || null;
  const gate = index.gates.find((item) => item.id === current?.id) || index.gates.find((item) => !(gates[item.id] || gates[String(item.id)])) || null;
  const gatePassed = gate ? (gates[gate.id] === true || gates[String(gate.id)] === true) : false;
  const projectLeaves = leavesFor(index, 8);
  const depth = ['core', 'extended', 'later'].map((id) => {
    const phaseIds = new Set(rows.filter((row) => row.horizon === id).map((row) => row.id));
    const leaves = index.leaves.filter((leaf) => phaseIds.has(leaf.phaseId));
    const done = leaves.filter((leaf) => statusOf(topics, leaf.id) === 'done').length;
    return { id, label: HORIZON_LABELS[id], done, total: leaves.length };
  }).filter((band) => band.total > 0);

  const milestones = [
    { id: 'first-topic', label: 'First topic completed', done: leavesDone >= 1 },
    { id: 'streak-7', label: 'First 7-day streak', done: streaks.longest >= 7 },
    { id: 'first-phase', label: 'First phase completed', done: phasesDone >= 1 },
    { id: 'first-gate', label: 'First gate passed', done: gatesPassed >= 1 },
    { id: 'first-project', label: 'First project topic completed', done: projectLeaves.some((leaf) => statusOf(topics, leaf.id) === 'done') },
  ];

  return {
    leavesDone,
    leavesTotal,
    percent: leavesTotal ? Math.round((leavesDone / leavesTotal) * 100) : 0,
    skillsStarted,
    phasesDone,
    phasesTotal: visible.length,
    gatesPassed,
    gatesTotal: index.gates.length,
    contributions,
    studyMinutes,
    hoursLabel: studyMinutes ? `${Math.round((studyMinutes / 60) * 10) / 10}h` : '0h',
    streaks,
    heatmap,
    mastery: visible,
    depth,
    roadmap: visible.map((row) => ({
      ...row,
      state: row.complete ? 'done' : row.id === current?.id ? 'current' : 'upcoming',
    })),
    current,
    focus,
    firstDay: index.days[0] || null,
    dayCount: index.days.length,
    recent: recentItems(index, skillMap, dayActivity, now, progress, studyDays),
    gate: gate && {
      ...gate,
      passed: gatePassed,
      met: gatePassed ? gate.checks.length : 0,
    },
    milestones,
    empty: leavesDone === 0 && contributions === 0 && studyMinutes === 0,
  };
}
