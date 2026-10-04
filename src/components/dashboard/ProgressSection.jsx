import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useProgress } from '../../context/ProgressContext';
import ContributionHeatmap from '../heatmap/ContributionHeatmap';
import { formatMinutes } from '../../utils/analytics';
import { api } from '../../api/client';
import theme from '../../theme';

export default function ProgressSection() {
  const { analytics, loading } = useProgress();

  if (loading || !analytics) {
    return (
      <div className="dashboard-section" id="progress">
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const key = d.toISOString().slice(0, 10);
    const entry = Object.entries(analytics.heatmap || {}).find(([date]) => date === key)?.[1];
    return { label, minutes: entry?.studyMinutes ?? 0 };
  });

  const mostStudiedPhase = analytics.phaseProgress?.reduce(
    (best, p) => (p.progress > (best?.progress ?? 0) ? p : best),
    null
  );

  const upcoming = analytics.allDays?.find((d) => d._n === analytics.currentDayNum);

  async function handleExport() {
    const report = await api.exportReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-report.json';
    a.click();
  }

  return (
    <div className="dashboard-section" id="progress">
      <div className="section-header section-header-row">
        <div>
          <h2>Advanced Progress</h2>
          <p className="subtitle">Analytics, streaks, and study consistency</p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleExport}>Export report</button>
      </div>

      <p className="section-title">Overall</p>
      <div className="stat-grid">
        <div className="stat-item"><strong>{analytics.totalPlanDays ?? analytics.allDays?.length ?? 126}</strong><span>Total days</span></div>
        <div className="stat-item"><strong>{analytics.daysCompleted}</strong><span>Completed</span></div>
        <div className="stat-item"><strong>{analytics.daysRemaining}</strong><span>Remaining</span></div>
        <div className="stat-item"><strong>{analytics.streaks.current}</strong><span>Current streak</span></div>
        <div className="stat-item"><strong>{analytics.streaks.longest}</strong><span>Longest streak</span></div>
        <div className="stat-item"><strong>{analytics.overallProgress}%</strong><span>Completion</span></div>
      </div>

      <p className="section-title">Phase Progress</p>
      <div className="card phase-bar-list">
        {analytics.phaseProgress?.map((phase) => (
          <div key={phase.id} className="phase-bar-item">
            <div className="phase-bar-header">
              <span>{phase.label}</span>
              <span>{phase.progress}%</span>
            </div>
            <div className="progress-bar-wrap">
              <motion.div
                className="progress-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${phase.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%' }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="section-title">Last 7 Days</p>
      <div className="card chart-card" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.textMuted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: theme.textMuted }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 13 }} />
            <Bar dataKey="minutes" fill={theme.primary} radius={[6, 6, 0, 0]} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <ContributionHeatmap heatmap={analytics.heatmap} />
      </div>

      <p className="section-title">Statistics</p>
      <div className="stats-footer-grid">
        <div className="stats-footer-item">
          <strong>{analytics.tasksChecked}</strong>
          <span>Tasks completed</span>
        </div>
        <div className="stats-footer-item">
          <strong>{formatMinutes(analytics.avgStudyMinutes)}</strong>
          <span>Avg study duration</span>
        </div>
        <div className="stats-footer-item">
          <strong>{mostStudiedPhase?.label ?? '—'}</strong>
          <span>Most studied phase</span>
        </div>
        <div className="stats-footer-item">
          <strong>{upcoming?.topic?.slice(0, 24) ?? '—'}{upcoming?.topic?.length > 24 ? '…' : ''}</strong>
          <span>Upcoming · Day {analytics.currentDayNum}</span>
        </div>
      </div>
    </div>
  );
}
