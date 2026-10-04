import { useProgress } from '../../context/ProgressContext';
import DayRow from '../DayRow';
import { formatMinutes } from '../../utils/analytics';

export default function DayDetailModal({ dayNum, onClose, onOpenNotes }) {
  const { analytics, progress, toggleCheck, toggleDayDone, toggleBookmark } = useProgress();
  const day = analytics?.allDays?.find((d) => d._n === dayNum);
  if (!day) return null;

  const studyMin = progress.dayActivity?.[`d${dayNum}`]?.studyMinutes || 0;
  const isBookmarked = (progress.bookmarks || []).includes(dayNum);
  const noteId = `day-${dayNum}`;
  const hasNote = !!progress.knowledgeNotes?.[noteId];

  function handleOpenNotes() {
    onOpenNotes?.(dayNum);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="today-badge">Day {dayNum} · Week {day.week}</span>
            <h2>{day.topic}</h2>
            <p className="subtitle">{day.completionPct}% · {formatMinutes(studyMin)} studied</p>
          </div>
          <button className="icon-btn" onClick={() => toggleBookmark(dayNum)}>{isBookmarked ? '★' : '☆'}</button>
        </div>
        <DayRow
          day={day}
          checked={progress.checked}
          dayDone={progress.dayDone}
          onToggleCheck={(key, val) => toggleCheck(key, val, dayNum)}
          onToggleDayDone={toggleDayDone}
        />
        <div className="notes-open-panel">
          <p className="subtitle">
            {hasNote ? 'Your notes for this day are in the Knowledge Notes section.' : 'Capture key concepts, doubts, and revision notes in Knowledge Notes.'}
          </p>
          <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={handleOpenNotes}>
            Open in Notes
          </button>
        </div>
        <button className="auth-btn" style={{ marginTop: 12, width: '100%' }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
