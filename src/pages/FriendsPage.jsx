import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, UserPlus, Check, X, Flame, Zap, Loader2,
  Trophy, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AuthContext } from '../App';
import { supabase } from '../services/supabaseClient';
import { sendFriendRequest, acceptFriendRequest } from '../services/db';
import { getTierForXP } from '../services/xpService';

const TIER_COLOR = {
  Beginner: 'text-muted-foreground',
  Builder:  'text-green-400',
  Creator:  'text-blue-400',
  Pro:      'text-orange-400',
  Elite:    'text-brand-orange',
};

function Avatar({ name, avatar, size = 10 }) {
  const initials = name?.charAt(0)?.toUpperCase() ?? '?';
  const sizeClass = `w-${size} h-${size}`;
  return (
    <div className={`${sizeClass} rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0 overflow-hidden`}>
      {avatar
        ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
        : initials}
    </div>
  );
}

// ── Friends tab ─────────────────────────────────────────────────────────────

function FriendsTab({ userId }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('friends')
        .select('*, friend:profiles!friends_friend_id_fkey(id, name, avatar, xp, streak)')
        .eq('user_id', userId)
        .eq('status', 'accepted');
      if (!error && data) setFriends(data);
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center gap-3">
        <Users className="w-12 h-12 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">No friends yet</h3>
        <p className="text-sm text-muted-foreground">Search for friends in the "Find Friends" tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((f) => {
        const friend = f.friend;
        if (!friend) return null;
        const tier      = getTierForXP(friend.xp ?? 0);
        const tierColor = TIER_COLOR[tier] ?? 'text-muted-foreground';
        const today     = new Date().toISOString().split('T')[0];
        const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
        const hasFriendStreak = f.last_both_active === today || f.last_both_active === yesterday;

        return (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors"
          >
            <Avatar name={friend.name} avatar={friend.avatar} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{friend.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-sm md:text-xs font-medium ${tierColor}`}>{tier}</span>
                <span className="text-muted-foreground text-sm md:text-xs">·</span>
                <span className="text-sm md:text-xs text-muted-foreground flex items-center gap-0.5">
                  <Zap className="w-3 h-3" /> {(friend.xp ?? 0).toLocaleString()} XP
                </span>
                {(friend.streak ?? 0) > 0 && (
                  <>
                    <span className="text-muted-foreground text-sm md:text-xs">·</span>
                    <span className="text-sm md:text-xs text-orange-400 flex items-center gap-0.5">
                      <Flame className="w-3 h-3" /> {friend.streak}d
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Friend streak badge */}
            {hasFriendStreak && f.friend_streak > 0 && (
              <span className="text-sm md:text-xs font-medium text-orange-400 bg-orange-500/10 rounded-full px-2.5 py-1 flex items-center gap-1 shrink-0">
                <Flame className="w-3 h-3" /> {f.friend_streak}d
              </span>
            )}

            {/* Challenge button (Phase 2) */}
            <button
              type="button"
              onClick={() => toast('Challenges coming in Phase 2!')}
              className="shrink-0 text-sm md:text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Challenge
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Find Friends tab ────────────────────────────────────────────────────────

function FindFriendsTab({ userId }) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending]     = useState([]); // requests received
  const [sent, setSent]           = useState(new Set()); // IDs we've sent to
  const [loadingReqs, setLoadingReqs] = useState(true);

  // Load pending received requests
  useEffect(() => {
    async function loadPending() {
      const { data } = await supabase
        .from('friends')
        .select('id, user_id, requester:profiles!friends_user_id_fkey(id, name, avatar, xp)')
        .eq('friend_id', userId)
        .eq('status', 'pending');
      if (data) setPending(data);
      setLoadingReqs(false);
    }
    loadPending();
  }, [userId]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar, xp, school')
      .or(`name.ilike.%${query.trim()}%,school.ilike.%${query.trim()}%`)
      .neq('id', userId)
      .limit(20);
    setResults(data ?? []);
    setSearching(false);
  }, [query, userId]);

  const handleSendRequest = async (targetId) => {
    const { error } = await sendFriendRequest(userId, targetId);
    if (error) { toast.error('Could not send request'); return; }
    setSent(prev => new Set([...prev, targetId]));
    toast.success('Friend request sent!');
  };

  const handleAccept = async (friendship) => {
    const { error } = await acceptFriendRequest(friendship.id);
    if (error) { toast.error('Could not accept request'); return; }
    setPending(prev => prev.filter(p => p.id !== friendship.id));
    toast.success(`You're now friends with ${friendship.requester?.name}!`);
  };

  const handleDecline = async (friendshipId) => {
    await supabase.from('friends').delete().eq('id', friendshipId);
    setPending(prev => prev.filter(p => p.id !== friendshipId));
    toast('Request declined.');
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or school…"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 flex items-center gap-1.5"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results</p>
          {results.map(profile => (
            <div
              key={profile.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <Avatar name={profile.name} avatar={profile.avatar} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{profile.name}</p>
                {profile.school && (
                  <p className="text-sm md:text-xs text-muted-foreground truncate">{profile.school}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSendRequest(profile.id)}
                disabled={sent.has(profile.id)}
                className="shrink-0 flex items-center gap-1.5 text-sm md:text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-60"
              >
                {sent.has(profile.id)
                  ? <><Check className="w-3.5 h-3.5 text-green-400" /> Sent</>
                  : <><UserPlus className="w-3.5 h-3.5" /> Add</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending requests received */}
      {!loadingReqs && pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Friend Requests ({pending.length})
          </p>
          {pending.map(req => (
            <div
              key={req.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <Avatar name={req.requester?.name} avatar={req.requester?.avatar} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {req.requester?.name}
                </p>
                <p className="text-sm md:text-xs text-muted-foreground">
                  {(req.requester?.xp ?? 0).toLocaleString()} XP
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAccept(req)}
                  className="flex items-center gap-1 text-sm md:text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-[var(--text-primary)] transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(req.id)}
                  className="flex items-center gap-1 text-sm md:text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Leaderboard tab ─────────────────────────────────────────────────────────

function LeaderboardTab({ userId }) {
  const [global, setGlobal]   = useState(false);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (global) {
        // Global: from materialized view
        const { data } = await supabase
          .from('leaderboard_weekly')
          .select('*')
          .order('xp', { ascending: false })
          .limit(50);
        setRows(data ?? []);
      } else {
        // Friends: fetch accepted friends + self, sort by XP
        const { data: friendships } = await supabase
          .from('friends')
          .select('friend:profiles!friends_friend_id_fkey(id, name, avatar, xp, streak)')
          .eq('user_id', userId)
          .eq('status', 'accepted');

        const { data: selfProfile } = await supabase
          .from('profiles')
          .select('id, name, avatar, xp, streak')
          .eq('id', userId)
          .single();

        const all = [
          ...(friendships ?? []).map(f => f.friend).filter(Boolean),
          ...(selfProfile ? [selfProfile] : []),
        ].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));

        setRows(all);
      }
      setLoading(false);
    }
    load();
  }, [global, userId]);

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setGlobal(false)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            !global ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-secondary'
          }`}
        >
          Friends
        </button>
        <button
          type="button"
          onClick={() => setGlobal(true)}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            global ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-secondary'
          }`}
        >
          Global
        </button>
      </div>

      {/* Rows */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          {global ? 'Leaderboard loading…' : 'Add friends to see how you compare!'}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => {
            const isSelf = (row.id ?? row.user_id) === userId;
            return (
              <motion.div
                key={row.id ?? row.user_id ?? i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isSelf
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                {/* Rank */}
                <span className={`w-7 text-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'text-brand-orange' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-brand-deep' : 'text-muted-foreground'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>

                <Avatar name={row.name} avatar={row.avatar} size={8} />

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isSelf ? 'text-primary' : 'text-foreground'}`}>
                    {row.name ?? 'Unknown'}{isSelf ? ' (You)' : ''}
                  </p>
                  <p className="text-sm md:text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {(row.xp ?? 0).toLocaleString()} XP
                    {(row.streak ?? 0) > 0 && (
                      <span className="ml-1 text-orange-400 flex items-center gap-0.5">
                        <Flame className="w-3 h-3" /> {row.streak}d
                      </span>
                    )}
                  </p>
                </div>

                <Trophy className={`w-4 h-4 shrink-0 ${
                  i === 0 ? 'text-brand-orange' : 'text-muted-foreground/40'
                }`} />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function FriendsPage() {
  const { user } = useContext(AuthContext);

  if (!user?.id) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Friends</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Study together, keep streaks alive, and climb the leaderboard.
        </p>
      </div>

      <Tabs defaultValue="friends">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="friends" className="flex-1">Friends</TabsTrigger>
          <TabsTrigger value="find" className="flex-1">Find Friends</TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <FriendsTab userId={user.id} />
        </TabsContent>

        <TabsContent value="find">
          <FindFriendsTab userId={user.id} />
        </TabsContent>

        <TabsContent value="leaderboard">
          <LeaderboardTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
