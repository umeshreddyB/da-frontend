import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { calendarDateForPlanDay, dayNumToDate } from '../utils/schedule';

export default function DayRow({
  day,
  checked,
  dayDone,
  isBookmarked,
  planStartDate,
  totalPlanDays,
  onToggleCheck,
  onToggleDayDone,
  onToggleBookmark,
}) {
  const dn = day._n;
  const isDone = dayDone[`d${dn}`];
  const topicClass = isDone ? 'day-topic done-text' : 'day-topic';
  let calendarLabel = null;
  if (planStartDate) {
    const calDate = totalPlanDays
      ? calendarDateForPlanDay(dn, planStartDate, dayDone, totalPlanDays)
      : null;
    calendarLabel = format(calDate ?? dayNumToDate(dn, planStartDate), 'MMM d');
  }

  return (
    <div className={`day-row ${isDone ? 'done' : ''}`}>
      <div className="day-lbl">
        {day.lbl}
        {calendarLabel && <div className="day-date">{calendarLabel}</div>}
        <div className="day-num">D{dn}</div>
      </div>
      <div className="day-content">
        {day.practice && <span className="practice-tag">PRACTICE</span>}
        <div className={topicClass}>{day.topic}</div>
        <ul className="task-list">
          {day.tasks.map((task, i) => {
            const key = `${dn}_${i}`;
            const isc = checked[key] || false;
            return (
              <li key={key} className="task-item">
                <input
                  type="checkbox"
                  className="task-check"
                  id={`cb_${key}`}
                  checked={isc}
                  onChange={(e) => onToggleCheck(key, e.target.checked)}
                />
                <label htmlFor={`cb_${key}`} className={`task-label ${isc ? 'checked' : ''}`}>
                  {task}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        {onToggleBookmark && (
          <motion.button
            className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
            onClick={onToggleBookmark}
            whileTap={{ scale: 0.85 }}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            {isBookmarked ? '★' : '☆'}
          </motion.button>
        )}
        <motion.button
          className={`day-done-btn ${isDone ? 'done' : ''}`}
          onClick={() => onToggleDayDone(dn)}
          whileTap={{ scale: 0.9 }}
          title={isDone ? 'Mark undone' : 'Mark day complete'}
        >
          {isDone ? '✓' : '○'}
        </motion.button>
      </div>
    </div>
  );
}
