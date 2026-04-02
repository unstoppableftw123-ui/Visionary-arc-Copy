/*
  Run this SQL in Supabase before using this service:

  CREATE OR REPLACE FUNCTION increment_coins(user_id uuid, amount int)
  RETURNS int AS $$
    UPDATE users SET coins = coins + amount WHERE id = user_id RETURNING coins;
  $$ LANGUAGE sql;
*/

import { supabase } from "./supabaseClient";

export async function awardCoins(userId, amount, reason) {
  const { data, error } = await supabase.rpc("increment_coins", {
    user_id: userId,
    amount,
  });

  if (error) {
    console.error("awardCoins rpc error:", error);
    return null;
  }

  const newBalance = data;

  await supabase
    .from("coins_transactions")
    .insert({ user_id: userId, amount, reason, balance_after: newBalance });

  return newBalance;
}

export async function spendCoins(userId, amount, reason) {
  // Fetch current balance first
  const { data: userData, error: fetchError } = await supabase
    .from("users")
    .select("coins")
    .eq("id", userId)
    .single();

  if (fetchError) {
    console.error("spendCoins fetch error:", fetchError);
    return null;
  }

  if (userData.coins < amount) {
    return null; // Insufficient balance
  }

  const { data, error } = await supabase.rpc("increment_coins", {
    user_id: userId,
    amount: -amount,
  });

  if (error) {
    console.error("spendCoins rpc error:", error);
    return null;
  }

  const newBalance = data;

  await supabase
    .from("coins_transactions")
    .insert({ user_id: userId, amount: -amount, reason, balance_after: newBalance });

  return newBalance;
}
