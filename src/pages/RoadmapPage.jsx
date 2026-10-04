import { useProgress } from '../context/ProgressContext';
import RoadmapSection from '../components/dashboard/RoadmapSection';

export default function RoadmapPage() {
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
      <RoadmapSection />
    </div>
  );
}
