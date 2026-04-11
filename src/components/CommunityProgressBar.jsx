import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Users, Unlock } from 'lucide-react';
import { getCommunityStats, getFeatureUnlocks } from '../services/communityService';

export default function CommunityProgressBar() {
  const [stats, setStats] = useState(null);
  const [unlocks, setUnlocks] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getCommunityStats(), getFeatureUnlocks()])
      .then(([s, u]) => {
        if (!mounted) return;
        setStats(s);
        setUnlocks(u);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (!stats || unlocks.length === 0) return null;

  const currentUsers = stats.total_users;

  const lockedUnlocks = unlocks.filter(
    (u) => u.unlocked_at === null && currentUsers < u.threshold
  );
  const recentlyUnlocked = unlocks.filter(
    (u) => u.unlocked_at !== null || currentUsers >= u.threshold
  );

  const nextThreshold = lockedUnlocks[0]?.threshold ?? null;
  const prevThreshold =
    recentlyUnlocked.length > 0
      ? recentlyUnlocked[recentlyUnlocked.length - 1].threshold
      : 0;

  const progress = nextThreshold
    ? Math.min(
        100,
        ((currentUsers - prevThreshold) / (nextThreshold - prevThreshold)) * 100
      )
    : 100;

  const next3 = lockedUnlocks.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="rounded-2xl border border-[var(--border)] bg-[color:color-mix(in_srgb,var(--text-primary)_5%,transparent)] backdrop-blur-md p-5 space-y-4"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-600/20 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <span className="text-sm font-semibold text-[color:color-mix(in_srgb,var(--text-primary)_90%,transparent)]">Community Unlocks</span>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.span
            key={currentUsers}
            initial={{ scale: 1.5, color: '#e8722a' }}
            animate={{ scale: 1, color: 'var(--text-primary)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-sm font-bold"
          >
            {currentUsers.toLocaleString()}
          </motion.span>
          <span className="text-sm md:text-xs text-[color:color-mix(in_srgb,var(--text-primary)_40%,transparent)]">members</span>
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-600/10 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600" />
          </span>
        </div>
      </div>

      {/* Progress bar toward next unlock */}
      {nextThreshold ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm md:text-xs">
            <span className="text-[color:color-mix(in_srgb,var(--text-primary)_40%,transparent)]">
              {currentUsers.toLocaleString()} / {nextThreshold.toLocaleString()} members
            </span>
            <span className="text-brand-orange font-medium">
              {(nextThreshold - currentUsers).toLocaleString()} to next unlock
            </span>
          </div>
          <div className="h-2 rounded-full bg-[color:color-mix(in_srgb,var(--text-primary)_8%,transparent)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-orange-700 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm md:text-xs text-emerald-400">
          <Unlock className="w-3.5 h-3.5" />
          <span>All current features unlocked!</span>
        </div>
      )}

      {/* Next 3 upcoming unlocks */}
      {next3.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm md:text-[10px] uppercase tracking-widest text-[color:color-mix(in_srgb,var(--text-primary)_30%,transparent)]">Upcoming</p>
          <div className="space-y-2">
            {next3.map((unlock, i) => {
              const isNext = i === 0;
              return (
                <motion.div
                  key={unlock.threshold}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                    isNext
                      ? 'bg-orange-600/10 border border-orange-500/30'
                      : 'bg-[color:color-mix(in_srgb,var(--text-primary)_4%,transparent)] border border-[color:color-mix(in_srgb,var(--text-primary)_6%,transparent)]'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      isNext ? 'bg-orange-600/20' : 'bg-[color:color-mix(in_srgb,var(--text-primary)_8%,transparent)]'
                    }`}
                  >
                    <Lock
                      className={`w-3 h-3 ${isNext ? 'text-orange-400' : 'text-[color:color-mix(in_srgb,var(--text-primary)_30%,transparent)]'}`}
                    />
                  </div>
                  <span
                    className={`text-sm md:text-xs flex-1 ${isNext ? 'text-[color:color-mix(in_srgb,var(--text-primary)_80%,transparent)]' : 'text-[color:color-mix(in_srgb,var(--text-primary)_40%,transparent)]'}`}
                  >
                    {unlock.label}
                  </span>
                  <span
                    className={`text-sm md:text-xs font-semibold ${
                      isNext ? 'text-brand-orange' : 'text-[color:color-mix(in_srgb,var(--text-primary)_30%,transparent)]'
                    }`}
                  >
                    {unlock.threshold.toLocaleString()}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
