/**
 * Leaderboard.jsx — Full leaderboard page component.
 *
 * TODO: GET /api/leaderboard/global
 * TODO: GET /api/leaderboard/weekly
 * TODO: GET /api/leaderboard/school?schoolId=
 * TODO: GET /api/leaderboard/class?classId=
 * TODO: GET /api/leaderboard/my-rank?userId=
 * TODO: WebSocket for live rank updates
 *   ws://localhost:8000/ws/leaderboard
 *   Push event when user's rank changes
 */

import { useContext, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Flame,
  Zap,
  TrendingUp,
  TrendingDown,
  Users,
  School,
} from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { supabase } from "../services/supabaseClient";
import { mockLeaderboard } from "../data/mockLeaderboardData";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { TIER_META } from "../lib/founder";
import { AuthContext, API } from "../App";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCOPES = [
  { id: "global", label: "Global" },
  { id: "weekly", label: "This Week" },
  { id: "school", label: "My School" },
  { id: "class", label: "My Class" },
];

const ACTIVITIES = [
  { id: "xp", label: "Overall XP" },
  { id: "practice", label: "Practice" },
  { id: "competitions", label: "Competitions" },
  { id: "missions", label: "Missions" },
];

// Founder tier dot colors — pulled from founder.js TIER_META
const FOUNDER_DOT_CLASS = {
  seed: "bg-emerald-400",
  bronze: "bg-amber-500",
  silver: "bg-slate-300",
  gold: "bg-yellow-400",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatXP(n) {
  return n.toLocaleString();
}

function deriveLevelTitle(level) {
  if (level >= 40) return "Legend";
  if (level >= 30) return "Master";
  if (level >= 20) return "Scholar";
  if (level >= 10) return "Learner";
  return "Student";
}

function getLevelBadgeStyle(level) {
  if (level >= 40) return "text-orange-400 bg-orange-400/10 border border-orange-400/20";
  if (level >= 30) return "text-purple-400 bg-purple-400/10 border border-purple-400/20";
  if (level >= 20) return "text-blue-400 bg-blue-400/10 border border-blue-400/20";
  if (level >= 10) return "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20";
  return "text-slate-500 bg-slate-500/10 border border-slate-500/20";
}

// ─── Shared small components ──────────────────────────────────────────────────

function UserAvatar({ username, size = "md", isCurrentUser = false, founderTier = null }) {
  const raw = username.replace(/[^a-zA-Z0-9]/g, "");
  const initials = (raw.slice(0, 2) || username.slice(0, 2)).toUpperCase();

  const sizeClass = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-20 h-20 text-xl",
  }[size] ?? "w-10 h-10 text-sm";

  const ringClass = isCurrentUser
    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
    : "";

  const glowClass =
    founderTier === "gold"
      ? "shadow-md shadow-yellow-400/30"
      : founderTier === "silver"
      ? "shadow-md shadow-slate-300/20"
      : founderTier === "bronze"
      ? "shadow-md shadow-amber-500/20"
      : "";

  return (
    <div
      className={`${sizeClass} rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0 ${ringClass} ${glowClass}`}
    >
      {initials}
    </div>
  );
}

function LevelBadge({ level, title }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${getLevelBadgeStyle(level)}`}>
      Lv.{level} {title}
    </span>
  );
}

function FounderDot({ tier }) {
  if (!tier) return null;
  return (
    <div
      className={`w-2 h-2 rounded-full shrink-0 ${FOUNDER_DOT_CLASS[tier]}`}
      title={TIER_META[tier]?.label}
    />
  );
}

function RankChange({ change, isNew }) {
  if (isNew) {
    return (
      <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-semibold">
        NEW
      </span>
    );
  }
  if (change === 0) {
    return <span className="text-slate-600 text-xs font-medium">—</span>;
  }
  if (change > 0) {
    return (
      <motion.span
        className="text-emerald-400 text-xs flex items-center gap-0.5 font-semibold"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.2, delay: 0.6, times: [0, 0.5, 1] }}
      >
        <TrendingUp className="w-3 h-3" />
        {change}
      </motion.span>
    );
  }
  return (
    <motion.span
      className="text-red-400 text-xs flex items-center gap-0.5 font-semibold"
      animate={{ opacity: [1, 0.5, 1] }}
      transition={{ duration: 1.2, delay: 0.6, times: [0, 0.5, 1] }}
    >
      <TrendingDown className="w-3 h-3" />
      {Math.abs(change)}
    </motion.span>
  );
}

function XPProgressBar({ xpInLevel, xpForNextLevel }) {
  const pct =
    xpForNextLevel > 0
      ? Math.min(100, Math.round((xpInLevel / xpForNextLevel) * 100))
      : 0;
  return (
    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ scope, onScopeChange, activity, onActivityChange, resetAction }) {
  return (
    <div className="space-y-2.5 mb-6">
      {/* Scope pills */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => onScopeChange(s.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                scope === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {resetAction ? (
          <Button size="sm" variant="outline" onClick={resetAction.onClick} disabled={resetAction.disabled}>
            {resetAction.label}
          </Button>
        ) : null}
      </div>
      {/* Activity pills */}
      <div className="flex gap-2 flex-wrap">
        {ACTIVITIES.map((a) => (
          <button
            key={a.id}
            onClick={() => onActivityChange(a.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activity === a.id
                ? "bg-slate-600 text-white"
                : "bg-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

const PODIUM_CONFIG = {
  1: {
    platform: "h-28",
    gradient: "from-yellow-500/80 to-amber-400/70",
    border: "border-yellow-400/30",
    numColor: "text-yellow-100",
    avatarSize: "xl",
    initial: { x: 0, y: -70, opacity: 0 },
    transition: { type: "spring", stiffness: 130, damping: 10, delay: 0.35 },
  },
  2: {
    platform: "h-20",
    gradient: "from-slate-400/70 to-slate-500/60",
    border: "border-slate-400/25",
    numColor: "text-slate-100",
    avatarSize: "lg",
    initial: { x: -90, y: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 180, damping: 18, delay: 0.1 },
  },
  3: {
    platform: "h-14",
    gradient: "from-amber-600/70 to-orange-500/60",
    border: "border-amber-500/25",
    numColor: "text-amber-100",
    avatarSize: "lg",
    initial: { x: 90, y: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 180, damping: 18, delay: 0.2 },
  },
};

function PodiumCard({ user, rank, isCurrentUser }) {
  const cfg = PODIUM_CONFIG[rank];

  const medalEl =
    rank === 1 ? (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="mb-2"
      >
        <Crown className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
      </motion.div>
    ) : rank === 2 ? (
      <div className="mb-2 text-xl">🥈</div>
    ) : (
      <div className="mb-2 text-xl">🥉</div>
    );

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={cfg.initial}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={cfg.transition}
    >
      {isCurrentUser && (
        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full mb-1 font-medium">
          You
        </span>
      )}

      {medalEl}

      <UserAvatar
        username={user.username}
        size={cfg.avatarSize}
        isCurrentUser={isCurrentUser}
        founderTier={user.founderTier}
      />

      <div className="mt-2 text-center w-28 lg:w-32">
        <div className="font-semibold text-sm truncate text-slate-100">
          {user.username}
        </div>
        <div className={`text-xs px-1 py-0.5 rounded mt-1 inline-block ${getLevelBadgeStyle(user.level)}`}>
          Lv.{user.level} {user.levelTitle}
        </div>
        <div className="text-yellow-400 text-sm font-bold mt-1">
          {formatXP(user.totalXP)} XP
        </div>
        {user.founderTier && (
          <div className={`text-xs mt-0.5 ${TIER_META[user.founderTier].text}`}>
            {TIER_META[user.founderTier].emoji} {TIER_META[user.founderTier].label}
          </div>
        )}
      </div>

      {/* Podium platform block */}
      <div
        className={`w-28 ${cfg.platform} bg-gradient-to-b ${cfg.gradient} rounded-t-xl mt-3 border-t border-x ${cfg.border} flex items-start justify-center pt-3`}
      >
        <span className={`font-black text-2xl opacity-70 ${cfg.numColor}`}>
          #{rank}
        </span>
      </div>
    </motion.div>
  );
}

function Podium({ top3, currentUserId }) {
  const [p1, p2, p3] = top3;
  return (
    <div className="py-4 px-2">
      <p className="text-center text-xs uppercase tracking-widest text-slate-500 mb-6 font-semibold">
        Top Performers
      </p>

      {/* Desktop: #2, #1, #3 */}
      <div className="hidden sm:flex items-end justify-center gap-3 lg:gap-5">
        <PodiumCard user={p2} rank={2} isCurrentUser={p2.id === currentUserId} />
        <PodiumCard user={p1} rank={1} isCurrentUser={p1.id === currentUserId} />
        <PodiumCard user={p3} rank={3} isCurrentUser={p3.id === currentUserId} />
      </div>

      {/* Mobile: #1 on top, #2 & #3 below */}
      <div className="sm:hidden flex flex-col items-center gap-4">
        <PodiumCard user={p1} rank={1} isCurrentUser={p1.id === currentUserId} />
        <div className="flex items-end justify-center gap-4">
          <PodiumCard user={p2} rank={2} isCurrentUser={p2.id === currentUserId} />
          <PodiumCard user={p3} rank={3} isCurrentUser={p3.id === currentUserId} />
        </div>
      </div>
    </div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.18 } },
};

function LeaderboardRow({ user, rank, isCurrentUser, xpToNextRank, nextRankUsername }) {
  return (
    <motion.div
      variants={rowVariants}
      className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-lg transition-colors ${
        isCurrentUser
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-slate-800/50"
      }`}
    >
      {/* Rank */}
      <div className="w-7 text-right shrink-0">
        <span
          className={`font-black text-sm leading-none ${
            rank <= 3
              ? "text-slate-300"
              : rank <= 10
              ? "text-slate-400"
              : "text-slate-600"
          }`}
        >
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <UserAvatar
        username={user.username}
        size="sm"
        isCurrentUser={isCurrentUser}
        founderTier={user.founderTier}
      />

      {/* Name + school + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap leading-none">
          <span
            className={`font-semibold text-sm truncate ${
              isCurrentUser ? "text-primary" : "text-slate-200"
            }`}
          >
            {user.username}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-primary/60 font-medium">(you)</span>
          )}
          {/* Special badges */}
          {user.streak > 7 && (
            <Flame
              className="w-3 h-3 text-orange-400 shrink-0"
              title={`${user.streak}-day streak`}
            />
          )}
          {user.weeklyRankChange >= 10 && (
            <Zap
              className="w-3 h-3 text-yellow-400 shrink-0"
              title="On fire this week!"
            />
          )}
          {["Master", "Legend", "EduVault OG"].includes(user.levelTitle) && (
            <Crown
              className="w-3 h-3 text-purple-400 shrink-0"
              title={user.levelTitle}
            />
          )}
          <FounderDot tier={user.founderTier} />
        </div>
        {/* School row — hidden on mobile */}
        <div className="hidden sm:block text-xs text-slate-500 mt-0.5 truncate">
          {user.school}
          {isCurrentUser && xpToNextRank !== null && nextRankUsername && (
            <span className="ml-2 text-slate-400">
              · {xpToNextRank.toLocaleString()} XP to pass {nextRankUsername}
            </span>
          )}
        </div>
        {/* Mobile: XP hint only for current user */}
        {isCurrentUser && xpToNextRank !== null && nextRankUsername && (
          <div className="sm:hidden text-xs text-slate-400 mt-0.5">
            {xpToNextRank.toLocaleString()} XP to pass {nextRankUsername}
          </div>
        )}
      </div>

      {/* Level badge — hidden on small screens */}
      <div className="hidden md:block shrink-0">
        <LevelBadge level={user.level} title={user.levelTitle} />
      </div>

      {/* XP progress bar — hidden below lg */}
      <div className="hidden lg:block shrink-0">
        <XPProgressBar xpInLevel={user.xpInLevel} xpForNextLevel={user.xpForNextLevel} />
      </div>

      {/* Total XP */}
      <div className="text-yellow-400 font-bold text-sm shrink-0 min-w-[64px] text-right">
        {formatXP(user.totalXP)}
      </div>

      {/* Rank change */}
      <div className="w-10 text-right shrink-0">
        <RankChange change={user.weeklyRankChange} isNew={user.isNew} />
      </div>
    </motion.div>
  );
}

// ─── Sticky current-user row (when outside top 50) ───────────────────────────

function StickyCurrentUserRow({ user, rank, xpToNextRank, nextRankUsername }) {
  return (
    <div className="sticky bottom-0 pt-2 pb-4 bg-gradient-to-t from-background via-background/95 to-transparent">
      <motion.div
        className="mx-1 rounded-xl border border-primary/40 overflow-hidden relative"
        animate={{ opacity: [0.88, 1, 0.88] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Shimmer stripe */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative flex items-center gap-3 px-4 py-3 bg-primary/10">
          <div className="w-7 text-right shrink-0">
            <span className="font-black text-sm text-primary">#{rank}</span>
          </div>
          <UserAvatar username={user.username} size="sm" isCurrentUser founderTier={user.founderTier} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-primary">{user.username}</span>
              <span className="text-xs text-primary/60 font-medium">That's you!</span>
            </div>
            {xpToNextRank !== null && nextRankUsername && (
              <div className="text-xs text-slate-400 mt-0.5">
                {xpToNextRank.toLocaleString()} XP to pass {nextRankUsername}
              </div>
            )}
          </div>
          <div className="text-yellow-400 font-bold text-sm shrink-0">
            {formatXP(user.totalXP)} XP
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div>
      {/* Podium skeleton */}
      <div className="flex items-end justify-center gap-6 py-8">
        {[72, 96, 56].map((platformH, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-14 h-14 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-3 w-16" />
            <div className="w-28 rounded-t-xl bg-slate-800 animate-pulse" style={{ height: platformH }} />
          </div>
        ))}
      </div>
      <div className="border-t border-slate-700/50 mb-3" />
      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="w-7 h-3" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-3 w-16 hidden md:block" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyState({ type }) {
  if (type === "class") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <Users className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="font-semibold text-slate-300 mb-2">
          Join a class to see your class leaderboard
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          Compete with your classmates and see who's on top!
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/community?tab=classes">Join a Class</Link>
        </Button>
      </div>
    );
  }
  if (type === "school") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <School className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="font-semibold text-slate-300 mb-2">
          Add your school in settings to see your school leaderboard
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          Set your school to compete with local students.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }
  return null;
}

// ─── Sidebar stats panel ──────────────────────────────────────────────────────

function SidebarStats({ currentUserData, currentRank, allUsers, weeklyLeaders, schoolLeaders, currentUserSchoolName, scope, weeklyCurrentUserData }) {
  if (!currentUserData) return null;

  const aboveUser = currentRank > 1 ? allUsers[currentRank - 2] : null;
  const xpKey = scope === "weekly" ? "weeklyXP" : "totalXP";
  const xpGap = aboveUser
    ? Math.max(0, aboveUser[xpKey] - currentUserData[xpKey] + 1)
    : 0;
  const top10XP = allUsers[9]?.[xpKey] ?? 0;
  const xpToTop10 = Math.max(0, top10XP - currentUserData[xpKey]);
  const topClimbers = [...weeklyLeaders]
    .filter((u) => u.weeklyRankChange > 0)
    .sort((a, b) => b.weeklyRankChange - a.weeklyRankChange)
    .slice(0, 3);
  const schoolUsers = schoolLeaders.slice(0, 3);
  const schoolName = currentUserSchoolName ?? currentUserData.school ?? "Visionary Academy";

  return (
    <div className="space-y-4 text-sm">
      {/* YOUR STATS */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Your Stats
        </h4>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Your rank</span>
            <span className="font-bold text-white">#{currentRank}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Weekly change</span>
            <RankChange change={currentUserData.weeklyRankChange} isNew={false} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total XP</span>
            <span className="font-semibold text-yellow-400">
              {(weeklyCurrentUserData?.weeklyXP ?? currentUserData.weeklyXP).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">XP to top 10</span>
            <span className="font-semibold text-slate-300">
              {xpToTop10.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Best rank ever</span>
            <span className="font-semibold text-slate-300">#19</span>
          </div>
        </div>
      </div>

      {/* RIVAL */}
      {aboveUser && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Your Rival
          </h4>
          <div className="flex items-center gap-2 mb-2.5">
            <UserAvatar
              username={aboveUser.username}
              size="sm"
              founderTier={aboveUser.founderTier}
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-200 text-sm truncate">
                {aboveUser.username}
              </div>
              <div className="text-xs text-slate-500 truncate">{aboveUser.school}</div>
            </div>
            <span className="text-xs text-slate-500 shrink-0">#{currentRank - 1}</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Only{" "}
            <span className="text-yellow-400 font-semibold">
              {xpGap.toLocaleString()} XP
            </span>{" "}
            behind
          </p>
          {/* TODO: Send practice challenge to rival user */}
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs opacity-40 cursor-not-allowed"
            disabled
          >
            Challenge
          </Button>
        </div>
      )}

      {/* THIS WEEK'S MOVERS */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Biggest Climbers
        </h4>
        <p className="text-xs text-slate-500 mb-3">This week's top movers</p>
        <div className="space-y-2.5">
          {topClimbers.map((climber) => (
            <div key={climber.id} className="flex items-center gap-2">
              <UserAvatar username={climber.username} size="sm" />
              <span className="text-slate-300 text-xs flex-1 truncate">
                {climber.username}
              </span>
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5 shrink-0">
                <TrendingUp className="w-3 h-3" />
                {climber.weeklyRankChange} spots
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SCHOOL SPOTLIGHT */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          School Spotlight
        </h4>
        <p className="text-xs text-slate-500 mb-3">Top School This Week</p>
        <div className="flex items-center gap-2 mb-1">
          <School className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-200 text-sm truncate">
            Westview High
          </span>
          <span className="ml-auto text-xs text-slate-500 shrink-0">#5</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          {schoolUsers.length > 0
            ? `${schoolName} has ${schoolUsers.length} ranked student${schoolUsers.length === 1 ? "" : "s"}`
            : "No ranked students yet"}
        </p>
        <div className="space-y-2">
          {schoolUsers.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="text-slate-500 text-xs w-3 shrink-0">{i + 1}.</span>
              <UserAvatar username={s.username} size="sm" />
              <span className="text-xs text-slate-300 flex-1 truncate">
                {s.username}
              </span>
              <span className="text-yellow-400 text-xs font-semibold shrink-0">
                {s.totalXP.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Leaderboard export ──────────────────────────────────────────────────

function normalizeLeaderboardEntries(entries, scope) {
  return entries.map((entry, index) => {
    // Already normalized shape (mock fallback: has 'username' field)
    if (entry.username !== undefined) {
      return { ...entry, displayRank: index + 1 };
    }
    // Supabase shape: { id, name, xp, level, streak, school, founder_tier }
    if (entry.name !== undefined) {
      const xpForNextLevel = Math.max(1000, (entry.level || 1) * 100);
      const xpInLevel = (entry.xp || 0) % xpForNextLevel;
      return {
        id: entry.id,
        username: entry.name,
        avatar: entry.avatar || null,
        level: entry.level || 1,
        levelTitle: deriveLevelTitle(entry.level || 1),
        totalXP: entry.xp || 0,
        weeklyXP: entry.xp || 0,
        school: entry.school || "Visionary Academy",
        founderTier: entry.founder_tier || null,
        streak: entry.streak || 0,
        weeklyRankChange: 0,
        isNew: false,
        xpInLevel,
        xpForNextLevel,
        displayRank: index + 1,
      };
    }
    // Legacy mock API shape: { userId, displayName, points, ... }
    const points = entry.points || 0;
    const xpForNextLevel = Math.max(1000, entry.level * 100);
    const xpInLevel = points % xpForNextLevel;
    return {
      id: entry.userId,
      username: entry.displayName,
      avatar: entry.avatar,
      level: entry.level,
      levelTitle: entry.rankTitle,
      totalXP: points,
      weeklyXP: scope === "weekly" ? points : 0,
      school: entry.schoolName || "Visionary Academy",
      founderTier: null,
      streak: entry.streak || 0,
      weeklyRankChange: entry.rankChange || 0,
      isNew: false,
      xpInLevel,
      xpForNextLevel,
      displayRank: index + 1,
    };
  });
}

export default function Leaderboard({ currentUser }) {
  const auth = useContext(AuthContext);
  const activeUser = currentUser || auth?.user;
  const currentUserId = activeUser?.user_id;
  const [scope, setScope] = useState("global");
  const [activity, setActivity] = useState("xp");
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardEntries, setLeaderboardEntries] = useState([]);
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [schoolEntries, setSchoolEntries] = useState([]);
  const [enrolledClassIds, setEnrolledClassIds] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);

  const userHasSchool = Boolean(activeUser?.school_id);
  const isTeacher = activeUser?.role === "teacher";
  const userInClass = isTeacher || enrolledClassIds.length > 0;
  const resolvedClassId = isTeacher ? (selectedClassId || "cls1") : selectedClassId;

  useEffect(() => {
    let cancelled = false;

    async function loadMemberships() {
      if (!activeUser) return;
      if (activeUser.role === "student") {
        try {
          const { data } = await axios.get(`${API}/classes`);
          if (cancelled) return;
          const ids = data.map((cls) => cls.class_id || cls.id).filter(Boolean);
          setEnrolledClassIds(ids);
          setSelectedClassId((prev) => prev || ids[0] || null);
        } catch {
          if (!cancelled) {
            setEnrolledClassIds([]);
            setSelectedClassId(null);
          }
        }
      } else if (activeUser.role === "teacher") {
        setEnrolledClassIds(["cls1"]);
        setSelectedClassId((prev) => prev || "cls1");
      } else {
        setEnrolledClassIds([]);
        setSelectedClassId(null);
      }
    }

    loadMemberships();
    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSidebarData() {
      if (!activeUser) return;
      try {
        const requests = [axios.get(`${API}/leaderboard/weekly`)];
        if (activeUser.school_id) {
          requests.push(axios.get(`${API}/leaderboard/school/${activeUser.school_id}`));
        }
        const responses = await Promise.all(requests);
        if (cancelled) return;
        setWeeklyEntries(responses[0].data);
        setSchoolEntries(responses[1]?.data || []);
      } catch {
        if (!cancelled) {
          setWeeklyEntries([]);
          setSchoolEntries([]);
        }
      }
    }

    fetchSidebarData();
    return () => {
      cancelled = true;
    };
  }, [activeUser]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      if (!activeUser) {
        setLeaderboardEntries([]);
        setIsLoading(false);
        return;
      }

      if (scope === "school" && !activeUser.school_id) {
        setLeaderboardEntries([]);
        setIsLoading(false);
        return;
      }

      if (scope === "class" && !resolvedClassId) {
        setLeaderboardEntries([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      if (scope === "global") {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, avatar, school, xp, level, streak, founder_tier")
          .order("xp", { ascending: false })
          .limit(100);
        if (!cancelled) {
          setLeaderboardEntries(!error && data && data.length > 0 ? data : mockLeaderboard);
          setIsLoading(false);
        }
        return;
      }

      try {
        let endpoint = `${API}/leaderboard/weekly`;
        if (scope === "school") endpoint = `${API}/leaderboard/school/${activeUser.school_id}`;
        if (scope === "class") endpoint = `${API}/leaderboard/class/${resolvedClassId}`;
        const { data } = await axios.get(endpoint);
        if (!cancelled) setLeaderboardEntries(data);
      } catch {
        if (!cancelled) setLeaderboardEntries([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [activity, activeUser, resolvedClassId, scope]);

  function handleScopeChange(newScope) {
    if (newScope === scope) return;
    setScope(newScope);
  }

  function handleActivityChange(newActivity) {
    if (newActivity === activity) return;
    setActivity(newActivity);
  }

  async function handleResetClassLeaderboard() {
    if (!resolvedClassId) return;
    setIsLoading(true);
    try {
      await axios.delete(`${API}/leaderboard/class/${resolvedClassId}/reset`);
      const { data } = await axios.get(`${API}/leaderboard/class/${resolvedClassId}`);
      setLeaderboardEntries(data);
    } catch {
      // no-op to preserve existing UI behavior
    } finally {
      setIsLoading(false);
    }
  }

  const rankedList = useMemo(() => normalizeLeaderboardEntries(leaderboardEntries, scope), [leaderboardEntries, scope]);
  const weeklyList = useMemo(() => normalizeLeaderboardEntries(weeklyEntries, "weekly"), [weeklyEntries]);
  const schoolList = useMemo(() => normalizeLeaderboardEntries(schoolEntries, "school"), [schoolEntries]);
  const top3 = rankedList.slice(0, 3);
  const currentUserRank = rankedList.findIndex((user) => user.id === currentUserId) + 1 || null;
  const currentUserData = currentUserRank ? rankedList[currentUserRank - 1] : null;
  const weeklyCurrentUserData = weeklyList.find((user) => user.id === currentUserId) || null;

  // XP gap to the person directly above the current user
  const { xpToNextRank, nextRankUsername } = useMemo(() => {
    if (!currentUserRank || currentUserRank <= 1) return { xpToNextRank: null, nextRankUsername: null };
    const above = rankedList[currentUserRank - 2];
    const me = rankedList[currentUserRank - 1];
    if (!above || !me) return { xpToNextRank: null, nextRankUsername: null };
    const key = scope === "weekly" ? "weeklyXP" : "totalXP";
    return {
      xpToNextRank: Math.max(1, above[key] - me[key] + 1),
      nextRankUsername: above.username,
    };
  }, [currentUserRank, rankedList, scope]);

  const listUsers = rankedList.slice(3);
  const showStickyRow = currentUserRank !== null && currentUserRank > 50;

  const isClassScope = scope === "class" && !userInClass;
  const isSchoolEmpty = scope === "school" && !userHasSchool;
  const resetAction = scope === "class" && isTeacher && resolvedClassId
    ? {
        label: "Reset Class Points",
        onClick: handleResetClassLeaderboard,
        disabled: isLoading,
      }
    : null;

  const listContainerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.03 } },
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Main column ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 lg:p-6">
          <FilterBar
            scope={scope}
            onScopeChange={handleScopeChange}
            activity={activity}
            onActivityChange={handleActivityChange}
            resetAction={resetAction}
          />

          {/* Empty states */}
          {isClassScope ? (
            <EmptyState type="class" />
          ) : isSchoolEmpty ? (
            <EmptyState type="school" />
          ) : isLoading ? (
            <LeaderboardSkeleton />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${scope}-${activity}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {/* Podium — top 3 */}
                {top3.length >= 3 && (
                  <Podium top3={top3} currentUserId={currentUserId} />
                )}

                <div className="border-t border-slate-700/50 my-4" />

                {/* Ranked list — ranks 4+ */}
                <motion.div
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-0.5"
                >
                  {listUsers.map((user) => {
                    const isCU = user.id === currentUserId;
                    return (
                      <LeaderboardRow
                        key={user.id}
                        user={user}
                        rank={user.displayRank}
                        isCurrentUser={isCU}
                        xpToNextRank={isCU ? xpToNextRank : null}
                        nextRankUsername={isCU ? nextRankUsername : null}
                      />
                    );
                  })}
                </motion.div>

                {/* Sticky row when current user is outside top 50 */}
                {showStickyRow && currentUserData && (
                  <StickyCurrentUserRow
                    user={currentUserData}
                    rank={currentUserRank}
                    xpToNextRank={xpToNextRank}
                    nextRankUsername={nextRankUsername}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Sidebar stats (xl screens only) ──────────────────────────── */}
      <div className="hidden xl:block w-[260px] shrink-0 border-l border-slate-700/50 overflow-y-auto p-4">
        {!isClassScope && !isSchoolEmpty && !isLoading && (
          <SidebarStats
            currentUserData={currentUserData}
            currentRank={currentUserRank}
            allUsers={rankedList}
            weeklyLeaders={weeklyList}
            schoolLeaders={schoolList}
            currentUserSchoolName={schoolList[0]?.school || currentUserData?.school}
            scope={scope}
            weeklyCurrentUserData={weeklyCurrentUserData}
          />
        )}
      </div>
    </div>
  );
}
