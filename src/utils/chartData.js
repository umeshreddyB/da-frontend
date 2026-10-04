export function buildProgressChartData(allDays = []) {
  let cumulative = 0;
  return allDays.map((day) => {
    if (day.status === 'completed') cumulative += 1;
    const checked = day.completionPct ?? 0;
    return {
      day: day._n,
      topic: day.topic,
      cumulative,
      completionPct: checked,
      studyMinutes: day.studyMinutes ?? 0,
      status: day.status,
    };
  });
}

export function buildWeeklyActivityData(allDays = [], currentDayNum = 1) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const studied = allDays.some((day) => {
      const act = day.studyMinutes > 0 || day.status !== 'not_started';
      return act && day._n <= currentDayNum;
    });
    const dayEntry = allDays.find((day) => day._n === currentDayNum - (6 - i));
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: dayEntry?.studyMinutes ?? 0,
      completed: dayEntry?.status === 'completed' ? 1 : 0,
      date: key,
    };
  });
}
