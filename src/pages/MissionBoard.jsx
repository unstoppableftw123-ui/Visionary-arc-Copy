import { useState, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../App';
import { Skeleton } from '../components/ui/skeleton';
import MissionCard from '../components/mission-board/MissionCard';
import SubmitMissionModal from '../components/mission-board/SubmitMissionModal';
import ClaimLimitBanner from '../components/mission-board/ClaimLimitBanner';
import {
  getAvailableMissions,
  getUserAssignments,
  claimMission,
  getDailyClaimCount,
} from '../services/missionService';
import { TRACK_ICONS, RANK_COLORS } from '../styles/ranks';
import { toast } from 'sonner';

const TABS = ['Available', 'In Progress', 'Under Review', 'Completed'];

const TRACKS = Object.keys(TRACK_ICONS);
const DIFFICULTIES = Object.keys(RANK_COLORS);

function CardGrid({ children }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="empty-state col-span-full">
      <span className="chibi">📋</span>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{label}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <CardGrid>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl shimmer" />
      ))}
    </CardGrid>
  );
}

export default function MissionBoard() {
  const { user } = useContext(AuthContext);
  const userId = user?.id;
  const userRank = user?.rank ?? 'E';
  const userCoins = user?.coins ?? 0;

  const [activeTab, setActiveTab]       = useState('Available');
  const [trackFilters, setTrackFilters] = useState([]);
  const [diffFilters, setDiffFilters]   = useState([]);

  const [available, setAvailable]       = useState([]);
  const [assignments, setAssignments]   = useState([]);
  const [dailyCount, setDailyCount]     = useState(0);
  const [loading, setLoading]           = useState(true);

  const [submitTarget, setSubmitTarget] = useState(null); // assignment row

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [av, as, dc] = await Promise.all([
        getAvailableMissions(userId),
        getUserAssignments(userId),
        getDailyClaimCount(userId),
      ]);
      setAvailable(av);
      setAssignments(as);
      setDailyCount(dc);
    } catch (err) {
      toast.error('Failed to load missions.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (missionId) => {
    if (dailyCount >= 3) {
      toast.warning('Daily claim limit reached. Unlock an extra slot or wait until midnight UTC.');
      return;
    }
    try {
      await claimMission(userId, missionId);
      toast.success('Mission claimed! You have 72 hours to complete it.');
      load();
    } catch (err) {
      toast.error(err?.message ?? 'Could not claim mission.');
    }
  };

  // ── Filter helpers ────────────────────────────────────────────────────────

  const toggleTrack = (track) =>
    setTrackFilters((prev) =>
      prev.includes(track) ? prev.filter((t) => t !== track) : [...prev, track]
    );

  const toggleDiff = (d) =>
    setDiffFilters((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const applyFilters = (items, getTrack, getDiff) =>
    items.filter(
      (item) =>
        (trackFilters.length === 0 || trackFilters.includes(getTrack(item))) &&
        (diffFilters.length === 0 || diffFilters.includes(getDiff(item)))
    );

  // ── Derived tab data ──────────────────────────────────────────────────────

  const inProgress  = assignments.filter((a) => a.status === 'in_progress');
  const underReview = assignments.filter((a) => a.status === 'submitted');
  const completed   = assignments.filter((a) => a.status === 'approved');

  const filteredAvailable   = applyFilters(available,   (m) => m.track,        (m) => m.difficulty);
  const filteredInProgress  = applyFilters(inProgress,  (a) => a.mission?.track,   (a) => a.mission?.difficulty);
  const filteredUnderReview = applyFilters(underReview, (a) => a.mission?.track,   (a) => a.mission?.difficulty);
  const filteredCompleted   = applyFilters(completed,   (a) => a.mission?.track,   (a) => a.mission?.difficulty);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Mission Board</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Claim missions from your guilds, build real work, and earn XP.
        </p>
      </div>

      {/* Daily claim limit banner */}
      <ClaimLimitBanner
        dailyCount={dailyCount}
        userCoins={userCoins}
        userId={userId}
        onSlotUnlocked={load}
      />

      {/* Tabs */}
      <div className="tab-bar mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
            {tab === 'In Progress' && inProgress.length > 0 && (
              <span className="ml-1.5 text-sm md:text-xs rounded-full px-1.5 py-0.5" style={{ background: "var(--rank-b)", color: "var(--bg-base)", fontWeight: 700 }}>
                {inProgress.length}
              </span>
            )}
            {tab === 'Under Review' && underReview.length > 0 && (
              <span className="ml-1.5 text-sm md:text-xs rounded-full px-1.5 py-0.5" style={{ background: "var(--rank-c)", color: "var(--bg-base)", fontWeight: 700 }}>
                {underReview.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Track filters */}
        <div className="flex flex-wrap gap-1.5">
          {TRACKS.map((track) => (
            <button
              key={track}
              onClick={() => toggleTrack(track)}
              className="difficulty-pill capitalize"
              data-rank={trackFilters.includes(track) ? "B" : undefined}
              style={trackFilters.includes(track) ? {} : { color: "var(--text-secondary)", borderColor: "var(--border)" }}
            >
              {TRACK_ICONS[track]} {track}
            </button>
          ))}
        </div>

        {/* Difficulty filters */}
        <div className="flex gap-1.5">
          {DIFFICULTIES.map((d) => {
            const meta = RANK_COLORS[d];
            const active = diffFilters.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDiff(d)}
                className={`badge-rank ${active ? `rank-glow-${d}` : ''}`}
                data-rank={active ? d : undefined}
                style={!active ? { color: "var(--text-muted)", borderColor: "var(--border)" } : {}}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <SkeletonGrid key="skeleton" />
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'Available' && (
              <CardGrid>
                {filteredAvailable.length === 0 ? (
                  <EmptyState label="No available missions match your filters. Join more guilds or adjust filters." />
                ) : (
                  filteredAvailable.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      assignment={null}
                      userRank={userRank}
                      onClaim={() => handleClaim(mission.id)}
                    />
                  ))
                )}
              </CardGrid>
            )}

            {activeTab === 'In Progress' && (
              <CardGrid>
                {filteredInProgress.length === 0 ? (
                  <EmptyState label="No missions in progress. Claim one from the Available tab!" />
                ) : (
                  filteredInProgress.map((assignment) => (
                    <MissionCard
                      key={assignment.id}
                      mission={assignment.mission}
                      assignment={assignment}
                      userRank={userRank}
                      onSubmit={setSubmitTarget}
                    />
                  ))
                )}
              </CardGrid>
            )}

            {activeTab === 'Under Review' && (
              <CardGrid>
                {filteredUnderReview.length === 0 ? (
                  <EmptyState label="Nothing under review yet. Submit a mission to get feedback." />
                ) : (
                  filteredUnderReview.map((assignment) => (
                    <MissionCard
                      key={assignment.id}
                      mission={assignment.mission}
                      assignment={assignment}
                      userRank={userRank}
                    />
                  ))
                )}
              </CardGrid>
            )}

            {activeTab === 'Completed' && (
              <CardGrid>
                {filteredCompleted.length === 0 ? (
                  <EmptyState label="No completed missions yet. Keep going — you've got this!" />
                ) : (
                  filteredCompleted.map((assignment) => (
                    <MissionCard
                      key={assignment.id}
                      mission={assignment.mission}
                      assignment={assignment}
                      userRank={userRank}
                    />
                  ))
                )}
              </CardGrid>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit modal */}
      <SubmitMissionModal
        assignment={submitTarget}
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        onSuccess={load}
      />
    </div>
  );
}
