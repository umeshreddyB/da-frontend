import { calendarDateForPlanDay, dayNumToDate } from './schedule';

function noteCalendarDate(note, planStartDate, dayDone, totalPlanDays) {
  if (!note.dayNum || !planStartDate) return null;
  if (dayDone != null && totalPlanDays != null) {
    return calendarDateForPlanDay(note.dayNum, planStartDate, dayDone, totalPlanDays)
      ?? dayNumToDate(note.dayNum, planStartDate);
  }
  return dayNumToDate(note.dayNum, planStartDate);
}

export const DAILY_SECTIONS = [
  { key: 'keyConcepts', label: 'Key Concepts', hint: 'Things learned today.' },
  { key: 'importantPoints', label: 'Important Points', hint: 'Short summary.' },
  { key: 'doubts', label: 'Doubts', hint: 'Topics requiring revision.' },
  { key: 'interviewQuestions', label: 'Interview Questions', hint: 'Questions discovered during study.' },
  { key: 'examples', label: 'Examples', hint: 'Code snippets and diagrams.' },
  { key: 'revisionNotes', label: 'Revision Notes', hint: 'Quick review notes.' },
  { key: 'personalThoughts', label: 'Personal Thoughts', hint: 'Observations and learning experiences.' },
];

export const NOTE_FOLDERS = [
  { id: 'all', label: 'All Notes' },
  { id: 'daily', label: 'Daily Notes' },
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'revision', label: 'Revision' },
];

/** @deprecated use NOTE_FOLDERS */
export const NOTE_CATEGORIES = NOTE_FOLDERS;

export function dailyNoteId(dayNum) {
  return `day-${dayNum}`;
}

export function taskNoteId(dayNum, taskIndex) {
  return `day-${dayNum}-task-${taskIndex}`;
}

export function isDaySummaryNote(note) {
  return note?.type === 'daily';
}

export function isTaskNote(note) {
  return note?.type === 'task';
}

export function emptyTipTapDoc() {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

export function textToTipTapDoc(text) {
  if (!text?.trim()) return emptyTipTapDoc();
  return {
    type: 'doc',
    content: text.split('\n').filter(Boolean).map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

export function tipTapDocToPlainText(doc) {
  if (!doc?.content) return '';
  const walk = (nodes) =>
    nodes
      .map((node) => {
        if (node.type === 'text') return node.text || '';
        if (node.content) return walk(node.content);
        return '';
      })
      .join('\n');
  return walk(doc.content).trim();
}

export function extractTagsFromText(text) {
  const matches = text.match(/#([A-Za-z][A-Za-z0-9_]*)/g) || [];
  return [...new Set(matches.map((t) => t.slice(1)))];
}

export function hasLegacySectionContent(note) {
  if (note.summary?.trim()) return true;
  return DAILY_SECTIONS.some(({ key }) => tipTapDocToPlainText(note.sections?.[key]));
}

export function resolveNoteBody(note) {
  if (!note) return emptyTipTapDoc();
  if (tipTapDocToPlainText(note.body)) return note.body;

  const blocks = [];
  if (note.summary?.trim()) {
    blocks.push({ type: 'paragraph', content: [{ type: 'text', text: note.summary.trim() }] });
  }
  DAILY_SECTIONS.forEach(({ key }) => {
    const text = tipTapDocToPlainText(note.sections?.[key]);
    if (text) {
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text }] });
    }
  });
  if (blocks.length) return { type: 'doc', content: blocks };
  return note.body || emptyTipTapDoc();
}

export function getNotePreview(note) {
  let text = '';
  if (isDaySummaryNote(note)) {
    text = (note.summary || '').trim();
    if (!text) text = tipTapDocToPlainText(resolveNoteBody(note));
  } else {
    text = tipTapDocToPlainText(resolveNoteBody(note));
  }
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.slice(0, 120) + (text.length > 120 ? '…' : '');
}

export function getNoteListTitle(note) {
  if (isDaySummaryNote(note)) return note.topic || note.title || `Day ${note.dayNum}`;
  return note.subtopic || note.title || `Task ${(note.taskIndex ?? 0) + 1}`;
}

export function filterNotesByCategory(notes, categoryId) {
  const list = Object.values(notes || {});
  switch (categoryId) {
    case 'favorites':
      return list.filter((n) => n.favorite);
    case 'pinned':
      return list.filter((n) => n.pinned);
    case 'all':
      return [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    case 'daily':
      return list.filter((n) => n.type === 'daily' || n.type === 'task');
    case 'revision':
      return list.filter((n) => n.type === 'revision' || n.tags?.includes('revision'));
    default:
      return [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

export function searchNotes(notes, query) {
  const q = query.toLowerCase().trim();
  if (!q) return Object.values(notes || {});
  return Object.values(notes || {}).filter((note) => {
    const haystack = [
      note.title,
      note.topic,
      note.subtopic,
      note.summary,
      note.tags?.join(' '),
      `week ${note.week}`,
      `phase ${note.phase}`,
      getNotePreview(note),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortNotesForDisplay(notes, categoryId, planStartDate, dayDone, totalPlanDays) {
  const filtered = filterNotesByCategory(notes, categoryId);
  return filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return getNoteSortDate(b, planStartDate, dayDone, totalPlanDays)
      - getNoteSortDate(a, planStartDate, dayDone, totalPlanDays);
  });
}

export function findRelatedNotes(notes, activeNote, limit = 3) {
  if (!activeNote) return [];
  const others = Object.values(notes || {}).filter((n) => n.id !== activeNote.id);
  const activeTags = new Set(activeNote.tags || []);
  const activeWords = new Set(
    (activeNote.topic || activeNote.title || '')
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
  );

  return others
    .map((note) => {
      let score = 0;
      (note.tags || []).forEach((t) => { if (activeTags.has(t)) score += 3; });
      if (note.week === activeNote.week) score += 2;
      if (note.phase === activeNote.phase) score += 1;
      const words = (note.topic || note.title || '').toLowerCase().split(/\W+/);
      words.forEach((w) => { if (activeWords.has(w)) score += 1; });
      return { note, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ note }) => note);
}

export function buildDailySummaryNote(day) {
  const now = new Date().toISOString();
  return {
    id: dailyNoteId(day._n),
    type: 'daily',
    dayNum: day._n,
    week: day.week,
    phase: day.phase,
    topic: day.topic,
    title: `Day ${day._n} · ${day.topic}`,
    summary: '',
    pinned: false,
    favorite: false,
    tags: [],
    relatedNoteIds: [],
    sections: {},
    body: emptyTipTapDoc(),
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** @deprecated use buildDailySummaryNote */
export function buildDailyNoteTemplate(day) {
  return buildDailySummaryNote(day);
}

export function buildTaskNote(day, taskIndex, subtopic) {
  const now = new Date().toISOString();
  return {
    id: taskNoteId(day._n, taskIndex),
    type: 'task',
    dayNum: day._n,
    week: day.week,
    phase: day.phase,
    topic: day.topic,
    subtopic,
    taskIndex,
    title: subtopic,
    summary: '',
    pinned: false,
    favorite: false,
    tags: [],
    relatedNoteIds: [],
    sections: {},
    body: emptyTipTapDoc(),
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function migrateLegacyDailyNote(note) {
  if (!isDaySummaryNote(note)) return note;
  if (note.summary?.trim()) return note;
  const fromBody = tipTapDocToPlainText(note.body);
  if (!fromBody) return note;
  return { ...note, summary: fromBody, body: emptyTipTapDoc() };
}

export function buildDayNotesBundle(day) {
  const notes = {};
  notes[dailyNoteId(day._n)] = buildDailySummaryNote(day);
  (day.tasks || []).forEach((task, i) => {
    notes[taskNoteId(day._n, i)] = buildTaskNote(day, i, task);
  });
  return notes;
}

export function sortNotesForDay(knowledgeNotes, dayNum) {
  const dayNotes = Object.values(knowledgeNotes || {}).filter((n) => n.dayNum === dayNum);
  const summary = dayNotes.find((n) => isDaySummaryNote(n));
  const tasks = dayNotes
    .filter((n) => isTaskNote(n))
    .sort((a, b) => (a.taskIndex ?? 0) - (b.taskIndex ?? 0));
  return [summary, ...tasks].filter(Boolean);
}

export function migrateDayNotesToKnowledge(dayNotes, allDays) {
  const result = {};
  Object.entries(dayNotes || {}).forEach(([dayNumStr, legacy]) => {
    const dayNum = Number(dayNumStr);
    const day = allDays?.find((d) => d._n === dayNum);
    if (!day) return;
    const hasContent = legacy.learned || legacy.takeaways || legacy.doubts || legacy.revision;
    if (!hasContent) return;
    const note = buildDailyNoteTemplate(day);
    note.sections.keyConcepts = textToTipTapDoc(legacy.learned || '');
    note.sections.importantPoints = textToTipTapDoc(legacy.takeaways || '');
    note.sections.doubts = textToTipTapDoc(legacy.doubts || '');
    note.sections.revisionNotes = textToTipTapDoc(legacy.revision || '');
    note.updatedAt = legacy.updatedAt || note.updatedAt;
    result[note.id] = note;
  });
  return result;
}

export function journalGroupLabel(updatedAt) {
  const now = new Date();
  const d = new Date(updatedAt);
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 Days';
  if (diffDays <= 30) return 'Previous 30 Days';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getNoteSortDate(note, planStartDate, dayDone, totalPlanDays) {
  const d = noteCalendarDate(note, planStartDate, dayDone, totalPlanDays);
  if (d) return d;
  return new Date(note.updatedAt || note.createdAt || Date.now());
}

export function formatNoteDisplayDate(note, planStartDate, dayDone, totalPlanDays) {
  const d = noteCalendarDate(note, planStartDate, dayDone, totalPlanDays)
    ?? new Date(note.updatedAt || Date.now());
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const timePart = new Date(note.updatedAt || d).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
}

export function formatNoteListDate(note, planStartDate, dayDone, totalPlanDays) {
  const d = noteCalendarDate(note, planStartDate, dayDone, totalPlanDays)
    ?? new Date(note.updatedAt || Date.now());
  const now = new Date();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return new Date(note.updatedAt || d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function periodLabelForNote(note, planStartDate, dayDone, totalPlanDays) {
  const d = noteCalendarDate(note, planStartDate, dayDone, totalPlanDays)
    ?? new Date(note.updatedAt || Date.now());
  const now = new Date();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 Days';
  if (diffDays <= 30) return 'Previous 30 Days';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function groupNotesByPeriod(notes, planStartDate, dayDone, totalPlanDays) {
  const map = new Map();
  const order = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days'];
  [...notes]
    .sort((a, b) => getNoteSortDate(b, planStartDate, dayDone, totalPlanDays)
      - getNoteSortDate(a, planStartDate, dayDone, totalPlanDays))
    .forEach((note) => {
      const label = periodLabelForNote(note, planStartDate, dayDone, totalPlanDays);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(note);
    });

  const entries = [...map.entries()];
  entries.sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return b.localeCompare(a);
  });
  return entries.map(([label, items]) => ({ label, items }));
}

export function getFolderCounts(notes) {
  const all = Object.values(notes || {});
  return NOTE_FOLDERS.reduce((acc, folder) => {
    if (folder.id === 'all') acc[folder.id] = all.length;
    else acc[folder.id] = filterNotesByCategory(notes, folder.id).length;
    return acc;
  }, {});
}

export function getFolderLabel(folderId) {
  return NOTE_FOLDERS.find((f) => f.id === folderId)?.label || 'Notes';
}
