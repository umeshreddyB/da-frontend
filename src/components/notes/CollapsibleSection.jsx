import RichTextEditor from './RichTextEditor';

export default function CollapsibleSection({ title, hint, content, onChange, onUpload, flat }) {
  if (flat) {
    return (
      <div className="notes-flat-section">
        <div className="notes-flat-section-head">
          <h3>{title}</h3>
          {hint && <span>{hint}</span>}
        </div>
        <RichTextEditor content={content} onChange={onChange} placeholder={hint} onUpload={onUpload} />
      </div>
    );
  }

  return (
    <div className="note-collapsible">
      <div className="notes-flat-section-head">
        <h3>{title}</h3>
        {hint && <span>{hint}</span>}
      </div>
      <RichTextEditor content={content} onChange={onChange} placeholder={hint} onUpload={onUpload} />
    </div>
  );
}
