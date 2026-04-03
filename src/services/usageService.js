import { supabase } from './supabaseClient';

// ─── Daily limits per tier ────────────────────────────────────────────────────
const DAILY_LIMITS = {
  free:   { flashcards: 10, quiz: 5,  summary: 5,  brief: 1 },
  seed:   { flashcards: 30, quiz: 15, summary: 15, brief: 4 },
  bronze: { flashcards: 30, quiz: 15, summary: 15, brief: 4 },
  silver: { flashcards: 60, quiz: 30, summary: 30, brief: 7 },
  gold:   { flashcards: 100,quiz: 50, summary: 50, brief: 14 },
};

/** Map aiRouter feature keys → limit bucket */
function featureToLimitKey(feature) {
  if (feature === 'flashcards')     return 'flashcards';
  if (feature === 'quiz')           return 'quiz';
  if (feature === 'brief_generation') return 'brief';
  return 'summary'; // summarize, notes, short_summary, slides, etc.
}

/**
 * Returns daily call limits for a given founder tier (or free).
 * @param {string|null} founderTier
 * @returns {{ flashcards: number, quiz: number, summary: number, brief: number }}
 */
export function getLimits(founderTier) {
  return DAILY_LIMITS[founderTier] ?? DAILY_LIMITS.free;
}

/**
 * Counts today's AI calls from ai_usage_log, grouped by feature bucket.
 * @param {string} userId
 * @returns {Promise<{ flashcards: number, quiz: number, summary: number, brief: number }>}
 */
export async function getUsageToday(userId) {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('ai_usage_log')
    .select('feature')
    .eq('user_id', userId)
    .gte('created_at', todayMidnight.toISOString());

  const counts = { flashcards: 0, quiz: 0, summary: 0, brief: 0 };
  if (error || !data) return counts;

  for (const row of data) {
    const key = featureToLimitKey(row.feature);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Checks whether a user can make an AI call for a given feature.
 * Fetches founder_tier and coins from the users table in one query.
 *
 * Returns:
 *   { allowed: true, remaining: n }                         — within free limit
 *   { allowed: true, reason: 'costs_coins', coinCost: 50 } — over limit but has coins
 *   { allowed: false, reason: 'limit_reached' }             — over limit, no coins
 *
 * @param {string} userId
 * @param {string} feature — aiRouter feature key
 * @param {string|null} founderTier — pass from context to skip DB fetch, or null to fetch
 */
export async function canMakeCall(userId, feature, founderTier = null) {
  // Fetch user profile once (coins + tier)
  const { data: userData } = await supabase
    .from('users')
    .select('coins, founder_tier')
    .eq('id', userId)
    .single();

  const tier   = founderTier ?? userData?.founder_tier ?? null;
  const coins  = userData?.coins ?? 0;
  const limits = getLimits(tier);

  const limitKey = featureToLimitKey(feature);
  const limit    = limits[limitKey] ?? limits.summary;

  const usage    = await getUsageToday(userId);
  const used     = usage[limitKey] ?? 0;

  if (used < limit) {
    return { allowed: true, remaining: limit - used };
  }

  // Over the free limit
  if (coins >= 50) {
    return { allowed: true, reason: 'costs_coins', coinCost: 50 };
  }

  return { allowed: false, reason: 'limit_reached' };
}
