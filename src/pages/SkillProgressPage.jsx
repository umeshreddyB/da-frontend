import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { loadSkillCatalog } from '../utils/skillCatalog';
import { buildSkillProfile, MASTERY_BANDS, monthLabels, RANGE_OPTIONS } from '../utils/skillProgress';
import '../styles/skillProgress.css';

function bandName(id) {
  return MASTERY_BANDS.find((band) => band.id === id)?.label || 'Not started';
}

function cellLabel(cell) {
  if (cell.future) return '';
  const parts = [];
  if (cell.topics) parts.push(cell.topics === 1 ? '1 topic completed' : `${cell.topics} topics completed`);
  if (cell.tasks) parts.push(cell.tasks === 1 ? '1 task checked' : `${cell.tasks} tasks checked`);
  if (cell.minutes) parts.push(`${cell.minutes} minutes studied`);
  if (!parts.length) return `${cell.label}: no activity`;
  return `${cell.label}: ${parts.join(', ')}`;
}

function openInMap(navigate, { topicId, phaseId } = {}) {
  if (topicId) sessionStorage.setItem('ds-focus-topic', topicId);
  else if (phaseId != null) sessionStorage.setItem('ds-focus-phase', String(phaseId));
  navigate('/skill-system', {
    state: {
      topicId: topicId || null,
      phaseId: phaseId ?? null,
    },
  });
}

export default function SkillProgressPage() {
  const navigate = useNavigate();
  const { progress, analytics, loading } = useProgress();
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState('year');

  useEffect(() => {
    loadSkillCatalog().then(setCatalog).catch((err) => setError(err.message));
  }, []);

  const studyDays = analytics?.allDays || [];
  const profile = useMemo(
    () => (catalog ? buildSkillProfile(catalog, progress, range, new Date(), studyDays) : null),
    [catalog, progress, range, studyDays],
  );

  if (error) {
    return <div className="page sp"><p className="subtitle">{error}</p></div>;
  }
  if (loading || !profile) {
    return <div className="page sp"><p className="loading-text">Loading skill progress…</p></div>;
  }

  const bandCounts = MASTERY_BANDS.map((band) => ({
    ...band,
    count: profile.mastery.filter((row) => row.band === band.id).length,
  }));

  return (
    <div className="page sp">
      <header className="sp-head">
        <p className="sp-kicker">Skill progress</p>
        <h1>Your data science learning activity</h1>
        <p className="subtitle">Counts come from topics you mark and study time you log.</p>
        <div className="sp-stats" aria-label="Learning summary">
          <Stat value={profile.streaks.current} label="Current streak" />
          <Stat value={profile.leavesDone} label="Topics completed" />
          <Stat value={profile.streaks.activeDays} label="Active days" />
          <Stat value={`${profile.percent}%`} label="Of the map" />
        </div>
      </header>

      {profile.focus ? (
        <div className="sp-next">
          <div>
            <p className="sp-kicker">{profile.focus.phaseName}</p>
            <p className="sp-next-title">{profile.focus.name}</p>
            <p className="sp-next-meta">{profile.focus.reason}</p>
          </div>
          <button
            type="button"
            className="sp-btn"
            onClick={() => openInMap(navigate, { topicId: profile.focus.id, phaseId: profile.focus.phaseId })}
          >
            Continue
          </button>
        </div>
      ) : (
        <p className="sp-note">Every topic in the map is marked complete.</p>
      )}

      <section className="sp-panel">
        <div className="sp-block-head">
          <h2>Learning activity</h2>
          <label className="sp-range">
            <span className="sr-only">Activity range</span>
            <select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Activity range">
              {RANGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <Heatmap heatmap={profile.heatmap} />
        <div className="sp-legend-row">
          <p className="sp-note">
            Each finished task darkens that day. Marking the day complete makes it fully dark.
            {range === 'all' && !profile.heatmap.hasHistory ? ' No dated history yet, so this shows the last year.' : ''}
          </p>
          <div className="sp-legend" aria-hidden="true">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => <i key={level} className={`sp-cell lv-${level}`} />)}
            <span>More</span>
          </div>
        </div>
        <div className="sp-metrics">
          <Mini label="Longest streak" value={profile.streaks.longest === 1 ? '1 day' : `${profile.streaks.longest} days`} />
          <Mini label="Contributions" value={profile.contributions} />
          <Mini label="Time logged" value={profile.hoursLabel} />
          <Mini label="Skills started" value={profile.skillsStarted} />
          <Mini label="Phases" value={`${profile.phasesDone} / ${profile.phasesTotal}`} />
          <Mini label="Gates" value={`${profile.gatesPassed} / ${profile.gatesTotal}`} />
        </div>
      </section>

      <div className="sp-split">
        <section className="sp-panel">
          <h2>Topic mastery</h2>
          <ul className="sp-mastery">
            {profile.mastery.map((row) => {
              const state = row.complete ? 'done' : row.id === profile.current?.id ? 'current' : 'upcoming';
              return (
                <li key={row.id} className={state === 'current' ? 'is-current' : ''}>
                  <button type="button" onClick={() => openInMap(navigate, { phaseId: row.id })}>
                    <span className="sp-mastery-name">
                      <PhaseMark state={state} />
                      {row.short}
                    </span>
                    <span className="sp-mastery-count">{row.done} / {row.total}</span>
                    <span className="sp-track" aria-hidden="true">
                      <i style={{ width: `${row.percent}%` }} />
                    </span>
                    <span className="sp-mastery-pct">{row.percent}%</span>
                    <span className="sp-mastery-band">{bandName(row.band)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="sp-stack">
          <section className="sp-panel">
            <h2>Learning depth</h2>
            <p className="sp-note">From the roadmap’s 12-month, 18-month, and later phases.</p>
            <ul className="sp-depth">
              {profile.depth.map((band) => (
                <li key={band.id}>
                  <div className="sp-depth-row">
                    <span>{band.label}</span>
                    <strong>{band.done} / {band.total}</strong>
                  </div>
                  <span className="sp-track" aria-hidden="true">
                    <i style={{ width: `${band.total ? Math.round((band.done / band.total) * 100) : 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="sp-panel" aria-label="Skill matrix">
            <h2>Skill matrix</h2>
            <p className="sp-note">Phases sitting in each mastery band.</p>
            <div className="sp-bands">
              {bandCounts.map((band) => (
                <div key={band.id} className={band.count ? 'is-active' : ''}>
                  <span>{band.label}</span>
                  <strong>{band.count}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="sp-panel">
        <h2>Roadmap</h2>
        <Roadmap rows={profile.roadmap} onOpen={(phaseId) => openInMap(navigate, { phaseId })} />
        <p className="sp-current">
          {profile.current ? <>You are here · <strong>{profile.current.name}</strong></> : 'The map is complete.'}
        </p>
      </section>

      <div className="sp-split">
        <section className="sp-panel">
          <h2>Recent activity</h2>
          {profile.recent.length === 0 ? (
            <p className="sp-note">No dated activity yet. A topic you mark done is added here and on the graph. Earlier completions still count in the totals above.</p>
          ) : (
            <div className="sp-feed">
              {profile.recent.map((group) => (
                <div key={group.label}>
                  <h3>{group.label}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => (item.gateId != null ? navigate('/gates') : openInMap(navigate, item))}
                        >
                          <PhaseMark state={item.kind === 'studied' ? 'current' : 'done'} />
                          <span>
                            <strong>{item.kind === 'completed' ? `Completed ${item.title}` : item.title}</strong>
                            <em>{item.detail} · {item.when}</em>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="sp-stack">
          {profile.gate && (
            <section className="sp-panel">
              <h2>Next gate</h2>
              <p className="sp-focus-topic">{profile.gate.name}</p>
              <p className="sp-note">
                {profile.gate.passed
                  ? `Passed. ${profile.gate.checks.length} criteria recorded with the gate.`
                  : `${profile.gate.checks.length} criteria. A gate is passed or not passed as a whole.`}
              </p>
              <ul className="sp-checks">
                {profile.gate.checks.map((check) => (
                  <li key={check} className={profile.gate.passed ? 'met' : ''}>
                    <PhaseMark state={profile.gate.passed ? 'done' : 'upcoming'} />
                    {check}
                  </li>
                ))}
              </ul>
              <button type="button" className="sp-link" onClick={() => navigate('/gates')}>View gate</button>
            </section>
          )}

          <section className="sp-panel">
            <h2>Milestones</h2>
            <ul className="sp-checks">
              {profile.milestones.map((item) => (
                <li key={item.id} className={item.done ? 'met' : ''}>
                  <PhaseMark state={item.done ? 'done' : 'upcoming'} />
                  {item.label}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="sp-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Mini({ value, label }) {
  return (
    <div className="sp-mini">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PhaseMark({ state }) {
  if (state === 'done') {
    return (
      <svg className="sp-mark" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" />
        <path d="M4.5 8.2 7 10.5 11.5 5.5" />
      </svg>
    );
  }
  if (state === 'current') {
    return (
      <svg className="sp-mark is-current" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" />
        <circle cx="8" cy="8" r="3" />
      </svg>
    );
  }
  return (
    <svg className="sp-mark is-upcoming" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" />
    </svg>
  );
}

function Roadmap({ rows, onOpen }) {
  const scrollerRef = useRef(null);
  const currentRef = useRef(null);

  useEffect(() => {
    const item = currentRef.current;
    const scroller = scrollerRef.current;
    if (!item || !scroller) return;
    const left = item.offsetLeft - (scroller.clientWidth - item.clientWidth) / 2;
    scroller.scrollLeft = Math.max(0, left);
  }, [rows]);

  return (
    <ol className="sp-road" ref={scrollerRef}>
      {rows.map((row) => (
        <li key={row.id} className={`is-${row.state}`} ref={row.state === 'current' ? currentRef : null}>
          <button type="button" onClick={() => onOpen(row.id)}>
            <span className="sp-road-index">{String(row.id).padStart(2, '0')}</span>
            <span className="sp-road-name">{row.short}</span>
            <span className="sp-road-pct">{row.percent}%</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_MARKS = new Set([0, 2, 4]);

function Heatmap({ heatmap }) {
  const [tip, setTip] = useState(null);
  const labels = monthLabels(heatmap.weeks);

  return (
    <div
      className="sp-heat-scroll"
      onMouseLeave={() => setTip(null)}
    >
      <div
        className="sp-heat"
        role="grid"
        aria-label="Learning activity by day"
        style={{ gridTemplateColumns: `auto repeat(${heatmap.weeks.length}, minmax(11px, 1fr))` }}
      >
        <span className="sp-heat-corner" />
        {labels.map((label, index) => (
          <span className="sp-month" key={`${heatmap.weeks[index].monthKey}-${index}`} style={{ gridColumn: index + 2 }}>
            {label}
          </span>
        ))}
        {WEEKDAYS.map((label, index) => (
          <span className="sp-day" key={label} style={{ gridRow: index + 2 }}>
            {WEEKDAY_MARKS.has(index) ? label : ''}
          </span>
        ))}
        {heatmap.weeks.map((week, weekIndex) => week.cells.map((cell, dayIndex) => (
          cell.future ? (
            <span
              key={cell.key}
              className="sp-cell is-future"
              style={{ gridColumn: weekIndex + 2, gridRow: dayIndex + 2 }}
            />
          ) : (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              className={`sp-cell lv-${cell.level}`}
              style={{ gridColumn: weekIndex + 2, gridRow: dayIndex + 2 }}
              aria-label={cellLabel(cell)}
              onMouseEnter={(event) => setTip({ cell, anchor: event.currentTarget })}
              onFocus={(event) => setTip({ cell, anchor: event.currentTarget })}
              onBlur={() => setTip(null)}
            />
          )
        )))}
      </div>
      {tip && <Tip tip={tip} />}
    </div>
  );
}

function Tip({ tip }) {
  const rect = tip.anchor.getBoundingClientRect();
  const below = rect.top < 88;
  const detail = cellLabel(tip.cell).replace(`${tip.cell.label}: `, '');
  return (
    <div
      className={`sp-tip${below ? ' is-below' : ''}`}
      style={{ left: rect.left + rect.width / 2, top: below ? rect.bottom : rect.top }}
      role="tooltip"
    >
      <strong>{tip.cell.label}</strong>
      <span>{detail}</span>
    </div>
  );
}
