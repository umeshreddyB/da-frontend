import { useState } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export default function ContributionHeatmap({ heatmap = {}, compact = false }) {
  const [tooltip, setTooltip] = useState(null);
  const end = new Date();
  const start = subDays(end, compact ? 84 : 364);
  const days = eachDayOfInterval({ start, end });

  return (
    <div className={`heatmap-wrap ${compact ? 'compact' : ''}`}>
      {!compact && <h3>Study activity</h3>}
      <div className="heatmap-grid">
        {days.map((date) => {
          const key = format(date, 'yyyy-MM-dd');
          const entry = heatmap[key];
          const level = !entry ? 0 : entry.progress >= 100 ? 4 : entry.progress > 50 ? 3 : entry.progress > 0 ? 2 : 1;
          return (
            <div
              key={key}
              className={`heatmap-cell level-${level}`}
              onMouseEnter={() => entry && setTooltip({ x: 0, entry, date: key })}
              onMouseLeave={() => setTooltip(null)}
              title={entry ? `Day ${entry.dayNum}: ${entry.topic} (${entry.progress}%)` : key}
            />
          );
        })}
      </div>
      {tooltip?.entry && (
        <div className="heatmap-tooltip">
          Day {tooltip.entry.dayNum}: {tooltip.entry.topic} · {tooltip.entry.progress}% · {tooltip.entry.studyMinutes}m
        </div>
      )}
    </div>
  );
}
