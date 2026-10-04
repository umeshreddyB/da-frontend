import { formatDistanceToNow } from 'date-fns';

export default function SaveStatus({ status, lastSavedAt }) {
  if (status === 'saving') {
    return <span className="save-status saving">Saving…</span>;
  }
  if (status === 'saved' && lastSavedAt) {
    const label = formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true });
    return <span className="save-status saved">Saved {label}</span>;
  }
  return null;
}
