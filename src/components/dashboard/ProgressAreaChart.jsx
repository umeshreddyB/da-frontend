import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { buildProgressChartData } from '../../utils/chartData';
import theme from '../../theme';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 12,
      padding: '10px 14px', boxShadow: theme.shadowMd || '0 4px 16px rgba(37,99,235,0.1)', fontSize: 13,
    }}>
      <strong style={{ color: theme.primary }}>Day {d.day}</strong>
      <div style={{ color: theme.textMuted, marginTop: 4 }}>{d.topic}</div>
      <div style={{ marginTop: 6, color: theme.text }}>
        {d.cumulative} days completed · {d.completionPct}% · {d.studyMinutes}m
      </div>
    </div>
  );
}

export default function ProgressAreaChart({ allDays = [] }) {
  const data = buildProgressChartData(allDays);
  const totalDays = allDays.length || 126;

  return (
    <div className="card chart-card">
      <h2>Study Progress</h2>
      <p className="subtitle">Day 1 → Day {totalDays} · cumulative completion</p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={theme.primary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: theme.textMuted }}
            tickLine={false}
            axisLine={false}
            interval={19}
          />
          <YAxis
            tick={{ fontSize: 11, fill: theme.textMuted }}
            tickLine={false}
            axisLine={false}
            domain={[0, totalDays]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={theme.primary}
            strokeWidth={2.5}
            fill="url(#progressGradient)"
            animationDuration={1200}
            dot={false}
            activeDot={{ r: 5, fill: theme.primary, stroke: theme.bg, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
