import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../api/client';
import { assignDayNumbers } from '../utils/planHelpers';
import { buildLocalAnalytics } from '../utils/localAnalytics';
import {
  buildDailySummaryNote,
  buildTaskNote,
  dailyNoteId,
  taskNoteId,
  migrateLegacyDailyNote,
  migrateDayNotesToKnowledge,
} from '../utils/notesHelpers';

const ProgressContext = createContext(null);
const DS_PROGRESS_KEY = 'ds_plan_progress';

const EMPTY = {
  checked: {},
  dayDone: {},
  dayActivity: {},
  dayNotes: {},
  knowledgeNotes: {},
  bookmarks: [],
  achievements: [],
  revisionState: {},
  settings: { darkMode: false },
  skillMap: { topics: {}, phases: {}, gates: {}, activity: [] },
};

function loadStoredProgress() {
  try {
    const raw = localStorage.getItem(DS_PROGRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasSavedWork(progress) {
  if (!progress) return false;
  const checked = Object.values(progress.checked || {}).some(Boolean);
  const days = Object.values(progress.dayDone || {}).some(Boolean);
  const notes = Object.keys(progress.knowledgeNotes || {}).length > 0;
  const topics = Object.keys(progress.skillMap?.topics || {}).length > 0;
  const gates = Object.keys(progress.skillMap?.gates || {}).length > 0;
  return checked || days || notes || topics || gates || (progress.bookmarks || []).length > 0;
}

export function ProgressProvider({ children }) {
  const [phases, setPhases] = useState([]);
  const [plan, setPlan] = useState([]);
  const [progress, setProgress] = useState(EMPTY);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notesSaveStatus, setNotesSaveStatus] = useState('idle');
  const [notesLastSavedAt, setNotesLastSavedAt] = useState(null);
  const saveTimer = useRef(null);
  const noteSaveTimer = useRef(null);
  const progressRef = useRef(EMPTY);
  progressRef.current = progress;

  const refreshAnalytics = useCallback((nextPlan, nextProgress) => {
    if (!nextPlan?.length) return;
    setAnalytics(buildLocalAnalytics(nextPlan, nextProgress));
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [planData, progressData] = await Promise.all([api.getPlan(), api.getProgress()]);
        setPhases(planData.phases || []);
        const numberedPlan = assignDayNumbers(planData.weeks || []);
        setPlan(numberedPlan);

        let merged = { ...EMPTY, ...progressData, skillMap: { ...EMPTY.skillMap, ...(progressData.skillMap || {}) } };
        const local = loadStoredProgress();
        if (!hasSavedWork(merged) && hasSavedWork(local)) {
          merged = { ...EMPTY, ...local, skillMap: { ...EMPTY.skillMap, ...(local.skillMap || {}) } };
          await api.patchProgress(merged);
          localStorage.removeItem(DS_PROGRESS_KEY);
        }

        if (!Object.keys(merged.knowledgeNotes || {}).length && Object.keys(merged.dayNotes || {}).length) {
          const allDays = numberedPlan.flatMap((week) => week.days);
          const migrated = migrateDayNotesToKnowledge(merged.dayNotes, allDays);
          if (Object.keys(migrated).length) {
            merged = { ...merged, knowledgeNotes: migrated };
            await api.patchProgress({ knowledgeNotes: migrated });
          }
        }

        setProgress(merged);
        setAnalytics(buildLocalAnalytics(numberedPlan, merged));
      } catch (err) {
        setError(err.message || 'Could not reach the study API');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!plan.length) return;
    setAnalytics(buildLocalAnalytics(plan, progress));
  }, [plan, progress]);

  const pendingPatch = useRef({});

  const flushProgress = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const body = pendingPatch.current;
    if (!Object.keys(body).length) return null;
    pendingPatch.current = {};
    try {
      const updated = await api.patchProgress(body);
      setProgress((prev) => {
        const queued = pendingPatch.current;
        const next = { ...prev };
        Object.keys(body).forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(queued, key)) return;
          if (updated[key] !== undefined) {
            next[key] = key === 'skillMap' ? (updated.skillMap || prev.skillMap) : updated[key];
          }
        });
        progressRef.current = next;
        return next;
      });
      return updated;
    } catch (e) {
      pendingPatch.current = { ...body, ...pendingPatch.current };
      console.error(e);
      setError(e.message || 'Could not save progress');
      throw e;
    }
  }, []);

  const persist = useCallback((patch) => {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      flushProgress().catch(() => {});
    }, 300);
  }, [flushProgress]);

  const updateProgress = useCallback(
    (updater) => {
      setProgress((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        const patch = typeof updater === 'function'
          ? Object.keys(next).reduce((acc, key) => {
            if (JSON.stringify(next[key]) !== JSON.stringify(prev[key])) acc[key] = next[key];
            return acc;
          }, {})
          : updater;
        if (Object.keys(patch).length) persist(patch);
        return next;
      });
    },
    [persist]
  );

  const persistNote = useCallback((noteId, note) => {
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    setNotesSaveStatus('saving');
    noteSaveTimer.current = setTimeout(async () => {
      try {
        const updated = await api.patchProgress({ knowledgeNotes: { [noteId]: note } });
        setProgress((prev) => ({
          ...prev,
          knowledgeNotes: updated.knowledgeNotes || prev.knowledgeNotes,
        }));
        setNotesSaveStatus('saved');
        setNotesLastSavedAt(new Date().toISOString());
      } catch (e) {
        console.error(e);
        setNotesSaveStatus('idle');
        setError(e.message || 'Could not save note');
      }
    }, 400);
  }, []);

  const upsertNote = useCallback(
    (noteId, note) => {
      setProgress((prev) => ({
        ...prev,
        knowledgeNotes: { ...prev.knowledgeNotes, [noteId]: note },
      }));
      persistNote(noteId, note);
    },
    [persistNote]
  );

  const ensureDayNotes = useCallback(
    (dayNum) => {
      const day = analytics?.allDays?.find((d) => d._n === dayNum)
        || plan.flatMap((w) => w.days).find((d) => d._n === dayNum);
      if (!day) return;

      setProgress((prev) => {
        const existing = prev.knowledgeNotes || {};
        const patch = {};

        const summaryId = dailyNoteId(dayNum);
        if (existing[summaryId]) {
          const migrated = migrateLegacyDailyNote(existing[summaryId]);
          if (migrated.summary !== existing[summaryId].summary
            || JSON.stringify(migrated.body) !== JSON.stringify(existing[summaryId].body)) {
            patch[summaryId] = migrated;
          }
        } else {
          patch[summaryId] = buildDailySummaryNote(day);
        }

        (day.tasks || []).forEach((task, i) => {
          const id = taskNoteId(dayNum, i);
          if (!existing[id]) patch[id] = buildTaskNote(day, i, task);
        });

        if (!Object.keys(patch).length) return prev;

        if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
        setNotesSaveStatus('saving');
        noteSaveTimer.current = setTimeout(async () => {
          try {
            const updated = await api.patchProgress({ knowledgeNotes: patch });
            setProgress((current) => ({
              ...current,
              knowledgeNotes: updated.knowledgeNotes || current.knowledgeNotes,
            }));
            setNotesSaveStatus('saved');
            setNotesLastSavedAt(new Date().toISOString());
          } catch (e) {
            console.error(e);
            setNotesSaveStatus('idle');
          }
        }, 300);

        return { ...prev, knowledgeNotes: { ...existing, ...patch } };
      });
    },
    [analytics, plan]
  );

  const ensureDailyNote = ensureDayNotes;

  const toggleNotePin = useCallback(
    (noteId) => {
      setProgress((prev) => {
        const note = prev.knowledgeNotes?.[noteId];
        if (!note) return prev;
        const updated = { ...note, pinned: !note.pinned, updatedAt: new Date().toISOString() };
        persistNote(noteId, updated);
        return { ...prev, knowledgeNotes: { ...prev.knowledgeNotes, [noteId]: updated } };
      });
    },
    [persistNote]
  );

  const toggleNoteFavorite = useCallback(
    (noteId) => {
      setProgress((prev) => {
        const note = prev.knowledgeNotes?.[noteId];
        if (!note) return prev;
        const updated = { ...note, favorite: !note.favorite, updatedAt: new Date().toISOString() };
        persistNote(noteId, updated);
        return { ...prev, knowledgeNotes: { ...prev.knowledgeNotes, [noteId]: updated } };
      });
    },
    [persistNote]
  );

  const uploadNoteFile = useCallback((file) => api.uploadNoteFile(file), []);

  const toggleCheck = useCallback(
    (key, val, dayNum) => {
      updateProgress((prev) => {
        const checked = { ...prev.checked, [key]: val };
        const dKey = `d${dayNum}`;
        const dayActivity = {
          ...prev.dayActivity,
          [dKey]: {
            ...(prev.dayActivity[dKey] || {}),
            lastStudiedAt: new Date().toISOString(),
            studyMinutes: prev.dayActivity[dKey]?.studyMinutes || 0,
            sessions: prev.dayActivity[dKey]?.sessions || [],
          },
        };
        return { ...prev, checked, dayActivity };
      });
    },
    [updateProgress]
  );

  const toggleDayDone = useCallback(
    async (dayNum) => {
      const key = `d${dayNum}`;
      const currentlyDone = !!progressRef.current.dayDone?.[key];
      const nextDone = !currentlyDone;

      setProgress((prev) => {
        const next = {
          ...prev,
          dayDone: { ...(prev.dayDone || {}), [key]: nextDone },
        };
        progressRef.current = next;
        return next;
      });

      try {
        let result;
        try {
          await flushProgress();
          result = nextDone
            ? await api.completeDay(dayNum)
            : await api.patchProgress({ dayDone: { [key]: false } });
        } catch (saveError) {
          if (!nextDone) throw saveError;
          result = await api.patchProgress({ dayDone: { [key]: true } });
        }
        const { newAchievements, ...progressData } = result;
        setProgress((prev) => {
          const next = {
            ...prev,
            ...progressData,
            dayDone: { ...(progressData.dayDone || prev.dayDone || {}), [key]: nextDone },
            skillMap: progressData.skillMap || prev.skillMap,
          };
          progressRef.current = next;
          return next;
        });
        return newAchievements || [];
      } catch (e) {
        console.error(e);
        setProgress((prev) => {
          const next = {
            ...prev,
            dayDone: { ...(prev.dayDone || {}), [key]: currentlyDone },
          };
          progressRef.current = next;
          return next;
        });
        setError(e.message || 'Could not update this day');
        return [];
      }
    },
    [flushProgress]
  );

  const toggleBookmark = useCallback(
    (dayNum) => {
      updateProgress((prev) => {
        const bookmarks = prev.bookmarks || [];
        const exists = bookmarks.includes(dayNum);
        return {
          ...prev,
          bookmarks: exists ? bookmarks.filter((b) => b !== dayNum) : [...bookmarks, dayNum],
        };
      });
    },
    [updateProgress]
  );

  const value = useMemo(
    () => ({
      phases,
      plan,
      progress,
      analytics,
      loading,
      error,
      toggleCheck,
      toggleDayDone,
      toggleBookmark,
      refreshAnalytics,
      updateProgress,
      upsertNote,
      ensureDailyNote,
      ensureDayNotes,
      toggleNotePin,
      toggleNoteFavorite,
      uploadNoteFile,
      notesSaveStatus,
      notesLastSavedAt,
    }),
    [
      phases, plan, progress, analytics, loading, error,
      toggleCheck, toggleDayDone, toggleBookmark, refreshAnalytics, updateProgress,
      upsertNote, ensureDailyNote, ensureDayNotes, toggleNotePin, toggleNoteFavorite, uploadNoteFile,
      notesSaveStatus, notesLastSavedAt,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
