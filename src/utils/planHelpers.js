export function getTotalPlanDays(weeks) {
  if (!weeks?.length) return 0;
  return weeks.reduce((n, w) => n + (w.days?.length || 0), 0);
}

export function assignDayNumbers(weeks) {
  let n = 1;
  return weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => ({ ...day, _n: n++ })),
  }));
}

export function checkedCount(checked) {
  return Object.values(checked).filter(Boolean).length;
}

export function doneCount(dayDone) {
  return Object.values(dayDone).filter(Boolean).length;
}

export function weekDone(week, dayDone) {
  return week.days.every((d) => dayDone[`d${d._n}`]);
}

export function weekChecked(week, checked) {
  let c = 0;
  let t = 0;
  week.days.forEach((d) => {
    d.tasks.forEach((_, i) => {
      t += 1;
      if (checked[`${d._n}_${i}`]) c += 1;
    });
  });
  return { c, t };
}

export function phaseWeeks(plan, phaseId) {
  return plan.filter((w) => w.phase === phaseId);
}

export function currentPhaseId(plan, phases, dayDone) {
  for (const pid of phases.map((p) => p.id)) {
    const ws = phaseWeeks(plan, pid);
    if (!ws.every((w) => weekDone(w, dayDone))) {
      return pid;
    }
  }
  return 6;
}
