import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { RANK_COLORS, TRACK_ICONS } from '../../styles/ranks';

const RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];

function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!deadline) return;

    const calc = () => {
      const diff = new Date(deadline) - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setTimeLeft(h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    };

    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  return timeLeft;
}

function useExpiry(expiresAt) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!expiresAt) { setLabel('No expiry'); return; }
    const calc = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setLabel('Expired'); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      setLabel(d > 0 ? `${d}d ${h}h left` : `${h}h left`);
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return label;
}

/**
 * MissionCard
 *
 * Props:
 *   mission       – row from `missions` table
 *   assignment    – row from `mission_assignments` (null if not claimed)
 *   userRank      – 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
 *   onClaim       – () => void
 *   onSubmit      – (assignment) => void  (opens modal)
 */
export default function MissionCard({ mission, assignment, userRank = 'E', onClaim, onSubmit }) {
  const rank = mission.difficulty ?? 'E';
  const rankMeta = RANK_COLORS[rank] ?? RANK_COLORS.E;
  const trackIcon = TRACK_ICONS[mission.track] ?? '📋';
  const expiryLabel = useExpiry(mission.expires_at);
  const countdown = useCountdown(assignment?.deadline);

  const userRankIdx = RANK_ORDER.indexOf(userRank);
  const minRankIdx  = RANK_ORDER.indexOf(mission.min_rank_required ?? 'E');
  const locked = userRankIdx < minRankIdx;

  const isAvailable  = !assignment && !locked && mission.status === 'published';
  const isInProgress = assignment?.status === 'in_progress';
  const isSubmitted  = assignment?.status === 'submitted';
  const isCompleted  = assignment?.status === 'approved';

  return (
    <motion.div
      className="card relative flex flex-col gap-3 select-none"
      data-difficulty={rank}
      style={{ opacity: locked ? 0.55 : 1 }}
      whileHover={!locked ? { rotate: 0.4 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ borderRadius: "var(--radius-lg)", background: "rgba(0,0,0,0.5)" }}>
          <Lock className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        {/* Difficulty badge */}
        <div className="badge-rank" data-rank={rank}>{rank}</div>

        {/* Track */}
        <div className="track-pill">
          <span>{trackIcon}</span>
          <span className="capitalize">{mission.track ?? 'General'}</span>
        </div>
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <p className="font-bold text-sm leading-snug mb-1 line-clamp-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          {mission.title}
        </p>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {mission.description}
        </p>
      </div>

      {/* Rewards + time row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--rank-s)" }}>
            ⚡ {mission.xp_reward ?? 0} XP
          </span>
          <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--accent)" }}>
            🪙 {mission.coins_reward ?? 0}
          </span>
        </div>
        <span style={{ color: "var(--text-muted)" }}>
          {isInProgress ? countdown : expiryLabel}
        </span>
      </div>

      {/* Star rating for completed */}
      {isCompleted && assignment?.rating != null && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ color: i < assignment.rating ? "var(--rank-s)" : "var(--text-muted)" }}>★</span>
          ))}
        </div>
      )}

      {/* CTA button */}
      {isAvailable && (
        <button
          className="btn btn-primary w-full mt-1 text-xs"
          onClick={onClaim}
        >
          Claim Mission
        </button>
      )}

      {isInProgress && (
        <button
          className="btn btn-ghost w-full mt-1 text-xs"
          onClick={() => onSubmit(assignment)}
        >
          Submit Work
        </button>
      )}

      {isSubmitted && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-medium" style={{ color: "var(--rank-c)" }}>Under Review</span>
          {assignment?.submission_url && (
            <a
              href={assignment.submission_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-medium" style={{ color: "var(--rank-d)" }}>Approved ✓</span>
          {assignment?.submission_url && (
            <a
              href={assignment.submission_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              <ExternalLink className="w-3 h-3" />
              View Submission
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
