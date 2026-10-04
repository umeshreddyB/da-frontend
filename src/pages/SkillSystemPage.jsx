import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { recordSkillChanges } from '../utils/skillProgress';

const SECTION_IDS = ['roadmap', 'skills', 'projects', 'gates', 'progress-panel', 'career'];

export default function SkillSystemPage({ hash = '' }) {
  const frameRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const focusRef = useRef(location.state);
  const { analytics, progress, updateProgress } = useProgress();

  const position = useMemo(() => {
    const completedSkillPhaseIds = (analytics?.phaseProgress || [])
      .filter((phase) => phase.complete)
      .map((phase) => phase.id - 1);
    return {
      skillPhaseId: analytics?.skillPhaseId ?? 0,
      topic: analytics?.currentDay?.topic || '',
      dayNum: analytics?.currentDay?._n || 1,
      phaseName: analytics?.currentDay?.phaseName || analytics?.currentDay?.weekTitle || '',
      completedSkillPhaseIds,
      focus: hash === '#gates' ? 'gate' : 'phase',
      skillMap: progress.skillMap || { topics: {}, phases: {}, gates: {} },
    };
  }, [analytics, hash, progress.skillMap]);

  function showSection(event) {
    const frame = event.currentTarget;
    const doc = frame.contentDocument;
    if (!doc || doc.getElementById('skill-frame-scroll')) return;

    const style = doc.createElement('style');
    style.id = 'skill-frame-scroll';
    const sectionId = hash.replace('#', '');
    const onlySection = sectionId
      ? `
        body > header, .hero, .minimap, .skip,
        ${SECTION_IDS.map((id) => `#${id}`).join(', ')} { display: none !important; }
        #${sectionId} { display: block !important; }
        main { padding: 0 !important; background: #080A0D !important; }
      `
      : `
        #skills, #projects, #gates, #progress-panel,
        .nav-links a[href="#skills"], .nav-links a[href="#projects"],
        .nav-links a[href="#gates"], .nav-links a[href="#progress-panel"] { display: none !important; }
      `;
    style.textContent = `html, body { overflow: auto !important; height: auto !important; } ${onlySection}`;
    doc.head.appendChild(style);
    frame.contentWindow?.scrollTo(0, 0);
  }

  function pushPosition() {
    const win = frameRef.current?.contentWindow;
    if (!win?.applyStudyPosition || !analytics) return;
    const focus = focusRef.current;
    win.applyStudyPosition({
      ...position,
      focusTopicId: focus?.topicId || null,
      focusPhaseId: focus?.phaseId ?? null,
    });
    focusRef.current = null;
  }

  useEffect(() => {
    function onMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === 'ds-nav' && typeof event.data.path === 'string') {
        navigate(event.data.path);
        return;
      }
      if (event.data?.type !== 'ds-skill-state') return;
      const skillMap = event.data.skillMap;
      if (!skillMap) return;
      updateProgress((prev) => ({
        ...prev,
        skillMap: recordSkillChanges(prev.skillMap, skillMap),
      }));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate, updateProgress]);

  useEffect(() => {
    pushPosition();
  }, [position, analytics]);

  return (
    <iframe
      ref={frameRef}
      key={hash || 'overview'}
      className="skill-system-frame"
      title="Data Science Skill-Development System"
      src="/skill-system.html"
      onLoad={(event) => {
        showSection(event);
        pushPosition();
      }}
    />
  );
}
