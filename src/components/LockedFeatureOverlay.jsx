import { motion } from 'framer-motion';
import { Lock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

/**
 * Renders an overlay on top of a locked feature.
 * The underlying component stays mounted — only visually covered.
 *
 * Props:
 *   featureName  — human-readable name of the feature
 *   threshold    — member count needed to unlock
 *   currentUsers — current community member count
 */
export default function LockedFeatureOverlay({ featureName, threshold, currentUsers }) {
  const usersNeeded = Math.max(0, (threshold ?? 0) - (currentUsers ?? 0));
  const progress =
    threshold && currentUsers
      ? Math.min(100, (currentUsers / threshold) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(9, 9, 11, 0.82)',
      }}
    >
      {/* Gradient border wrapper */}
      <div className="relative p-px rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #F59E0B 100%)',
        }}
      >
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-2xl bg-zinc-950 px-8 py-8 flex flex-col items-center text-center space-y-5 max-w-sm"
        >
          {/* Lock icon */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(220,95,20,0.2) 0%, rgba(245,158,11,0.15) 100%)',
              border: '1px solid rgba(220,95,20,0.3)',
            }}
          >
            <Lock className="w-7 h-7 text-orange-400" />
          </div>

          {/* Feature name */}
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">{featureName}</h3>
            <p className="text-sm text-white/50">
              Unlocks when the community reaches{' '}
              <span className="text-amber-400 font-semibold">
                {(threshold ?? 0).toLocaleString()} members
              </span>
            </p>
          </div>

          {/* Progress */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-white/40">
                <Users className="w-3.5 h-3.5" />
                <span>{(currentUsers ?? 0).toLocaleString()} members now</span>
              </div>
              <span className="text-amber-400 font-medium">
                {usersNeeded.toLocaleString()} to go
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-700 to-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>

          {/* CTA */}
          <Link to="/referral" className="w-full">
            <Button
              className="w-full bg-gradient-to-r from-orange-700 to-orange-600 hover:from-orange-700 hover:to-orange-600 text-white border-0"
            >
              Invite Friends to Unlock Faster
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
