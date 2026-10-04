import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activityLevel,
  buildHeatmap,
  buildSkillProfile,
  cellLevel,
  masteryBand,
  monthLabels,
  recordSkillChanges,
  streakStats,
} from './skillProgress.js';

function catalog() {
  const leaves = [
    { id: 'a', name: 'Setup', prereqs: [], leaf: true, phaseId: 0, phaseName: 'Foundation', phaseShort: 'Foundation' },
    { id: 'b', name: 'Variables', prereqs: ['a'], leaf: true, phaseId: 1, phaseName: 'Python', phaseShort: 'Python' },
    { id: 'c', name: 'Functions', prereqs: ['b'], leaf: true, phaseId: 1, phaseName: 'Python', phaseShort: 'Python' },
    { id: 'd', name: 'Queries', prereqs: ['a'], leaf: true, phaseId: 3, phaseName: 'SQL', phaseShort: 'SQL' },
    { id: 'e', name: 'Project one', prereqs: [], leaf: true, phaseId: 8, phaseName: 'Projects', phaseShort: 'Projects' },
  ];
  return {
    phases: [
      { id: 0, name: 'Foundation', short: 'Foundation', horizon: 'core' },
      { id: 1, name: 'Python', short: 'Python', horizon: 'core' },
      { id: 3, name: 'SQL', short: 'SQL', horizon: 'core' },
      { id: 8, name: 'Projects', short: 'Projects', horizon: 'extended' },
      { id: 13, name: 'Specialization', short: 'Specialization', horizon: 'later' },
    ],
    leaves,
    byId: new Map(leaves.map((leaf) => [leaf.id, leaf])),
    gates: [
      { id: 0, name: 'Foundation', checks: ['Environment', 'Baseline'] },
      { id: 1, name: 'Python', checks: ['Syntax'] },
    ],
    days: [{ day: 1, topic: 'Setup and diagnostics' }],
  };
}

const now = new Date(2026, 9, 4, 15, 0, 0);

describe('cell levels', () => {
  it('uses topic counts and does not treat minutes as topics', () => {
    assert.equal(cellLevel(0, 0), 0);
    assert.equal(cellLevel(0, 90), 1);
    assert.equal(cellLevel(1, 0), 1);
    assert.equal(cellLevel(2, 0), 2);
    assert.equal(cellLevel(4, 0), 3);
    assert.equal(cellLevel(5, 10), 4);
  });

  it('darkens a study day as tasks are checked, and uses the darkest shade when the day is complete', () => {
    assert.equal(activityLevel({ tasks: 1, taskTotal: 4 }), 1);
    assert.equal(activityLevel({ tasks: 2, taskTotal: 4 }), 2);
    assert.equal(activityLevel({ tasks: 3, taskTotal: 4 }), 3);
    assert.equal(activityLevel({ tasks: 4, taskTotal: 4 }), 3);
    assert.equal(activityLevel({ tasks: 1, taskTotal: 4, dayDone: true }), 4);
  });
});

describe('streaks', () => {
  it('counts today and keeps a streak that is still open yesterday', () => {
    assert.deepEqual(streakStats(['2026-10-03', '2026-10-04'], now), { current: 2, longest: 2, activeDays: 2 });
    assert.equal(streakStats(['2026-10-02', '2026-10-03'], now).current, 2);
  });

  it('breaks the current streak when yesterday was missed', () => {
    const stats = streakStats(['2026-09-30', '2026-10-01'], now);
    assert.equal(stats.current, 0);
    assert.equal(stats.longest, 2);
  });

  it('records a 7-day streak', () => {
    const keys = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
    assert.equal(streakStats(keys, now).current, 7);
    assert.equal(streakStats(keys, now).longest, 7);
  });
});

describe('profile math', () => {
  it('starts at zero without inventing heatmap history', () => {
    const profile = buildSkillProfile(catalog(), { skillMap: { topics: { a: 'done' }, activity: [] } }, '1y', now);
    assert.equal(profile.leavesDone, 1);
    assert.equal(profile.contributions, 0);
    assert.equal(profile.heatmap.weeks.some((week) => week.cells.some((cell) => cell.level > 0)), false);
    assert.equal(profile.focus.id, 'b');
    assert.match(profile.focus.reason, /Setup/);
  });

  it('groups several completions on one day and orders recent activity', () => {
    const activity = [
      { topicId: 'a', action: 'completed', at: '2026-10-04T08:00:00' },
      { topicId: 'b', action: 'completed', at: '2026-10-04T10:00:00' },
      { topicId: 'c', action: 'completed', at: '2026-10-03T10:00:00' },
      { gateId: 0, action: 'gate', at: '2026-10-04T11:00:00' },
    ];
    const profile = buildSkillProfile(catalog(), {
      skillMap: {
        topics: { a: 'done', b: 'done', c: 'done' },
        gates: { 0: true },
        activity,
      },
      dayActivity: { d1: { lastStudiedAt: '2026-10-04T09:00:00', studyMinutes: 45 } },
    }, '1y', now);
    assert.equal(profile.leavesDone, 3);
    assert.equal(profile.percent, 60);
    assert.equal(profile.gatesPassed, 1);
    assert.equal(profile.phasesDone, 2);
    assert.equal(profile.mastery.find((row) => row.id === 1).done, 2);
    assert.equal(profile.mastery.find((row) => row.id === 1).band, 'complete');
    const today = profile.heatmap.weeks.flatMap((week) => week.cells).find((cell) => cell.key === '2026-10-04');
    assert.equal(today.topics, 2);
    assert.equal(today.minutes, 45);
    assert.equal(today.level, 2);
    assert.equal(profile.recent[0].label, 'Today');
    assert.equal(profile.recent[0].items[0].kind, 'gate');
    assert.equal(profile.streaks.current, 2);
    assert.equal(profile.gate.passed, false);
    assert.equal(profile.milestones.find((item) => item.id === 'first-gate').done, true);
    assert.equal(profile.depth.find((band) => band.id === 'core').done, 3);
  });

  it('shows a finished study day as that skill topic', () => {
    const profile = buildSkillProfile(catalog(), {
      skillMap: { topics: {}, activity: [] },
      dayDone: { d1: true },
      checked: { '1_0': true, '1_1': true },
      dayActivity: { d1: { lastStudiedAt: '2026-10-04T09:00:00', studyMinutes: 0 } },
    }, '1y', now, [{ _n: 1, topic: 'Setup', tasks: ['Install', 'Confirm'] }]);
    assert.equal(profile.leavesDone, 1);
    assert.equal(profile.focus.id, 'b');
    assert.equal(profile.contributions, 1);
    const cells = profile.heatmap.weeks.flatMap((week) => week.cells);
    const planned = cells.find((cell) => cell.key === '2026-10-06');
    const week = profile.heatmap.weeks.find((item) => item.cells.some((cell) => cell.key === '2026-10-06'));
    assert.equal(planned.level, 4);
    assert.equal(week.cells[1], planned);
    assert.equal(cells.find((cell) => cell.key === '2026-10-04').level, 0);
    assert.equal(profile.recent[0].items.some((item) => item.title === 'Setup'), true);
  });

  it('shows checked tasks before the topic is finished', () => {
    const profile = buildSkillProfile(catalog(), {
      skillMap: {},
      checked: { '1_0': true },
      dayActivity: { d1: { lastStudiedAt: '2026-10-04T09:00:00', studyMinutes: 0 } },
    }, '1y', now, [{ _n: 1, topic: 'Setup · practice', tasks: ['Cold start', 'Problems'] }]);
    assert.equal(profile.leavesDone, 0);
    assert.equal(profile.skillsStarted, 0);
    assert.equal(profile.contributions, 0);
    assert.equal(profile.focus.id, 'a');
    const cells = profile.heatmap.weeks.flatMap((week) => week.cells);
    const planned = cells.find((cell) => cell.key === '2026-10-06');
    const week = profile.heatmap.weeks.find((item) => item.cells.some((cell) => cell.key === '2026-10-06'));
    assert.equal(planned.tasks, 1);
    assert.equal(planned.level, 2);
    assert.equal(week.cells[1], planned);
    assert.equal(cells.find((cell) => cell.key === '2026-10-04').level, 0);
    assert.equal(profile.streaks.current, 0);
    assert.equal(profile.streaks.activeDays, 0);
    assert.equal(profile.recent[0].items[0].title, 'Checked 1 task');
  });

  it('marks the whole map complete only when every leaf is done', () => {
    const topics = { a: 'done', b: 'done', c: 'done', d: 'done', e: 'done' };
    const profile = buildSkillProfile(catalog(), { skillMap: { topics, gates: { 0: true, 1: true } } }, 'all', now);
    assert.equal(profile.percent, 100);
    assert.equal(profile.phasesDone, 4);
    assert.equal(profile.focus, null);
    assert.equal(profile.milestones.every((item) => item.id === 'streak-7' ? !item.done : item.done), true);
  });
});

describe('activity log', () => {
  it('appends a completion once and keeps earlier events', () => {
    const first = recordSkillChanges({}, { topics: { a: 'done' }, gates: {} }, new Date('2026-10-04T08:00:00Z'));
    const second = recordSkillChanges(first, { topics: { a: 'done', b: 'doing' }, gates: { 0: true } }, new Date('2026-10-04T09:00:00Z'));
    assert.equal(second.activity.length, 2);
    assert.equal(second.activity[0].topicId, 'a');
    assert.equal(second.activity[1].action, 'gate');
    const again = recordSkillChanges(second, { topics: second.topics, gates: second.gates }, new Date('2026-10-04T10:00:00Z'));
    assert.equal(again.activity.length, 2);
  });
});

describe('heatmap range', () => {
  it('shows this October through next October, with day 1 on its Tuesday', () => {
    const heatmap = buildHeatmap(new Map([['2026-10-06', { topics: 0, minutes: 0, tasks: 4, taskTotal: 4, dayDone: true }]]), 'year', now);
    assert.equal(heatmap.weeks[0].cells[0].key, '2026-09-28');
    const planned = heatmap.weeks.flatMap((week) => week.cells).find((cell) => cell.key === '2026-10-06');
    const week = heatmap.weeks.find((item) => item.cells[1] === planned);
    assert.equal(week.cells[1].key, '2026-10-06');
    assert.equal(planned.level, 4);
    assert.equal(heatmap.weeks.at(-1).cells.at(-1).key, '2027-10-31');
    assert.equal(heatmap.weeks.some((item) => item.cells.some((cell) => cell.key === '2026-01-01')), false);
    const labels = monthLabels(heatmap.weeks);
    assert.equal(labels.find(Boolean), 'Oct');
    assert.equal(labels.filter(Boolean).at(-1), 'Oct');
    assert.equal(labels.filter((label) => label === 'Oct').length, 2);
  });

  it('places each date in its own week column and weekday row, oldest week first', () => {
    const map = new Map([
      ['2025-09-29', { topics: 0, minutes: 0, tasks: 1, taskTotal: 4 }],
      ['2026-01-07', { topics: 0, minutes: 0, tasks: 2, taskTotal: 4 }],
      ['2026-10-04', { topics: 0, minutes: 0, tasks: 3, taskTotal: 4 }],
    ]);
    const heatmap = buildHeatmap(map, '1y', now);
    const first = heatmap.weeks[0];
    const last = heatmap.weeks.at(-1);
    assert.equal(first.cells[0].key < last.cells[0].key, true);
    assert.equal(first.cells[0].key, '2025-09-29');
    assert.equal(first.cells[0].level, 1);
    assert.equal(first.cells[2].key, '2025-10-01');
    const wednesday = heatmap.weeks.flatMap((week) => week.cells).find((cell) => cell.key === '2026-01-07');
    const week = heatmap.weeks.find((item) => item.cells.some((cell) => cell.key === '2026-01-07'));
    assert.equal(week.cells[2], wednesday);
    assert.equal(wednesday.level, 2);
    assert.equal(last.cells[6].key, '2026-10-04');
    assert.equal(last.cells[6].level, 3);
    assert.equal(last.cells[0].level, 0);
  });

  it('does not invent days before the first stored event for all time', () => {
    const map = new Map([['2026-10-04', { topics: 1, minutes: 0 }]]);
    const heatmap = buildHeatmap(map, 'all', now);
    assert.equal(heatmap.weeks[0].cells[0].key <= '2026-10-04', true);
    assert.equal(heatmap.weeks.at(-1).cells.some((cell) => cell.key === '2026-10-04'), true);
    assert.equal(heatmap.weeks[0].cells[0].key >= '2026-09-28', true);
  });

  it('drops a month label that would sit on top of the next one', () => {
    const weeks = [
      { month: 'Sep' },
      { month: 'Oct' },
      { month: '' },
      { month: '' },
      { month: 'Nov' },
    ];
    assert.deepEqual(monthLabels(weeks), ['', 'Oct', '', '', 'Nov']);
  });

  it('classifies partial skills from the shared thresholds', () => {
    assert.equal(masteryBand(0, 10), 'none');
    assert.equal(masteryBand(1, 10), 'started');
    assert.equal(masteryBand(4, 10), 'developing');
    assert.equal(masteryBand(7, 10), 'strong');
    assert.equal(masteryBand(10, 10), 'complete');
  });
});
