import { supabase } from "./supabaseClient";
import { awardCoins } from "./coinService";
import { awardXP } from "./db";
import { addSeasonXP } from "./leaderboardService";

const DAILY_MISSION_POOL = [
  { title: "Study 5 flashcards", description: "Review 5 flashcards in the Study Hub" },
  { title: "Complete a quiz", description: "Finish a quiz with at least 3 questions" },
  { title: "Use AI Tutor for 5 turns", description: "Have a 5-turn conversation with the AI Tutor" },
  { title: "Summarize a document", description: "Use the summarize mode in Study Hub" },
  { title: "Create a flashcard set", description: "Create a new flashcard set" },
];

function tomorrowMidnightUTC() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export async function getMissions(userId) {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("user_id", userId)
    .gt("reset_at", new Date().toISOString());

  if (error) {
    console.error("getMissions error:", error);
    return [];
  }
  return data;
}

export async function claimMission(userId, missionId) {
  // Check daily claim limit
  const dailyCount = await getDailyClaimCount(userId);
  if (dailyCount >= 3) {
    throw new Error("Daily claim limit reached");
  }

  // Fetch the mission
  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (missionError || !mission) {
    throw new Error("Mission not found");
  }

  if (mission.status !== "published") {
    throw new Error("Mission unavailable");
  }

  // Fetch user rank
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rank")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found");
  }

  const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];
  const userRankIdx = RANK_ORDER.indexOf(profile.rank ?? "E");
  const minRankIdx = RANK_ORDER.indexOf(mission.min_rank_required ?? "E");
  if (userRankIdx < minRankIdx) {
    throw new Error("Rank too low");
  }

  // Check for existing assignment (unique constraint guard)
  const { data: existing } = await supabase
    .from("mission_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (existing) {
    throw new Error("Mission already claimed");
  }

  const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from("mission_assignments").insert({
    user_id: userId,
    mission_id: missionId,
    status: "in_progress",
    deadline,
    claimed_at: new Date().toISOString(),
  });

  if (insertError) {
    if (insertError.code === "23505") throw new Error("Mission already claimed");
    throw insertError;
  }

  // If max_claims is set and reached, mark mission as claimed
  if (mission.max_claims != null) {
    const { count } = await supabase
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("mission_id", missionId);

    if (count >= mission.max_claims) {
      await supabase
        .from("missions")
        .update({ status: "claimed" })
        .eq("id", missionId);
    }
  }
}

export async function submitMission(assignmentId, submissionUrl, note) {
  const { error } = await supabase
    .from("mission_assignments")
    .update({
      status: "submitted",
      submission_url: submissionUrl,
      ...(note !== undefined && { submission_note: note }),
      submitted_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);

  if (error) throw error;
}

export async function getDailyClaimCount(userId) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("mission_assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("claimed_at", startOfToday.toISOString());

  if (error) {
    console.error("getDailyClaimCount error:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Fetch published missions available to the user from their guilds.
 * Excludes missions the user has already claimed.
 */
export async function getAvailableMissions(userId) {
  // 1. Get the guild IDs the user belongs to
  const { data: memberships, error: membErr } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (membErr) {
    console.error('getAvailableMissions memberships error:', membErr);
    return [];
  }

  const guildIds = (memberships ?? []).map((m) => m.guild_id);
  if (guildIds.length === 0) return [];

  // 2. Get missions from those guilds that are still published
  const { data: missions, error: missErr } = await supabase
    .from('missions')
    .select('*')
    .in('guild_id', guildIds)
    .eq('status', 'published');

  if (missErr) {
    console.error('getAvailableMissions missions error:', missErr);
    return [];
  }

  if (!missions || missions.length === 0) return [];

  // 3. Get mission IDs the user has already claimed
  const missionIds = missions.map((m) => m.id);
  const { data: claimed } = await supabase
    .from('mission_assignments')
    .select('mission_id')
    .eq('user_id', userId)
    .in('mission_id', missionIds);

  const claimedSet = new Set((claimed ?? []).map((c) => c.mission_id));

  return missions.filter((m) => !claimedSet.has(m.id));
}

/**
 * Fetch all of the user's mission assignments with mission data joined.
 * Returns an array of assignment objects each containing a `mission` key.
 */
export async function getUserAssignments(userId) {
  const { data, error } = await supabase
    .from('mission_assignments')
    .select('*, mission:missions(*)')
    .eq('user_id', userId)
    .order('claimed_at', { ascending: false });

  if (error) {
    console.error('getUserAssignments error:', error);
    return [];
  }

  return data ?? [];
}

export async function seedDailyMissions(userId) {
  const resetAt = tomorrowMidnightUTC();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from("missions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "daily")
    .gte("reset_at", todayStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return;

  const shuffled = [...DAILY_MISSION_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  const rows = selected.map((m) => ({
    user_id: userId,
    type: "daily",
    title: m.title,
    description: m.description,
    xp_reward: 20,
    coins_reward: 10,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    reset_at: resetAt,
  }));

  const { error } = await supabase.from("missions").insert(rows);
  if (error) {
    console.error("seedDailyMissions error:", error);
  }
}

/**
 * Approve a submitted mission assignment.
 * Awards XP + coins to the user and updates their leaderboard season scores.
 *
 * @param {string} assignmentId - The mission_assignments row to approve
 */
export async function approveMission(assignmentId) {
  // 1. Load the assignment + linked mission for reward values and metadata
  const { data: assignment, error: fetchErr } = await supabase
    .from("mission_assignments")
    .select("*, mission:missions(xp_reward, coins_reward, title, description, track, difficulty, guild_id, guild_name)")
    .eq("id", assignmentId)
    .single();

  if (fetchErr || !assignment) {
    throw new Error("Assignment not found");
  }

  if (assignment.status !== "submitted") {
    throw new Error("Assignment is not in submitted state");
  }

  const xpReward = assignment.mission?.xp_reward ?? 0;
  const coinsReward = assignment.mission?.coins_reward ?? 0;
  const userId = assignment.user_id;

  // 2. Mark as approved
  const { error: updateErr } = await supabase
    .from("mission_assignments")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (updateErr) throw updateErr;

  // 3. Award XP and coins
  if (xpReward > 0) await awardXP(userId, xpReward);
  if (coinsReward > 0) await awardCoins(userId, coinsReward, "mission_approved");

  // 4. Update leaderboard season scores
  if (xpReward > 0) await addSeasonXP(userId, xpReward);

  // 5. Auto-insert portfolio entry
  const now = new Date().toISOString();
  await supabase.from("portfolio_entries").insert({
    user_id: userId,
    assignment_id: assignmentId,
    title: assignment.mission?.title ?? "Mission",
    description: assignment.mission?.description ?? "",
    track: assignment.mission?.track ?? null,
    difficulty: assignment.mission?.difficulty ?? null,
    guild_id: assignment.mission?.guild_id ?? null,
    guild_name: assignment.mission?.guild_name ?? null,
    submission_url: assignment.submission_url ?? null,
    completed_at: now,
    is_public: true,
    is_featured: false,
  });

  return { userId, xpReward, coinsReward };
}
