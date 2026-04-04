import { supabase } from './supabaseClient';
import { MOCK_MISSIONS, getMockProfile } from '../db/mockData';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

// ─── Mock mission store (in-memory for the session) ─────────────────────────
let mockMissions = MOCK_MISSIONS.map((m) => ({ ...m }));

// submission_url is stored in-memory for mock mode (not a DB column on missions)
const mockSubmissions = {}; // missionId → { url, notes }

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Return today's missions for a user. Seeds 3 daily missions if none exist yet.
 */
export async function getMissions(userId) {
  if (USE_MOCK) {
    const today = new Date().toISOString().split('T')[0];
    return mockMissions.filter(
      (m) => m.user_id === userId && m.date === today
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today);

  if (error) {
    console.error('getMissions error:', error);
    return [];
  }

  // Auto-seed if none for today
  if (!data || data.length === 0) {
    await seedDailyMissions(userId);
    return getMissions(userId);
  }
  return data;
}

/**
 * Mark a completed mission as claimed and return updated mission.
 */
export async function claimMission(userId, missionId) {
  if (USE_MOCK) {
    const mission = mockMissions.find(
      (m) => m.id === missionId && m.user_id === userId
    );
    if (!mission) throw new Error('Mission not found');
    if (!mission.completed) throw new Error('Mission not completed yet');
    if (mission.claimed) throw new Error('Mission already claimed');

    // Check daily claim limit (max 3/day)
    const today = new Date().toISOString().split('T')[0];
    const claimedToday = mockMissions.filter(
      (m) => m.user_id === userId && m.date === today && m.claimed
    ).length;
    if (claimedToday >= 3) throw new Error('Daily claim limit reached');

    mission.claimed = true;
    return { ...mission };
  }

  // Check daily claim limit
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('missions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('date', today)
    .eq('claimed', true);

  if ((count ?? 0) >= 3) throw new Error('Daily claim limit reached');

  const { data: mission, error: fetchErr } = await supabase
    .from('missions')
    .select('*')
    .eq('id', missionId)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !mission) throw new Error('Mission not found');
  if (!mission.completed) throw new Error('Mission not completed yet');
  if (mission.claimed) throw new Error('Mission already claimed');

  const { data: updated, error: updateErr } = await supabase
    .from('missions')
    .update({ claimed: true })
    .eq('id', missionId)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return updated;
}

/**
 * Increment progress on a mission. Marks completed when progress >= target.
 */
export async function incrementMissionProgress(userId, missionId, by = 1) {
  if (USE_MOCK) {
    const mission = mockMissions.find(
      (m) => m.id === missionId && m.user_id === userId
    );
    if (!mission || mission.completed) return;
    mission.progress = Math.min(mission.progress + by, mission.target);
    if (mission.progress >= mission.target) mission.completed = true;
    return { ...mission };
  }

  const { data: mission } = await supabase
    .from('missions')
    .select('progress, target, completed')
    .eq('id', missionId)
    .eq('user_id', userId)
    .single();

  if (!mission || mission.completed) return;

  const newProgress = Math.min(mission.progress + by, mission.target);
  const completed = newProgress >= mission.target;

  const { data, error } = await supabase
    .from('missions')
    .update({ progress: newProgress, completed })
    .eq('id', missionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Seed 3 randomised daily missions for a user if none exist for today.
 */
export async function seedDailyMissions(userId) {
  if (USE_MOCK) {
    const today = new Date().toISOString().split('T')[0];
    const existing = mockMissions.filter(
      (m) => m.user_id === userId && m.type === 'daily' && m.date === today
    );
    if (existing.length > 0) return;

    const pool = [
      { title: 'Study Session Starter', description: 'Complete a flashcard session with 10+ cards', xp_reward: 25, coins_reward: 10, target: 1 },
      { title: 'Quiz Champion', description: 'Score 80%+ on a quiz', xp_reward: 50, coins_reward: 20, target: 1 },
      { title: 'Note Taker', description: 'Save a summary or note in Study Hub', xp_reward: 25, coins_reward: 10, target: 1 },
      { title: 'Streak Keeper', description: 'Log in and study today', xp_reward: 30, coins_reward: 12, target: 1 },
      { title: 'SAT Grinder', description: 'Complete a SAT/ACT practice session', xp_reward: 50, coins_reward: 20, target: 1 },
    ];
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    const seeds = shuffled.map((m, i) => ({
      id: `mock-mission-seeded-${Date.now()}-${i}`,
      user_id: userId,
      type: 'daily',
      progress: 0,
      completed: false,
      claimed: false,
      date: today,
      created_at: new Date().toISOString(),
      ...m,
    }));
    mockMissions = [...mockMissions, ...seeds];
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('missions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'daily')
    .eq('date', today)
    .limit(1);

  if (existing && existing.length > 0) return;

  const pool = [
    { title: 'Study Session Starter', description: 'Complete a flashcard session with 10+ cards', xp_reward: 25, coins_reward: 10, target: 1 },
    { title: 'Quiz Champion', description: 'Score 80%+ on a quiz', xp_reward: 50, coins_reward: 20, target: 1 },
    { title: 'Note Taker', description: 'Save a summary or note in Study Hub', xp_reward: 25, coins_reward: 10, target: 1 },
    { title: 'Streak Keeper', description: 'Log in and study today', xp_reward: 30, coins_reward: 12, target: 1 },
    { title: 'SAT Grinder', description: 'Complete a SAT/ACT practice session', xp_reward: 50, coins_reward: 20, target: 1 },
  ];
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  const rows = shuffled.map((m) => ({
    user_id: userId,
    type: 'daily',
    progress: 0,
    completed: false,
    claimed: false,
    date: today,
    ...m,
  }));

  const { error } = await supabase.from('missions').insert(rows);
  if (error) console.error('seedDailyMissions error:', error);
}

/**
 * How many missions has the user claimed today?
 */
export async function getDailyClaimCount(userId) {
  if (USE_MOCK) {
    const today = new Date().toISOString().split('T')[0];
    return mockMissions.filter(
      (m) => m.user_id === userId && m.date === today && m.claimed
    ).length;
  }

  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('missions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('date', today)
    .eq('claimed', true);

  if (error) {
    console.error('getDailyClaimCount error:', error);
    return 0;
  }
  return count ?? 0;
}

// ─── MissionBoard compatibility layer ────────────────────────────────────────
// MissionBoard uses a claim/assignment workflow (in_progress → submitted → approved).
// We map the missions table fields to that shape here.

function missionToAssignment(m) {
  const sub = mockSubmissions[m.id];
  let status = 'in_progress';
  if (m.claimed) status = 'approved';
  else if (sub?.url) status = 'submitted';
  return {
    id: m.id,
    status,
    submission_url: sub?.url ?? null,
    submission_note: sub?.notes ?? null,
    mission: m,
  };
}

/**
 * Return missions available for the user to work on today (not yet claimed).
 * Used by MissionBoard "Available" tab.
 */
export async function getAvailableMissions(userId) {
  if (USE_MOCK) {
    const today = new Date().toISOString().split('T')[0];
    // Seed if needed then return unclaimed, incomplete missions
    const todayMissions = mockMissions.filter(
      (m) => m.user_id === userId && m.date === today
    );
    if (todayMissions.length === 0) await seedDailyMissions(userId);
    return mockMissions.filter(
      (m) => m.user_id === userId && m.date === today && !m.claimed && !mockSubmissions[m.id]?.url
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('claimed', false);

  if (error) {
    console.error('getAvailableMissions error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    await seedDailyMissions(userId);
    return getAvailableMissions(userId);
  }
  return data ?? [];
}

/**
 * Return the user's claimed/in-progress/submitted/approved missions
 * shaped as assignment objects for MissionBoard tabs.
 */
export async function getUserAssignments(userId) {
  if (USE_MOCK) {
    const today = new Date().toISOString().split('T')[0];
    const active = mockMissions.filter(
      (m) => m.user_id === userId && m.date === today && (m.completed || m.claimed || mockSubmissions[m.id])
    );
    return active.map(missionToAssignment);
  }

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .or('completed.eq.true,claimed.eq.true');

  if (error) {
    console.error('getUserAssignments error:', error);
    return [];
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    status: m.claimed ? 'approved' : m.completed ? 'submitted' : 'in_progress',
    submission_url: m.submission_url ?? null,
    submission_note: m.submission_notes ?? null,
    mission: m,
  }));
}

/**
 * Submit work for a mission (paste link → marks as ready for review).
 * @param {string} missionId
 * @param {string} url
 * @param {string|undefined} note
 */
export async function submitMission(missionId, url, note) {
  if (USE_MOCK) {
    mockSubmissions[missionId] = { url, notes: note ?? null };
    const mission = mockMissions.find((m) => m.id === missionId);
    if (mission) mission.completed = true;
    return;
  }

  const { error } = await supabase
    .from('missions')
    .update({
      completed: true,
      submission_url: url,
      submission_notes: note ?? null,
    })
    .eq('id', missionId);

  if (error) throw error;
}
