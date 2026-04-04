import { supabase } from './supabaseClient';
import { MOCK_PROFILES, MOCK_TRANSACTIONS, getMockProfile } from '../db/mockData';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

// ─── Mock coin store (in-memory for the session) ────────────────────────────
const mockBalances = {};
function getMockBalance(userId) {
  if (mockBalances[userId] === undefined) {
    mockBalances[userId] = getMockProfile(userId)?.coins ?? 100;
  }
  return mockBalances[userId];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Award coins to a user. Returns the new balance.
 * Requires the `increment_coins` RPC function in Supabase:
 *
 *   create or replace function increment_coins(user_id uuid, amount int)
 *   returns int language sql as $$
 *     update profiles set coins = coins + amount where id = user_id returning coins;
 *   $$;
 */
export async function awardCoins(userId, amount, reason) {
  if (USE_MOCK) {
    const newBalance = getMockBalance(userId) + amount;
    mockBalances[userId] = newBalance;
    return newBalance;
  }

  const { data, error } = await supabase.rpc('increment_coins', {
    user_id: userId,
    amount,
  });
  if (error) {
    console.error('awardCoins rpc error:', error);
    return null;
  }

  const newBalance = data;
  await supabase.from('transactions').insert({
    user_id: userId,
    amount,
    reason,
    balance_after: newBalance,
  });
  return newBalance;
}

/**
 * Deduct coins from a user. Returns the new balance, or null if insufficient.
 */
export async function spendCoins(userId, amount, reason) {
  if (USE_MOCK) {
    const current = getMockBalance(userId);
    if (current < amount) return null;
    const newBalance = current - amount;
    mockBalances[userId] = newBalance;
    return newBalance;
  }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('spendCoins fetch error:', fetchError);
    return null;
  }

  if (profile.coins < amount) return null;

  const { data, error } = await supabase.rpc('increment_coins', {
    user_id: userId,
    amount: -amount,
  });
  if (error) {
    console.error('spendCoins rpc error:', error);
    return null;
  }

  const newBalance = data;
  await supabase.from('transactions').insert({
    user_id: userId,
    amount: -amount,
    reason,
    balance_after: newBalance,
  });
  return newBalance;
}

/**
 * Get current coin balance for a user.
 */
export async function getBalance(userId) {
  if (USE_MOCK) {
    return getMockBalance(userId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('getBalance error:', error);
    return 0;
  }
  return data?.coins ?? 0;
}

/**
 * Get transaction history for a user.
 */
export async function getTransactions(userId, limit = 20) {
  if (USE_MOCK) {
    return MOCK_TRANSACTIONS
      .filter((t) => t.user_id === userId)
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getTransactions error:', error);
    return [];
  }
  return data ?? [];
}
