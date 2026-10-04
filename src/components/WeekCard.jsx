import { AnimatePresence, motion } from 'framer-motion';
import DayRow from './DayRow';
import { weekChecked, weekDone } from '../utils/planHelpers';

export default function WeekCard({
  week,
  isOpen,
  checked,
  dayDone,
  bookmarks = [],
  daysDoneLabel,
  planStartDate,
  totalPlanDays,
  onToggleWeek,
  onToggleCheck,
  onToggleDayDone,
  onToggleBookmark,
}) {
  const { c, t } = weekChecked(week, checked);
  const allDone = weekDone(week, dayDone);

  return (
    <div className={`week-card ${isOpen ? 'open' : ''}`} id={`wk${week.w}`}>
      <div className="week-header" onClick={() => onToggleWeek(week.w)}>
        <div className="week-badge">W{week.w}</div>
        <div className="week-info">
          <div className="week-title">{week.title}</div>
          <div className="week-meta">
            Week {week.w} · Phase {week.phase}{allDone ? ' · Complete ✓' : ''}
          </div>
        </div>
        <div className="week-progress-pill">{daysDoneLabel || `${c}/${t} tasks`}</div>
        <span className="week-chevron">⌄</span>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="week-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            {week.note && <div className="note-box">💡 {week.note}</div>}
            {week.days.map((day) => (
              <DayRow
                key={day._n}
                day={day}
                checked={checked}
                dayDone={dayDone}
                planStartDate={planStartDate}
                totalPlanDays={totalPlanDays}
                isBookmarked={bookmarks.includes(day._n)}
                onToggleCheck={(key, val) => onToggleCheck(key, val, day._n)}
                onToggleDayDone={onToggleDayDone}
                onToggleBookmark={onToggleBookmark ? () => onToggleBookmark(day._n) : undefined}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
