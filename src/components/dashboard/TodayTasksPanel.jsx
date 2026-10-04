import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useProgress } from '../../context/ProgressContext';
import AchievementToast from '../achievements/AchievementToast';
import { formatMinutes } from '../../utils/analytics';

function TaskCheckItem({ task, checked, onToggle }) {
  return (
    <li className="task-check-item" onClick={(e) => { e.preventDefault(); onToggle(); }}>
      <motion.div
        className={`task-check-box ${checked ? 'checked' : ''}`}
        animate={{ scale: checked ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.2 }}
      >
        {checked && '✓'}
      </motion.div>
      <span className={`task-check-label ${checked ? 'checked' : ''}`}>{task}</span>
    </li>
  );
}

export default function TodayTasksPanel({ dayNum, onDayChange, onOpenNotes, switching = false }) {
  const { analytics, progress, toggleCheck, toggleDayDone, updateProgress } = useProgress();
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [achievement, setAchievement] = useState(null);
  const intervalRef = useRef(null);

  const totalDays = analytics?.totalPlanDays ?? analytics?.allDays?.length ?? 126;
  const day = analytics?.allDays?.find((d) => d._n === dayNum) || analytics?.currentDay;
  const dn = day?._n;
  const isDone = !!progress.dayDone?.[`d${dn}`];
  const studyMin = progress.dayActivity?.[`d${dn}`]?.studyMinutes || 0;

  const checkedCount = day?.tasks?.filter((_, i) => progress.checked[`${dn}_${i}`]).length ?? 0;
  const totalTasks = day?.tasks?.length ?? 0;
  const pct = totalTasks ? Math.round((checkedCount / totalTasks) * 100) : 0;

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  async function handleToggleDayDone() {
    if (!dn) return;
    const wasComplete = isDone;
    const newAchievements = await toggleDayDone(dn);
    if (!wasComplete) {
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.65 }, colors: ['#9eb0e8', '#7dcea0', '#e2c07a'] });
      if (newAchievements?.length) setAchievement(newAchievements[0]);
    }
  }

  function handleTimer(action) {
    if (!dn) return;
    if (action === 'start') {
      setTimerRunning(true);
      return;
    }
    setTimerRunning(false);
    const minutes = Math.max(1, Math.round(elapsed / 60));
    updateProgress((prev) => {
      const dKey = `d${dn}`;
      const prevAct = prev.dayActivity?.[dKey] || {};
      return {
        ...prev,
        dayActivity: {
          ...prev.dayActivity,
          [dKey]: {
            ...prevAct,
            studyMinutes: (prevAct.studyMinutes || 0) + minutes,
            lastStudiedAt: new Date().toISOString(),
          },
        },
      };
    });
    setElapsed(0);
  }

  if (!day) {
    return <div className="card tasks-panel"><div className="empty-state">No day selected</div></div>;
  }

  return (
    <div className="card tasks-panel tasks-panel-wrap">
      <AnimatePresence mode="wait">
        {switching ? (
          <motion.div
            key="loading"
            className="tasks-panel-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="tasks-panel-spinner" aria-hidden="true" />
            <span>Loading topics…</span>
          </motion.div>
        ) : (
          <motion.div
            key={dn}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
      <div className="tasks-panel-header">
        <div className="tasks-panel-day">Day {dn} · {day.phaseName || day.weekTitle}</div>
        <div className="tasks-panel-topic">{day.topic}</div>
        <div className="tasks-panel-meta">~{day.minutes ? `${day.minutes / 60} hours` : `${totalTasks * 15} min`} estimated</div>
        {onDayChange && (
          <div className="tasks-panel-nav">
            <button className="btn-secondary" disabled={dn <= 1} onClick={() => onDayChange(dn - 1)}>← Prev</button>
            <button className="btn-secondary" disabled={dn >= totalDays} onClick={() => onDayChange(dn + 1)}>Next →</button>
          </div>
        )}
      </div>

      {day.practice && <span className="practice-tag">PRACTICE DAY</span>}

      <ul className="task-checklist">
        {day.tasks.map((task, i) => {
          const key = `${dn}_${i}`;
          const checked = progress.checked[key] || false;
          return (
            <TaskCheckItem
              key={key}
              task={task}
              checked={checked}
              onToggle={() => toggleCheck(key, !checked, dn)}
            />
          );
        })}
      </ul>

      <div className="tasks-panel-footer">
        <div className="tasks-panel-progress-text">
          <span><strong>{checkedCount}</strong> of {totalTasks} tasks</span>
          <span><strong>{pct}%</strong></span>
        </div>
        <div className="progress-bar-wrap">
          <motion.div
            className="progress-bar-fill"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ height: '100%' }}
          />
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: 16 }}
          onClick={handleToggleDayDone}
        >
          {isDone ? 'Mark as incomplete' : 'Mark day complete'}
        </button>
        {onOpenNotes && (
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={onOpenNotes}
          >
            Open in Notes
          </button>
        )}
      </div>

      <div className="timer-row">
        <div>
          <div className="timer-display">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total: {formatMinutes(studyMin + Math.floor(elapsed / 60))}</div>
        </div>
        {!timerRunning ? (
          <button className="btn-secondary" onClick={() => handleTimer('start')}>Start</button>
        ) : (
          <button className="btn-primary" onClick={() => handleTimer('stop')}>Stop</button>
        )}
      </div>

      {achievement && (
        <AchievementToast achievement={achievement} onClose={() => setAchievement(null)} />
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
