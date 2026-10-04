export default function NoteSummaryCard({ summary, onChange }) {
  return (
    <div className="notes-summary">
      <label className="notes-summary-label">Quick Summary</label>
      <textarea
        className="notes-summary-input"
        value={summary || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Key points for quick review…"
        rows={2}
      />
    </div>
  );
}
