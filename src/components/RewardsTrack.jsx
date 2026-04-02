import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthContext } from "../App";
import apiService from "../services/apiService";
import {
  REWARDS,
  founderCoins,
  getNextMilestone,
  getLatestReachedMilestone,
} from "../data/rewardsProgram";
import { getFounderMeta, getFounderTier, isFounder } from "../lib/founder";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import PageHeader from "./PageHeader";
import {
  Lock,
  CheckCircle2,
  Star,
  Coins,
  ChevronRight,
  Gift,
  Zap,
  Sparkles,
} from "lucide-react";

// TODO: On level up, check REWARDS array for
// matching milestone and trigger reward claim
// POST /api/rewards/claim { level, userId }

// TODO: Award coins via existing coin system
// import { awardCoins } from '../lib/founder.js'

// TODO: Unlock features via feature flags
// Update user.unlockedFeatures array in backend

// TODO: Show level up modal when user
// crosses a milestone threshold —
// pull from this REWARDS array to populate it

// TODO: Founder multiplier applied server-side
// when coins are awarded at level milestone

export default function RewardsTrack() {
  const { user } = useContext(AuthContext);
  const [gamStats, setGamStats] = useState(null);
  const currentLevelRef = useRef(null);

  const founder = isFounder(user);
  const founderMeta = getFounderMeta(user);
  const founderTier = getFounderTier(user);

  useEffect(() => {
    apiService.gamification.getStats().then(setGamStats).catch(() => {});
  }, []);

  // Scroll to current milestone once data loads
  useEffect(() => {
    if (gamStats && currentLevelRef.current) {
      currentLevelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [gamStats]);

  const currentLevel = gamStats?.level ?? 1;
  const levelProgress = gamStats?.level_progress ?? 0;
  const xpInLevel = gamStats?.xp_in_level ?? 0;
  const xpForNext = gamStats?.xp_for_next_level ?? 100;

  const latestReached = getLatestReachedMilestone(currentLevel);
  const nextMilestone = getNextMilestone(currentLevel);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto pb-12"
    >
      <PageHeader
        title="Rewards Track"
        subtitle="Every level brings something new — here's everything you've earned and what's ahead."
      />

      {/* Current level summary card */}
      <Card className="mb-8 border-primary/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="pt-5 pb-5 relative z-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Your Level
              </p>
              <p className="text-5xl font-bold leading-none text-foreground">
                {currentLevel}
              </p>
              {latestReached && (
                <p className="text-sm text-muted-foreground mt-1">
                  {latestReached.emoji ? `${latestReached.emoji} ` : ""}
                  {latestReached.title}
                </p>
              )}
            </div>
            {nextMilestone && (
              <div className="text-right shrink-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Next Reward
                </p>
                <p className="text-sm font-semibold">
                  Level {nextMilestone.level}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextMilestone.emoji ? `${nextMilestone.emoji} ` : ""}
                  {nextMilestone.title}
                </p>
                <p className="text-xs text-amber-500 font-medium mt-0.5">
                  +{nextMilestone.coins} coins
                </p>
              </div>
            )}
          </div>

          <Progress value={levelProgress} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{xpInLevel} XP</span>
            <span>{xpForNext} XP to next level</span>
          </div>

          {nextMilestone && (
            <p className="text-xs text-primary mt-2">
              Next reward at Level {nextMilestone.level}:{" "}
              {nextMilestone.coins} coins + {nextMilestone.unlocks[0]}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vertical rewards track */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-3">
          {REWARDS.map((reward) => {
            const isPast = reward.level < (latestReached?.level ?? Infinity);
            const isCurrent = reward.level === latestReached?.level;
            const isFuture = !isPast && !isCurrent;
            const isMilestone = reward.isMilestone;
            const isUltimateTease = reward.level >= 40;

            // Coin preview for future levels considering founder tier
            const earnableCoins = founderCoins(reward.coins, founderTier);
            const showFounderBonus = isFuture && founder && founderTier !== "seed" && earnableCoins !== reward.coins;

            return (
              <div
                key={reward.level}
                ref={isCurrent ? currentLevelRef : null}
                className="relative pl-14"
              >
                {/* Level circle */}
                <div
                  className={`absolute left-0 w-12 h-12 flex items-center justify-center rounded-full font-bold text-sm z-10 border-2 transition-all ${
                    isPast
                      ? "bg-green-500/15 border-green-500/60 text-green-400"
                      : isCurrent
                      ? "bg-primary/15 border-primary text-primary"
                      : isMilestone
                      ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <span>{reward.level}</span>
                  )}
                </div>

                {/* Pulse animation on current level — framer-motion only here */}
                {isCurrent && (
                  <motion.div
                    className="absolute left-0 w-12 h-12 rounded-full border-2 border-primary/40 pointer-events-none z-10"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {/* Reward card */}
                <Card
                  className={`border transition-all ${
                    isPast
                      ? "border-green-500/15 bg-green-500/5 opacity-65"
                      : isCurrent
                      ? "border-primary/35 bg-primary/5 shadow-[0_0_24px_hsl(var(--primary)/0.12)]"
                      : isMilestone
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-border"
                  }`}
                >
                  <CardContent className={`${isMilestone ? "pt-4 pb-4" : "pt-3 pb-3"}`}>
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <p
                        className={`font-semibold leading-tight ${
                          isMilestone ? "text-base" : "text-sm"
                        } ${
                          isPast
                            ? "text-muted-foreground"
                            : isMilestone
                            ? "text-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {reward.emoji ? `${reward.emoji} ` : ""}Level {reward.level} —{" "}
                        {reward.title}
                      </p>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/30">
                            You are here
                          </Badge>
                        )}
                        {isPast && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-500/15 text-green-400 border-green-500/25">
                            Claimed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Rewards list */}
                    <ul className="space-y-1.5">
                      {/* Coins */}
                      <li className="flex items-center gap-1.5 text-xs">
                        <Coins
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isFuture
                              ? "text-yellow-500"
                              : isPast
                              ? "text-muted-foreground"
                              : "text-yellow-500"
                          }`}
                        />
                        <span
                          className={`${isPast ? "line-through text-muted-foreground" : ""} ${
                            isFuture ? "text-yellow-400 font-medium" : ""
                          }`}
                        >
                          +{reward.coins} coins
                        </span>
                        {showFounderBonus && (
                          <span className="text-[10px] text-muted-foreground">
                            ({founderMeta.label.split(" ")[0]} founders:{" "}
                            {earnableCoins} coins)
                          </span>
                        )}
                      </li>

                      {/* Unlocks */}
                      {reward.unlocks.map((u, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs">
                          {isFuture ? (
                            <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <Gift
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isPast ? "text-muted-foreground" : "text-primary"
                              }`}
                            />
                          )}
                          <span className={isPast ? "line-through text-muted-foreground" : ""}>{u}</span>
                        </li>
                      ))}

                      {/* Badge */}
                      {reward.badge && (
                        <li className="flex items-center gap-1.5 text-xs">
                          {isFuture ? (
                            <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <Star
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isPast ? "text-muted-foreground" : "text-amber-400"
                              }`}
                            />
                          )}
                          <span className={isPast ? "line-through text-muted-foreground" : ""}>
                            {reward.badge}
                          </span>
                        </li>
                      )}

                      {/* Bonuses */}
                      {reward.bonuses.map((b, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs">
                          {isFuture ? (
                            <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <Zap
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isPast ? "text-muted-foreground" : "text-primary"
                              }`}
                            />
                          )}
                          <span className={isPast ? "line-through text-muted-foreground" : ""}>{b}</span>
                        </li>
                      ))}

                      {/* Specials */}
                      {reward.specials.map((s, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs">
                          {isFuture ? (
                            <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <Sparkles
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isPast ? "text-muted-foreground" : "text-violet-400"
                              }`}
                            />
                          )}
                          <span className={isPast ? "line-through text-muted-foreground" : ""}>{s}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Note */}
                    {reward.note && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic">{reward.note}</p>
                    )}

                    {/* XP progress bar — only on current milestone */}
                    {isCurrent && (
                      <div className="mt-3 pt-3 border-t border-primary/15">
                        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                          <span>Progress to next level</span>
                          <span>{xpInLevel} / {xpForNext} XP</span>
                        </div>
                        <Progress value={levelProgress} className="h-1.5" />
                      </div>
                    )}

                    {/* Founder tease for levels 40 and 50 */}
                    {isUltimateTease && isFuture && (
                      <div className="mt-3 pt-2.5 border-t border-border">
                        <Link
                          to="/pricing"
                          className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/70 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          Reach this faster with a Founder Pass
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
