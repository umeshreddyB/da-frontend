import { format, parseISO } from 'date-fns';
import AppleCalendar from '../components/dashboard/AppleCalendar';
import TodayTasksPanel from '../components/dashboard/TodayTasksPanel';
import KnowledgeNotesWorkspace from '../components/notes/KnowledgeNotesWorkspace';
import { useSelectedDay } from '../hooks/useSelectedDay';
import { useProgress } from '../context/ProgressContext';

export default function DashboardPage() {
  const { analytics, loading, activeDay, selectedDateKey, isDaySwitching, handleSelectDayFromCalendar, handleSelectDayByNum } = useSelectedDay();
  const { progress, error } = useProgress();

  function openNotesForDay(dayNum) {
    handleSelectDayByNum(dayNum);
    setTimeout(() => {
      document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  if (error && !analytics) {
    return (
      <div className="page unified-dashboard">
        <h1>Dashboard</h1>
        <p className="subtitle">{error}. Start the API from the Backend folder with <code>npm run dev</code>.</p>
      </div>
    );
  }

  if (loading || !analytics) {
    return (
      <div className="page unified-dashboard">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-chart" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  const totalDays = analytics.totalPlanDays ?? analytics.allDays?.length ?? 0;
  const today = analytics.currentDay;
  const startLabel = analytics.planStartDate
    ? format(parseISO(analytics.planStartDate), 'd MMMM yyyy')
    : '';
  const hoursLogged = Math.round((analytics.studyMinutes || 0) / 60);

  return (
    <div className="page unified-dashboard">
      <div className="page-header">
        <div>
          <p className="dash-kicker">12-month plan</p>
          <h1>Dashboard</h1>
          <p className="subtitle">
            Four hours a day, Sundays off{startLabel ? `. Day 1 is ${startLabel}` : ''}.
          </p>
        </div>
      </div>

      <div className="metric-row">
        <div className="card metric-card">
          <span>Current day</span>
          <strong>{analytics.currentDayNum}</strong>
          <em>of {totalDays}</em>
        </div>
        <div className="card metric-card">
          <span>Complete</span>
          <strong>{analytics.overallProgress}%</strong>
          <em>{analytics.daysCompleted} {analytics.daysCompleted === 1 ? 'day' : 'days'} finished</em>
        </div>
        <div className="card metric-card metric-card-topic">
          <span>Learning now</span>
          <strong>{today?.topic || '—'}</strong>
          <em>{today?.phaseName || today?.weekTitle || 'Current phase'}</em>
        </div>
        <div className="card metric-card">
          <span>Streak</span>
          <strong>{analytics.streaks?.current ?? 0}</strong>
          <em>{hoursLogged}h logged</em>
        </div>
      </div>

      <section className="dashboard-section" id="calendar">
        <div className="section-header">
          <h2>Schedule</h2>
          <p className="subtitle">Select a day to open its tasks and notes.</p>
        </div>
        <div className="dashboard-grid">
          <AppleCalendar
            heatmap={analytics.heatmap}
            allDays={analytics.allDays}
            planStartDate={analytics.planStartDate}
            dayDone={progress.dayDone}
            totalPlanDays={analytics.totalPlanDays ?? analytics.allDays?.length}
            selectedDateKey={selectedDateKey}
            onSelectDay={handleSelectDayFromCalendar}
          />
          <TodayTasksPanel
            dayNum={activeDay}
            switching={isDaySwitching}
            onDayChange={handleSelectDayByNum}
            onOpenNotes={() => openNotesForDay(activeDay)}
          />
        </div>
      </section>

      <section className="dashboard-section" id="curriculum">
        <div className="section-header">
          <h2>Curriculum</h2>
          <p className="subtitle">{analytics.daysCompleted} of {totalDays} study days complete.</p>
        </div>
        <div className="card phase-board">
          {(analytics.phaseProgress || []).map((phase) => (
            <div
              key={phase.id}
              className={`phase-row${phase.current ? ' current' : ''}${phase.complete ? ' complete' : ''}`}
            >
              <div className="phase-row-top">
                <span className="phase-row-name">
                  {phase.label}
                  {phase.current && <span className="you-are-here">You are here</span>}
                </span>
                <span className="phase-row-count">{phase.done} / {phase.total}</span>
              </div>
              <div className="phase-track" aria-hidden="true">
                <div style={{ width: `${phase.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <KnowledgeNotesWorkspace selectedDayNum={activeDay} />
    </div>
  );
}
