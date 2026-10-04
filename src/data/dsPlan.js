import days from './dsDays.json';
import { assignDayNumbers } from '../utils/planHelpers';

export const DS_PHASES = [
  { id: 1, name: 'Foundation', description: 'Environment, terminal, and Git' },
  { id: 2, name: 'Python', description: 'Language fundamentals through testing' },
  { id: 3, name: 'NumPy & pandas', description: 'Arrays, tables, and a first project' },
  { id: 4, name: 'SQL', description: 'Queries through modelling' },
  { id: 5, name: 'Statistics & mathematics', description: 'Inference, experiments, and the maths ML needs' },
  { id: 6, name: 'EDA & visualisation', description: 'Analysis workflow and a second project' },
  { id: 7, name: 'Machine learning', description: 'Classical ML, evaluation, and two projects' },
  { id: 8, name: 'Advanced ML', description: 'Boosting, a fifth project, and portfolio' },
];

export function buildDsPlan() {
  const weeks = [];
  let bucket = [];
  let phase = null;

  function pushWeek() {
    if (!bucket.length) return;
    const counts = {};
    bucket.forEach((day) => {
      counts[day.phase] = (counts[day.phase] || 0) + 1;
    });
    const phaseId = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
    const phaseName = bucket.find((day) => day.phase === phaseId)?.phaseName || 'Data Science';
    weeks.push({
      w: weeks.length + 1,
      phase: phaseId,
      title: phaseName,
      days: bucket.map((day) => ({
        topic: day.topic,
        tasks: day.tasks,
        minutes: day.minutes,
        practice: !!day.practice,
      })),
    });
    bucket = [];
  }

  days.forEach((day) => {
    if (phase !== null && (day.phase !== phase || bucket.length === 6)) pushWeek();
    phase = day.phase;
    bucket.push(day);
  });
  pushWeek();

  return assignDayNumbers(weeks);
}
