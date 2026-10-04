import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { useProgress } from '../context/ProgressContext';

export function useSelectedDay() {
  const location = useLocation();
  const { analytics, loading, ensureDailyNote } = useProgress();
  const [selectedDayNum, setSelectedDayNum] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [isDaySwitching, setIsDaySwitching] = useState(false);

  useEffect(() => {
    if (location.state?.openDay) {
      const dayNum = location.state.openDay;
      setSelectedDayNum(dayNum);
      setSelectedDateKey(format(startOfDay(new Date()), 'yyyy-MM-dd'));
      ensureDailyNote(dayNum);
      if (location.state.scrollNotes) {
        setTimeout(() => {
          document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, ensureDailyNote]);

  useEffect(() => {
    if (analytics && selectedDayNum === null) {
      setSelectedDayNum(analytics.scheduledToday ?? analytics.currentDayNum);
      setSelectedDateKey(analytics.scheduledDateKey || format(startOfDay(new Date()), 'yyyy-MM-dd'));
    }
  }, [analytics, selectedDayNum]);

  function handleSelectDayFromCalendar(dayNum, calendarDate) {
    setIsDaySwitching(true);
    setSelectedDayNum(dayNum);
    setSelectedDateKey(format(startOfDay(calendarDate), 'yyyy-MM-dd'));
    ensureDailyNote(dayNum);
    window.setTimeout(() => setIsDaySwitching(false), 420);
  }

  function handleSelectDay(dayNum, calendarDate = null) {
    setSelectedDayNum(dayNum);
    if (calendarDate) {
      setSelectedDateKey(format(startOfDay(calendarDate), 'yyyy-MM-dd'));
    }
    ensureDailyNote(dayNum);
  }

  function handleSelectDayByNum(dayNum) {
    handleSelectDay(dayNum, null);
  }

  const activeDay = selectedDayNum ?? analytics?.scheduledToday ?? analytics?.currentDayNum ?? null;

  return {
    analytics,
    loading,
    activeDay,
    selectedDateKey,
    isDaySwitching,
    handleSelectDay,
    handleSelectDayFromCalendar,
    handleSelectDayByNum,
    ensureDailyNote,
  };
}
