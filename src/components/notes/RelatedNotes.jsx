export default function RelatedNotes({ notes, onSelect }) {
  if (!notes?.length) return null;

  return (
    <div className="related-notes">
      <h4>Related Notes</h4>
      <div className="related-notes-list">
        {notes.map((note) => (
          <button key={note.id} type="button" className="related-note-btn" onClick={() => onSelect(note.id)}>
            <strong>{note.title || note.topic}</strong>
            {note.week && <span>Week {note.week}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
