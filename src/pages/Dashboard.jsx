import { useState, useEffect, useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Skeleton, DashboardCardSkeleton } from "../components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Calendar } from "../components/ui/calendar";
import { Slider } from "../components/ui/slider";
import { Badge } from "../components/ui/badge";
import { AuthContext } from "../App";
import apiService, { streaksAPI } from "../services/apiService";
import { getMissions, claimMission, seedDailyMissions } from "../services/missionService";
import { joinClass } from "../services/classService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import FounderBadge from "../components/FounderBadge";
import PageHeader from "../components/PageHeader";
import AssignmentRadar from "../components/AssignmentRadar";
import { toast } from "sonner";
import { isFounder, getFounderMeta, TIER_META, canUpgrade, nextTier, formatPurchaseDate } from "../lib/founder";
import { REWARDS } from "../data/rewardsProgram";
import {
  CheckSquare,
  Flame,
  Calendar as CalendarIcon,
  TrendingUp,
  Book,
  Users,
  Gift,
  Plus,
  ArrowRight,
  Trophy,
  Star,
  Coins,
  Target,
  GraduationCap,
  Zap,
  BadgeCheck,
  ChevronRight
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";
import {
  getLast7DaysCompletions,
  getLast14DaysXp,
  getSubjectScores,
  getHeatmapData
} from "../utils/dashboardAnalytics";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [missions, setMissions] = useState([]);
  const [gamificationStats, setGamificationStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [streakInfo, setStreakInfo] = useState(null);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [joinClassOpen, setJoinClassOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      if (user?.id) {
        await seedDailyMissions(user.id);
      }
      const [statsRes, tasksRes, missionsRes, gamRes, streakRes] = await Promise.all([
        apiService.tasks.getStats(),
        apiService.tasks.getTasks(),
        user?.id ? getMissions(user.id) : Promise.resolve([]),
        apiService.gamification.getStats(),
        streaksAPI.getStreak(),
      ]);
      setStats(statsRes);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setMissions(Array.isArray(missionsRes) ? missionsRes : []);
      setGamificationStats(gamRes);
      setStreakInfo(streakRes);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(true);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaimMission = async (missionId) => {
    try {
      const response = await claimMission(user.id, missionId);
      toast.success(`Claimed ${response.xp_earned} XP and ${response.coins_earned} coins!`);
      fetchData();
    } catch (err) {
      toast.error(err?.message || "Failed to claim");
    }
  };

  const brokenValue = streakInfo?.broken_streak_value || 0;
  const repairCost = Math.min(brokenValue * 5, 200);
  const canRepair = brokenValue > 0 && streakInfo?.broken_streak_date &&
    (Date.now() - new Date(streakInfo.broken_streak_date).getTime() < 86400000);

  const handleRepairStreak = async () => {
    setRepairLoading(true);
    try {
      await apiService.coins.spend(repairCost, 'streak_repair');
      await streaksAPI.repair();
      setRepairModalOpen(false);
      const [s, gam] = await Promise.all([streaksAPI.getStreak(), apiService.gamification.getStats()]);
      setStreakInfo(s);
      setGamificationStats(gam);
      setStats(prev => ({ ...prev, max_streak: s.current_streak }));
      toast.success(`${brokenValue}-day streak restored!`);
    } catch (err) {
      toast.error("Failed to repair streak");
    } finally {
      setRepairLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) { toast.error("Enter a class code"); return; }
    setJoinLoading(true);
    try {
      const cls = await joinClass(user.id, joinCode.trim());
      toast.success(`Joined "${cls.name}"!`);
      setJoinClassOpen(false);
      setJoinCode("");
    } catch (err) {
      toast.error(err?.message || "Failed to join class");
    } finally {
      setJoinLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => !t.completed);
  const todayCompleted = tasks.filter(t => t.check_ins?.includes(todayStr)).length;
  const completionRate = todayTasks.length > 0 ? (todayCompleted / todayTasks.length) * 100 : 0;

  // Get dates with check-ins for calendar
  const checkInDates = tasks.flatMap(t => t.check_ins || []).map(d => new Date(d));

  // My Analytics derived data (from tasks only)
  const barData = getLast7DaysCompletions(tasks);
  const lineData = getLast14DaysXp(tasks);
  const radarData = getSubjectScores(tasks);
  const heatmapWeeks = getHeatmapData(tasks);

  const quickLinks = [
    { icon: <CheckSquare className="w-5 h-5" />, label: "Tasks", href: "/tasks", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
    { icon: <Book className="w-5 h-5" />, label: "Study Hub", href: "/study", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
    { icon: <GraduationCap className="w-5 h-5" />, label: "SAT / ACT", href: "/practice", color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
    { icon: <Users className="w-5 h-5" />, label: "Community", href: "/community", color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
    { icon: <Trophy className="w-5 h-5" />, label: "Competitions", href: "/competitions", color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" },
    { icon: <Gift className="w-5 h-5" />, label: "Shop", href: "/shop", color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" },
    { icon: <BadgeCheck className="w-5 h-5" />, label: "My Grades", href: "/grades", color: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" },
  ];

  const isLite    = user?.plan === "lite";
  const founder   = isFounder(user);
  const founderMeta = getFounderMeta(user);

  if (error) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-[50vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="max-w-md w-full border-border">
          <CardHeader>
            <CardTitle className="text-lg">Couldn't load dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Make sure the backend is running, or switch to mock mode in <code className="text-xs bg-muted px-1 rounded">apiService.js</code> (USE_REAL_API = false).
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fetchData()}>Try again</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header skeleton */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-9 w-56" delay={0} />
          <Skeleton className="h-4 w-44" delay={40} />
        </div>

        {/* Bento grid — 4 card skeletons mirroring the real layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">

          {/* Today's Progress — spans 2 cols */}
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md" delay={80} />
              <Skeleton className="h-4 w-36" delay={100} />
            </div>
            <Skeleton className="h-3 w-full rounded-full" delay={120} />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-xl bg-secondary/50 p-3 space-y-2">
                  <Skeleton className="h-7 w-12 mx-auto" delay={140 + i * 30} />
                  <Skeleton className="h-2.5 w-16 mx-auto" delay={160 + i * 30} />
                </div>
              ))}
            </div>
          </div>

          {/* Streak card */}
          <DashboardCardSkeleton index={1} />

          {/* XP & Level card */}
          <DashboardCardSkeleton index={2} />

          {/* Missions / Weekly Goals card — spans 2 cols */}
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md" delay={200} />
              <Skeleton className="h-4 w-32" delay={220} />
            </div>
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton circle className="h-8 w-8 shrink-0" delay={240 + i * 40} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" delay={260 + i * 40} />
                  <Skeleton className="h-2 w-full rounded-full" delay={280 + i * 40} />
                </div>
                <Skeleton className="h-7 w-16 rounded-md shrink-0" delay={300 + i * 40} />
              </div>
            ))}
          </div>

          {/* Tasks card */}
          <DashboardCardSkeleton index={3} />

        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      data-testid="dashboard"
    >
        {/* Founder Welcome Banner */}
        {founder && founderMeta && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-xl border flex items-center justify-between gap-3 bg-gradient-to-r ${founderMeta.gradient} bg-opacity-10`}
            style={{ background: `linear-gradient(135deg, ${founderMeta.gradient.includes("emerald") ? "rgba(52,211,153,0.08)" : founderMeta.gradient.includes("amber") ? "rgba(245,158,11,0.08)" : founderMeta.gradient.includes("slate") ? "rgba(148,163,184,0.08)" : "rgba(251,191,36,0.08)"}, transparent)` }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{founderMeta.emoji}</span>
              <div>
                <p className={`text-sm font-semibold ${founderMeta.text}`}>{founderMeta.label} — Active</p>
                <p className="text-xs text-muted-foreground">Lifetime access · All benefits unlocked</p>
              </div>
            </div>
            <FounderBadge user={user} size="sm" />
          </motion.div>
        )}

        <PageHeader
          title={`Welcome back, ${user?.name?.split(' ')[0]}!`}
          subtitle="Here's your productivity overview"
        />

        <AssignmentRadar tasks={tasks} />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Today's Progress - Spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2"
          >
            <Card className="h-full border-border hover:shadow-medium transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  Today's Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">{Math.round(completionRate)}%</span>
                  </div>
                  <Slider
                    value={[completionRate]}
                    max={100}
                    step={1}
                    disabled
                    className="cursor-default"
                    data-testid="completion-slider"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-secondary rounded-xl">
                    <p className="text-2xl font-semibold">{stats?.total_tasks || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Tasks</p>
                  </div>
                  <div className="text-center p-3 bg-secondary rounded-xl">
                    <p className="text-2xl font-semibold">{todayCompleted}</p>
                    <p className="text-xs text-muted-foreground">Completed Today</p>
                  </div>
                  <div className="text-center p-3 bg-secondary rounded-xl">
                    <p className="text-2xl font-semibold">{stats?.max_streak || 0}</p>
                    <p className="text-xs text-muted-foreground">Best Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Streak Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-border hover:shadow-medium transition-shadow bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center mb-4">
                  <Flame className="w-8 h-8 text-orange-500" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-4xl font-bold">{stats?.max_streak || 0}</p>
                  {canRepair && (
                    <Button size="sm" variant="outline" onClick={() => setRepairModalOpen(true)} className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 h-7 px-2">
                      Repair streak
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Day Streak</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">Keep it going!</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* XP & Level Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="h-full border-border hover:shadow-medium transition-shadow bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Level {gamificationStats?.level || 1}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Coins className="w-4 h-4" />
                    <span className="font-bold">{gamificationStats?.coins || 0}</span>
                  </div>
                </div>
                <div className="mb-2">
                  <Progress value={gamificationStats?.level_progress || 0} className="h-2" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{gamificationStats?.xp_in_level || 0} XP</span>
                  <span>{gamificationStats?.xp_for_next_level || 100} XP</span>
                </div>
                <p className="text-center text-xs text-purple-600 dark:text-purple-400 mt-3">
                  {gamificationStats?.xp || 0} Total XP
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Founder Pass Card — shown instead of Quick Links header slot for founders */}
          {founder && founderMeta && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
            >
              <Card className={`h-full border-2 ${founderMeta.border} relative overflow-hidden`}>
                {/* Subtle gradient bg */}
                <div className={`absolute inset-0 bg-gradient-to-br ${founderMeta.gradient} opacity-5 pointer-events-none`} />

                <CardContent className="pt-5 pb-4 relative z-10">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${founderMeta.gradient} flex items-center justify-center text-white shadow-lg`}>
                      <span className="text-lg leading-none">{founderMeta.emoji}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${founderMeta.bg} ${founderMeta.text} border ${founderMeta.border}`}>
                      Active
                    </span>
                  </div>

                  <p className="font-semibold text-sm mb-0.5">{founderMeta.label}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {formatPurchaseDate(user?.founder_paid_at)
                      ? `Purchased ${formatPurchaseDate(user.founder_paid_at)}`
                      : "Lifetime access"}
                  </p>

                  {/* Perks preview */}
                  <ul className="space-y-1.5 mb-4">
                    {founderMeta.perks.slice(0, 3).map((perk, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs">
                        <BadgeCheck className={`w-3.5 h-3.5 flex-shrink-0 ${founderMeta.text}`} />
                        <span className="text-muted-foreground">{perk}</span>
                      </li>
                    ))}
                    {founderMeta.perks.length > 3 && (
                      <li className={`text-xs ${founderMeta.text} font-medium pl-5`}>
                        +{founderMeta.perks.length - 3} more benefits
                      </li>
                    )}
                  </ul>

                  {/* Upgrade CTA or "Top tier" indicator */}
                  {canUpgrade(user) && nextTier(user) ? (
                    <Link to="/pricing">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`w-full text-xs h-7 ${founderMeta.border} ${founderMeta.text} hover:${founderMeta.bg}`}
                      >
                        Upgrade to {TIER_META[nextTier(user)]?.label}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <div className={`text-center text-xs font-medium ${founderMeta.text} py-1`}>
                      👑 Top tier — thank you!
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:row-span-2"
          >
            <Card className="h-full border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickLinks.map((link, index) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary transition-colors group"
                  >
                    <div className={`w-9 h-9 rounded-lg ${link.color} flex items-center justify-center`}>
                      {link.icon}
                    </div>
                    <span className="flex-1 font-medium text-sm">{link.label}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
                {user?.role === "student" && (
                  <button
                    onClick={() => setJoinClassOpen(true)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary transition-colors group w-full text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="flex-1 font-medium text-sm">Join Class</span>
                    <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Calendar - Spans 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2"
          >
            <Card className="border-border hover:shadow-medium transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                  Activity Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    checkin: checkInDates
                  }}
                  modifiersStyles={{
                    checkin: {
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      borderRadius: '50%'
                    }
                  }}
                  className="rounded-md"
                  data-testid="activity-calendar"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Missions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="md:col-span-2 lg:col-span-1"
          >
            <Card className="h-full border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-muted-foreground" />
                  Daily Missions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {missions.filter(m => m.mission_type === "daily").slice(0, 4).map((mission) => (
                  <div 
                    key={mission.mission_id}
                    className={`p-3 rounded-lg border ${mission.completed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-secondary/50 border-transparent'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${mission.completed ? 'text-green-700 dark:text-green-400' : ''}`}>
                          {mission.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-purple-500" /> {mission.xp_reward} XP
                          </span>
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-500" /> {mission.coin_reward}
                          </span>
                        </div>
                      </div>
                      {mission.completed && !mission.claimed && (
                        <Button 
                          size="sm" 
                          onClick={() => handleClaimMission(mission.mission_id)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Claim
                        </Button>
                      )}
                      {mission.claimed && (
                        <Badge variant="secondary" className="tag-green">Claimed</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {missions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Loading missions...
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="md:col-span-2 lg:col-span-1"
          >
            <Card className="h-full border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg">Recent Tasks</CardTitle>
                <Link to="/tasks">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {tasks.slice(0, 4).map((task, index) => (
                  <div 
                    key={task.task_id} 
                    className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                  >
                    <div className={`w-2 h-2 rounded-full ${task.check_ins?.includes(todayStr) ? 'bg-green-500' : 'bg-muted'}`}></div>
                    <span className={`flex-1 text-sm ${task.check_ins?.includes(todayStr) ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    {task.streak > 0 && (
                      <span className="text-xs text-orange-500 flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {task.streak}
                      </span>
                    )}
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm mb-4">No tasks yet</p>
                    <Link to="/tasks">
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Add Task
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          {/* Rewards Track Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="md:col-span-2"
          >
            <Card className="h-full border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-muted-foreground" />
                  Rewards Track
                </CardTitle>
                <Link to="/rewards">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {(() => {
                  const currentLevel = gamificationStats?.level ?? 1;
                  const upcoming = REWARDS.filter((r) => r.level > currentLevel).slice(0, 2);
                  if (upcoming.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        You've reached the highest milestone! 🏆
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-2.5">
                      {upcoming.map((reward, i) => (
                        <div
                          key={reward.level}
                          className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50"
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                              reward.isMilestone
                                ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}
                          >
                            {reward.level}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">
                              {reward.emoji ? `${reward.emoji} ` : ""}Level {reward.level} — {reward.title}
                            </p>
                            <p className="text-xs text-amber-500 font-medium mt-0.5">
                              +{reward.coins} coins
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {reward.unlocks[0]}
                              {reward.badge ? ` · ${reward.badge}` : ""}
                            </p>
                          </div>
                          {i === 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] shrink-0 bg-primary/10 text-primary border-primary/20"
                            >
                              Next
                            </Badge>
                          )}
                        </div>
                      ))}
                      <Link
                        to="/rewards"
                        className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                      >
                        View all rewards <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* My Analytics */}
        <section className="mt-8 md:mt-10">
          <h2 className="font-heading text-xl font-semibold mb-4 md:mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            My Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* 7-day task completions bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-base">Task completions (7 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          labelFormatter={(_, payload) => payload[0]?.payload?.date}
                          formatter={(value) => [`${value} completions`, "Tasks"]}
                        />
                        <Bar dataKey="completions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tasks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 14-day XP line chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="border-border h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-base">XP earned (14 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          formatter={(value) => [value, "XP"]}
                          labelFormatter={(_, payload) => payload[0]?.payload?.date}
                        />
                        <Line type="monotone" dataKey="xp" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="XP" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Subject radar chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-base">Performance by subject</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 16, right: 24, left: 24, bottom: 16 }}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, radarData[0]?.fullMark ?? 100]} tick={{ fontSize: 10 }} />
                        <Radar name="Check-ins" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          formatter={(value) => [value, "Check-ins"]}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Streak / activity heatmap (GitHub-style) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-border h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-base">Activity heatmap</CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Last 12 weeks · like GitHub contributions</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="flex gap-[3px] min-w-[280px] w-full justify-end">
                      {heatmapWeeks.map((week, colIndex) => (
                        <div key={colIndex} className="flex flex-col gap-[3px]">
                          {week.map((cell, rowIndex) => {
                            const level = cell.count === 0 ? 0 : cell.count >= 4 ? 4 : Math.min(cell.count, 3);
                            const bg =
                              level === 0
                                ? "hsl(var(--muted))"
                                : level === 1
                                  ? "hsl(var(--primary) / 0.35)"
                                  : level === 2
                                    ? "hsl(var(--primary) / 0.6)"
                                    : level === 3
                                      ? "hsl(var(--primary) / 0.85)"
                                      : "hsl(var(--primary))";
                            return (
                              <div
                                key={`${colIndex}-${rowIndex}`}
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: bg }}
                                title={`${cell.date}: ${cell.count} completion${cell.count !== 1 ? "s" : ""}`}
                                aria-label={`${cell.date} ${cell.count} completions`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>Less</span>
                      <span>More</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

      <Dialog open={repairModalOpen} onOpenChange={setRepairModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Repair Streak</DialogTitle>
            <DialogDescription>
              Repair your {brokenValue}-day streak for {repairCost} coins?
            </DialogDescription>
          </DialogHeader>
          {(gamificationStats?.coins ?? 0) < repairCost && (
            <p className="text-sm text-destructive">Not enough coins ({gamificationStats?.coins ?? 0} / {repairCost})</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRepairModalOpen(false)} disabled={repairLoading}>Cancel</Button>
            <Button
              onClick={handleRepairStreak}
              disabled={repairLoading || (gamificationStats?.coins ?? 0) < repairCost}
            >
              {repairLoading ? "Repairing…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={joinClassOpen} onOpenChange={setJoinClassOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Join a Class</DialogTitle>
            <DialogDescription>Enter the class code your teacher gave you.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. AB12CD"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleJoinClass()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setJoinClassOpen(false)} disabled={joinLoading}>Cancel</Button>
            <Button onClick={handleJoinClass} disabled={joinLoading}>
              {joinLoading ? "Joining…" : "Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
