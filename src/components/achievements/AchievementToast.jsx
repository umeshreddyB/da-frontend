import { ACHIEVEMENT_LABELS } from './achievementData';

export default function AchievementToast({ achievement, onClose }) {
  const info = ACHIEVEMENT_LABELS[achievement.id] || { title: achievement.id, description: '' };

  return (
    <div className="achievement-toast" onClick={onClose}>
      <div className="achievement-toast-inner">
        <span className="achievement-icon">🏆</span>
        <div>
          <strong>Achievement unlocked!</strong>
          <p>{info.title}</p>
          <small>{info.description}</small>
        </div>
      </div>
    </div>
  );
}
