export default function WeeklyReport({ report }) {
  if (!report) return null;

  return (
    <div className="card">
      <h3>Weekly report — Week {report.weekNum}</h3>
      <div className="mini-stats">
        <div><strong>{report.daysCompleted}/{report.totalDays}</strong><span>days</span></div>
        <div><strong>{report.tasksCompleted}/{report.totalTasks}</strong><span>tasks</span></div>
        <div><strong>{report.completionPct}%</strong><span>completion</span></div>
        <div><strong>{report.avgStudyMinutes}m</strong><span>avg time</span></div>
      </div>
      {report.weakTopics?.length > 0 && (
        <div className="report-section">
          <h4>Weak topics</h4>
          {report.weakTopics.map((t) => <p key={t.day}>Day {t.day}: {t.topic} ({t.pct}%)</p>)}
        </div>
      )}
      {report.strongTopics?.length > 0 && (
        <div className="report-section">
          <h4>Strong topics</h4>
          {report.strongTopics.map((t) => <p key={t.day}>Day {t.day}: {t.topic}</p>)}
        </div>
      )}
    </div>
  );
}
