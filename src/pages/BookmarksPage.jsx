import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import DayDetailModal from '../components/calendar/DayDetailModal';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const { analytics, loading } = useProgress();
  const [selectedDay, setSelectedDay] = useState(null);

  function openInNotes(dayNum) {
    navigate('/', { state: { openDay: dayNum, scrollNotes: true } });
  }

  if (loading || !analytics) {
    return (
      <div className="page">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  const bookmarks = analytics.allDays.filter((d) => d.isBookmarked);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Bookmarks</h1>
          <p className="subtitle">{bookmarks.length} saved topic{bookmarks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {!bookmarks.length ? (
        <div className="card empty-state">
          No bookmarks yet. Star topics from the Roadmap.
        </div>
      ) : (
        <div className="smart-list">
          {bookmarks.map((day) => (
            <button key={day._n} className="list-item" onClick={() => setSelectedDay(day._n)}>
              <div>
                <strong>Day {day._n}: {day.topic}</strong>
                <span>Week {day.week} · Phase {day.phase} · {day.completionPct}% done</span>
              </div>
              <span style={{ color: 'var(--primary)', fontSize: 20 }}>★</span>
            </button>
          ))}
        </div>
      )}

      {selectedDay && (
        <DayDetailModal
          dayNum={selectedDay}
          onClose={() => setSelectedDay(null)}
          onOpenNotes={openInNotes}
        />
      )}
    </div>
  );
}
