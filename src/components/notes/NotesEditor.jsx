import { resolveNoteBody, isDaySummaryNote } from '../../utils/notesHelpers';
import RichTextEditor from './RichTextEditor';
import SaveStatus from './SaveStatus';

export default function NotesEditor({
  note,
  saveStatus,
  lastSavedAt,
  onUpdate,
  onUpload,
}) {
  if (!note) {
    return (
      <div className="notes-detail notes-detail-empty">
        <div className="notes-detail-empty-inner">
          <p>Select a note from the list</p>
          <span>Main topic = summary only · Subtopics = full notes</span>
        </div>
      </div>
    );
  }

  function handleBodyChange(body) {
    onUpdate({ ...note, body, updatedAt: new Date().toISOString() });
  }

  function handleSummaryChange(summary) {
    onUpdate({ ...note, summary, updatedAt: new Date().toISOString() });
  }

  const isSummary = isDaySummaryNote(note);

  return (
    <div className="notes-detail">
      <div className="notes-detail-toolbar">
        <span className="notes-detail-kind">{isSummary ? 'Summary' : 'Subtopic note'}</span>
        <SaveStatus status={saveStatus} lastSavedAt={lastSavedAt} />
      </div>
      <div className="notes-detail-body notes-detail-body--blank notes-scroll-pane">
        {isSummary ? (
          <div className="notes-summary-editor">
            <h2 className="notes-summary-topic">{note.topic}</h2>
            <p className="notes-summary-hint">Write a short summary for this main topic only.</p>
            <textarea
              className="notes-summary-textarea"
              value={note.summary || ''}
              onChange={(e) => handleSummaryChange(e.target.value)}
              placeholder="Key takeaways for the day…"
            />
          </div>
        ) : (
          <>
            <h2 className="notes-task-title">{note.subtopic || note.title}</h2>
            <RichTextEditor
              key={note.id}
              content={resolveNoteBody(note)}
              onChange={handleBodyChange}
              placeholder="Start writing…"
              onUpload={onUpload}
            />
          </>
        )}
      </div>
    </div>
  );
}
