import { useProgress } from '../context/ProgressContext';
import ProgressSection from '../components/dashboard/ProgressSection';

export default function ProgressPage() {
  const { loading } = useProgress();

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  return (
    <div className="page">
      <ProgressSection />
    </div>
  );
}
