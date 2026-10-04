export function getDayCompletionPercent(dayNum, checked, totalTasks) {
  if (!totalTasks) return 0;
  let done = 0;
  for (let i = 0; i < totalTasks; i++) {
    if (checked[`${dayNum}_${i}`]) done += 1;
  }
  return Math.round((done / totalTasks) * 100);
}

export function estimateStudyTime(tasks) {
  return tasks.length * 15;
}

export function formatMinutes(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}

export function getDayFromPlan(plan, dayNum) {
  for (const week of plan) {
    for (const day of week.days) {
      if (day._n === dayNum) {
        return { ...day, week: week.w, phase: week.phase, weekTitle: week.title };
      }
    }
  }
  return null;
}
