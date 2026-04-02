import { supabase } from "./supabaseClient";
import { awardCoins } from "./coinService";

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
  const { data: mission, error: fetchError } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !mission) {
    throw new Error("Mission not found");
  }
  if (mission.claimed) {
    throw new Error("Mission already claimed");
  }

  const { error: updateError } = await supabase
    .from("missions")
    .update({ claimed: true, completed: true })
    .eq("id", missionId);

  if (updateError) {
    throw new Error("Failed to claim mission");
  }

  await awardCoins(userId, mission.coins_reward, "mission_claim");

  await supabase.rpc("increment_xp", {
    user_id: userId,
    amount: mission.xp_reward,
  });

  return { xp_earned: mission.xp_reward, coins_earned: mission.coins_reward };
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
