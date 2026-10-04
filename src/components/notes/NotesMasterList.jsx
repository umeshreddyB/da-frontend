import { useEffect, useRef } from 'react';
import {
  getNotePreview,
  getNoteListTitle,
  isDaySummaryNote,
} from '../../utils/notesHelpers';

export default function NotesMasterList({
  notes,
  activeNoteId,
  searchQuery,
  onSearch,
  onSelect,
  selectedDayNum,
  dayTopic,
}) {
  const listRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeNoteId, selectedDayNum]);

  const summaryNote = notes.find((n) => isDaySummaryNote(n));
  const taskNotes = notes.filter((n) => !isDaySummaryNote(n));

  return (
    <div className="notes-master">
      <div className="notes-master-header">
        <div>
          <h3>{dayTopic || 'Notes'}</h3>
          <span className="notes-master-count">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
            {selectedDayNum ? ` · Day ${selectedDayNum}` : ''}
          </span>
        </div>
      </div>

      <div className="notes-master-search">
        <input
          type="search"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="notes-master-list notes-scroll-pane" ref={listRef}>
        {!notes.length ? (
          <div className="notes-master-empty">
            {selectedDayNum
              ? 'Notes for each subtopic will appear here once the day loads.'
              : 'Pick a date on the calendar to view study notes.'}
          </div>
        ) : (
          <>
            {summaryNote && (
              <div className="notes-master-group">
                <div className="notes-master-group-label">Main topic</div>
                <NoteListItem
                  note={summaryNote}
                  isActive={activeNoteId === summaryNote.id}
                  activeRef={activeRef}
                  onSelect={onSelect}
                  badge="Summary"
                />
              </div>
            )}
            {taskNotes.length > 0 && (
              <div className="notes-master-group">
                <div className="notes-master-group-label">Subtopics</div>
                {taskNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isActive={activeNoteId === note.id}
                    activeRef={activeNoteId === note.id ? activeRef : null}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NoteListItem({ note, isActive, activeRef, onSelect, badge }) {
  const preview = getNotePreview(note);
  const title = getNoteListTitle(note);

  return (
    <button
      type="button"
      ref={isActive ? activeRef : null}
      className={`notes-master-item ${isActive ? 'active' : ''} ${isDaySummaryNote(note) ? 'summary' : 'task'}`}
      onClick={() => onSelect(note.id)}
    >
      <div className="notes-master-item-title">{title}</div>
      {preview && (
        <div className="notes-master-item-meta">
          <span className="notes-master-item-preview">{preview}</span>
        </div>
      )}
      {badge && <span className="notes-master-badge">{badge}</span>}
    </button>
  );
}
