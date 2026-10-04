export default function NotesToolbar({ editor, onUpload }) {
  if (!editor) return null;

  function btn(action, label, active) {
    return (
      <button
        type="button"
        className={`notes-toolbar-btn ${active ? 'active' : ''}`}
        onClick={action}
        title={label}
      >
        {label}
      </button>
    );
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    const result = await onUpload(file);
    if (result?.url && file.type.startsWith('image/')) {
      editor.chain().focus().insertContent(`<img src="${result.url}" alt="${result.filename}" />`).run();
    } else if (result?.url) {
      editor.chain().focus().insertContent(`<p><a href="${result.url}" target="_blank">${result.filename}</a></p>`).run();
    }
    e.target.value = '';
  }

  return (
    <div className="notes-toolbar">
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleHighlight().run(), 'Hi', editor.isActive('highlight'))}
      {btn(() => editor.chain().focus().toggleBulletList().run(), '•', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1.', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleTaskList().run(), '☑', editor.isActive('taskList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
      {btn(() => editor.chain().focus().toggleCodeBlock().run(), '{ }', editor.isActive('codeBlock'))}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), '—', false)}
      {btn(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), 'Table', false)}
      <label className="notes-toolbar-btn notes-upload-btn">
        Attach
        <input type="file" accept="image/*,application/pdf" hidden onChange={handleUpload} />
      </label>
    </div>
  );
}
