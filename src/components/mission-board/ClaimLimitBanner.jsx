import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { supabase } from '../../services/supabaseClient';

const SLOT_COST = 50;

/**
 * ClaimLimitBanner
 *
 * Props:
 *   dailyCount  – number of missions claimed today (show when >= 3)
 *   userCoins   – current coin balance
 *   userId      – auth user id
 *   onSlotUnlocked – () => void  (refresh parent after purchase)
 */
export default function ClaimLimitBanner({ dailyCount, userCoins, userId, onSlotUnlocked }) {
  const [loading, setLoading] = useState(false);

  if (dailyCount < 3) return null;

  const canAfford = userCoins >= SLOT_COST;

  const handleUnlock = async () => {
    if (!canAfford || loading) return;
    setLoading(true);
    try {
      // Deduct coins
      const { error: deductErr } = await supabase.rpc('deduct_coins', {
        p_user_id: userId,
        p_amount:  SLOT_COST,
        p_reason:  'unlock_extra_mission_slot',
      });

      if (deductErr) throw deductErr;

      toast.success(`Extra slot unlocked! 🪙 -${SLOT_COST} coins`);
      onSlotUnlocked?.();
    } catch (err) {
      toast.error(err?.message ?? 'Could not unlock slot. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-4"
        style={{
          background: 'linear-gradient(90deg, rgba(234,179,8,0.12) 0%, rgba(234,179,8,0.04) 100%)',
          border: '1px solid rgba(234,179,8,0.3)',
        }}
      >
        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-xl">🪙</span>
          <span className="text-amber-300 font-medium">
            You've claimed 3 missions today.{' '}
            <span className="text-muted-foreground font-normal">Resets at midnight UTC.</span>
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={!canAfford || loading}
          onClick={handleUnlock}
          className="flex-shrink-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 text-xs font-semibold"
        >
          {loading ? 'Unlocking…' : `Unlock extra slot (${SLOT_COST} 🪙)`}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
