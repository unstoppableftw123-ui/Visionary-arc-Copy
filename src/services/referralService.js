import { supabase } from './supabaseClient';
import { awardXP, awardCoins } from './db';

export function getReferralCode(userId) {
  return (userId ?? '').slice(0, 8).toUpperCase();
}

export async function getReferralStats(userId) {
  const { data, error } = await supabase
    .from('referrals')
    .select('status, coins_awarded')
    .eq('referrer_id', userId);

  if (error) throw error;

  const stats = {
    total: data?.length ?? 0,
    signed_up: 0,
    streak_7: 0,
    upgraded: 0,
    coins_earned: 0,
  };

  for (const row of data ?? []) {
    if (row.status === 'signed_up') stats.signed_up += 1;
    if (row.status === 'streak_7') stats.streak_7 += 1;
    if (row.status === 'upgraded') stats.upgraded += 1;
    stats.coins_earned += row.coins_awarded ?? 0;
  }

  return stats;
}

const STATUS_ORDER = {
  pending: 0,
  signed_up: 1,
  streak_7: 2,
  upgraded: 3,
};

const MILESTONE_REWARDS = {
  streak_7: { xp: 100, coins: 50 },
  upgraded: { xp: 500, coins: 250 },
};

async function findReferral(referrerId, referredId) {
  const { data, error } = await supabase
    .from('referrals')
    .select('id, status, coins_awarded')
    .eq('referrer_id', referrerId)
    .eq('referred_id', referredId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function trackReferral(referrerCode, newUserId) {
  const normalizedCode = (referrerCode ?? '').slice(0, 8).toUpperCase();
  if (!normalizedCode || !newUserId) return { success: false };

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('id', `${normalizedCode}%`)
    .limit(1);

  if (profileError) throw profileError;
  if (!profiles || profiles.length === 0) return { success: false };

  const referrerId = profiles[0].id;
  if (referrerId === newUserId) return { success: false };

  const existing = await findReferral(referrerId, newUserId);
  if (existing && (STATUS_ORDER[existing.status] ?? 0) >= STATUS_ORDER.signed_up) {
    return { success: true };
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('referrals').insert({
      referrer_id: referrerId,
      referred_id: newUserId,
      status: 'pending',
      coins_awarded: 0,
      created_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;
  }

  await awardXP(referrerId, 300);
  await awardCoins(referrerId, 100, 'referral_signed_up');

  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      status: 'signed_up',
      coins_awarded: Math.max(existing?.coins_awarded ?? 0, 100),
    })
    .eq('referrer_id', referrerId)
    .eq('referred_id', newUserId);

  if (updateError) throw updateError;

  return { success: true };
}

export async function awardReferralMilestone(referrerId, referredId, milestone) {
  const reward = MILESTONE_REWARDS[milestone];
  if (!reward) return { success: false };

  const referral = await findReferral(referrerId, referredId);
  if (!referral) return { success: false };

  const currentOrder = STATUS_ORDER[referral.status] ?? 0;
  const targetOrder = STATUS_ORDER[milestone] ?? 0;
  if (targetOrder <= currentOrder) return { success: true };

  await awardXP(referrerId, reward.xp);
  await awardCoins(referrerId, reward.coins, `referral_${milestone}`);

  const { error } = await supabase
    .from('referrals')
    .update({
      status: milestone,
      coins_awarded: (referral.coins_awarded ?? 0) + reward.coins,
    })
    .eq('id', referral.id);

  if (error) throw error;
  return { success: true };
}
