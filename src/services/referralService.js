import { supabase } from './supabaseClient';

export function getReferralCode(userId) {
  return userId.substr(0, 8).toUpperCase();
}

export async function getReferralStats(userId) {
  const { data, error } = await supabase
    .from('referrals')
    .select('id, referred_user_reached_paid, created_at')
    .eq('referrer_id', userId);

  if (error) throw error;

  const total_referrals = data.length;
  const completed_referrals = data.filter((r) => r.referred_user_reached_paid).length;
  const coins_earned = completed_referrals * 50;

  return { total_referrals, completed_referrals, coins_earned };
}

export async function trackReferral(referrerCode, newUserId) {
  // Find the referrer by matching the first 8 chars of their id (case-insensitive)
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .ilike('id', `${referrerCode}%`)
    .limit(1);

  if (userError) throw userError;
  if (!users || users.length === 0) return null;

  const referrer_id = users[0].id;

  const { error: insertError } = await supabase
    .from('referrals')
    .insert({ referrer_id, referred_user_id: newUserId, created_at: new Date().toISOString() });

  if (insertError) throw insertError;

  return referrer_id;
}
