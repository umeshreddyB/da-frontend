import { useEffect, useMemo, useState } from 'react';
import { useProgress } from '../../context/ProgressContext';
import {
  dailyNoteId,
  searchNotes,
  sortNotesForDay,
  extractTagsFromText,
  tipTapDocToPlainText,
  isDaySummaryNote,
} from '../../utils/notesHelpers';
import NotesMasterList from './NotesMasterList';
import NotesEditor from './NotesEditor';

export default function KnowledgeNotesWorkspace({ selectedDayNum }) {
  const {
    progress,
    analytics,
    upsertNote,
    ensureDayNotes,
    uploadNoteFile,
    notesSaveStatus,
    notesLastSavedAt,
  } = useProgress();

  const [activeNoteId, setActiveNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const knowledgeNotes = progress.knowledgeNotes || {};
  const planStartDate = analytics?.planStartDate;
  const selectedDay = analytics?.allDays?.find((d) => d._n === selectedDayNum);

  useEffect(() => {
    if (selectedDayNum) {
      ensureDayNotes(selectedDayNum);
      setActiveNoteId(dailyNoteId(selectedDayNum));
    }
  }, [selectedDayNum, ensureDayNotes]);

  const displayedNotes = useMemo(() => {
    if (!selectedDayNum) return [];
    if (searchQuery.trim()) {
      return searchNotes(knowledgeNotes, searchQuery).filter((n) => n.dayNum === selectedDayNum);
    }
    return sortNotesForDay(knowledgeNotes, selectedDayNum);
  }, [knowledgeNotes, searchQuery, selectedDayNum]);

  const activeNote = activeNoteId ? knowledgeNotes[activeNoteId] : null;

  function handleUpdate(note) {
    const text = isDaySummaryNote(note)
      ? (note.summary || '')
      : tipTapDocToPlainText(note.body);
    const tags = extractTagsFromText(text);
    upsertNote(note.id, { ...note, tags });
  }

  return (
    <section className="dashboard-section notes-app-wrap" id="notes">
      <div className="notes-app-header">
        <h2>Notes</h2>
        <p className="subtitle">
          {selectedDay
            ? `Day ${selectedDayNum} · ${selectedDay.topic}`
            : 'Select a study day to open its notes'}
        </p>
      </div>

      <div className="notes-app card">
        <NotesMasterList
          notes={displayedNotes}
          activeNoteId={activeNoteId}
          planStartDate={planStartDate}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSelect={setActiveNoteId}
          selectedDayNum={selectedDayNum}
          dayTopic={selectedDay?.topic}
        />
        <NotesEditor
          note={activeNote}
          saveStatus={notesSaveStatus}
          lastSavedAt={notesLastSavedAt}
          onUpdate={handleUpdate}
          onUpload={uploadNoteFile}
        />
      </div>
    </section>
  );
}
