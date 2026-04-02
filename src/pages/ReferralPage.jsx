import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../App";
import { toast } from "sonner";
import { getReferralCode, getReferralStats } from "../services/referralService";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Copy,
  Check,
  Twitter,
  Mail,
  MessageCircle,
  Link2,
  Coins,
  Trophy,
  Lock,
  CheckCircle2,
  Users,
  Gift,
  Zap,
  Clock,
} from "lucide-react";


const MILESTONES = [
  {
    friends: 1,
    coins: 50,
    bonus: null,
    label: "First Invite",
  },
  {
    friends: 3,
    coins: 100,
    bonus: '"Connector" Badge',
    label: "Social Starter",
  },
  {
    friends: 5,
    coins: 200,
    bonus: "Exclusive Avatar Frame",
    label: "Connector",
  },
  {
    friends: 10,
    coins: 500,
    bonus: "1 Month Free Seed Pass",
    label: "Community Builder",
  },
  {
    friends: 25,
    coins: 1500,
    bonus: "Free Seed Pass 🏆",
    label: "Legend",
  },
];

// ─── Countdown timer hook ─────────────────────────────────────────────────────
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ expired: true });
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

// ─── Animated coin stack ──────────────────────────────────────────────────────
function CoinStack() {
  return (
    <div className="relative flex items-end justify-center h-20 w-20 mx-auto">
      <style>{`
        @keyframes coinBounce1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes coinBounce2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes coinBounce3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes coinSpin {
          0% { transform: rotateY(0deg) scale(1); }
          50% { transform: rotateY(180deg) scale(1.08); }
          100% { transform: rotateY(360deg) scale(1); }
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(245,158,11,0.35), 0 0 0 1px rgba(245,158,11,0.2); }
          50% { box-shadow: 0 0 20px 6px rgba(245,158,11,0.6), 0 0 0 2px rgba(245,158,11,0.4); }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .coin-1 { animation: coinBounce1 1.8s ease-in-out infinite; }
        .coin-2 { animation: coinBounce2 1.8s ease-in-out 0.2s infinite; }
        .coin-3 { animation: coinBounce3 1.8s ease-in-out 0.4s infinite; }
        .coin-spin { animation: coinSpin 3s ease-in-out infinite; }
        .gold-glow { animation: goldPulse 2s ease-in-out infinite; }
        .border-pulse { animation: borderPulse 2s ease-in-out infinite; }
      `}</style>

      {/* Stack base coins */}
      <div
        className="coin-1 absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ marginBottom: "0px" }}
      >
        <div
          className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 flex items-center justify-center gold-glow"
          style={{ boxShadow: "0 4px 0 #92400e" }}
        >
          <span className="text-amber-900 font-black text-lg select-none">$</span>
        </div>
      </div>
      <div className="coin-2 absolute" style={{ bottom: "14px", left: "50%", transform: "translateX(-50%)" }}>
        <div
          className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 flex items-center justify-center"
          style={{ boxShadow: "0 4px 0 #92400e" }}
        >
          <span className="text-amber-900 font-black text-lg select-none">$</span>
        </div>
      </div>
      <div className="coin-3 absolute" style={{ bottom: "28px", left: "50%", transform: "translateX(-50%)" }}>
        <div
          className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 coin-spin flex items-center justify-center"
          style={{ boxShadow: "0 4px 0 #92400e" }}
        >
          <Coins className="w-7 h-7 text-amber-800" />
        </div>
      </div>
    </div>
  );
}

// ─── Reward Card ──────────────────────────────────────────────────────────────
function RewardCard({ label, coins, sublabel }) {
  return (
    <div
      className="flex-1 rounded-2xl p-5 text-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(234,179,8,0.10) 100%)",
        border: "1.5px solid transparent",
        backgroundClip: "padding-box",
      }}
    >
      {/* Gold gradient border overlay */}
      <div
        className="absolute inset-0 rounded-2xl border-pulse pointer-events-none"
        style={{
          border: "1.5px solid",
          borderImage: "linear-gradient(135deg, #f59e0b, #eab308, #f59e0b) 1",
          borderRadius: "inherit",
        }}
      />
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,179,8,0.18) 100%)",
          boxShadow: "inset 0 0 24px rgba(245,158,11,0.08)",
        }}
      />
      <div className="relative z-10">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
          {label}
        </p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Coins className="w-6 h-6 text-amber-400" />
          <span className="text-3xl font-black text-amber-400">{coins.toLocaleString()}</span>
        </div>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReferralPage() {
  const { user } = useContext(AuthContext);
  const [copied, setCopied] = useState(false);
  const [referralData, setReferralData] = useState({ total_referrals: 0, completed_referrals: 0, coins_earned: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    getReferralStats(user.id)
      .then(setReferralData)
      .catch(() => {});
  }, [user?.id]);

  // 14 days from today
  const bonusDeadline = new Date("2026-03-28T23:59:59");
  const bonusDeadlineStr = bonusDeadline.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const countdown = useCountdown(bonusDeadline);

  const refCode = user?.id ? getReferralCode(user.id) : "LOADING";
  const referralLink = `${window.location.origin}/auth?ref=${refCode}`;
  const shareText = `I'm using Visionary Academy to level up my grades 🎓 Join me and get 25 free coins to start! ${referralLink}`;

  const totalReferrals = referralData.total_referrals;

  // Find next unclaimed milestone
  const nextMilestone = MILESTONES.find((m) => m.friends > totalReferrals) || null;
  const friendsNeeded = nextMilestone ? nextMilestone.friends - totalReferrals : 0;

  const nextMilestoneProgress = nextMilestone
    ? Math.min(100, (totalReferrals / nextMilestone.friends) * 100)
    : 100;

  // Determine milestone claimed state
  const getMilestoneState = (milestone) => {
    if (totalReferrals >= milestone.friends) return "claimed";
    if (milestone === nextMilestone) return "next";
    return "locked";
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand("copy");
      }
    }
    setCopied(true);
    toast.success("Link copied!", {
      description: "Share it with your friends to earn coins.",
      duration: 2500,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const shareLinks = [
    {
      id: "twitter",
      label: "Twitter / X",
      icon: <Twitter className="w-4 h-4" />,
      color: "hover:bg-sky-500/10 hover:border-sky-500/40 hover:text-sky-400",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="w-4 h-4" />,
      color: "hover:bg-green-500/10 hover:border-green-500/40 hover:text-green-400",
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      id: "email",
      label: "Email",
      icon: <Mail className="w-4 h-4" />,
      color: "hover:bg-purple-500/10 hover:border-purple-500/40 hover:text-purple-400",
      href: `mailto:?subject=Join%20Visionary%20Academy%20and%20get%2025%20free%20coins!&body=${encodeURIComponent(shareText)}`,
    },
    {
      id: "copy",
      label: copied ? "Copied!" : "Copy Link",
      icon: copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />,
      color: copied
        ? "bg-green-500/10 border-green-500/40 text-green-400"
        : "hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-400",
      onClick: handleCopy,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-4">
          <CoinStack />
          <div className="space-y-2 mt-6">
            <h1 className="font-heading text-4xl font-black tracking-tight text-foreground">
              Invite Friends,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                Earn Together
              </span>
            </h1>
            <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
              You get{" "}
              <span className="text-amber-400 font-semibold">50 coins</span> per
              friend who joins. They start with{" "}
              <span className="text-amber-400 font-semibold">25 bonus coins</span>{" "}
              on signup.
            </p>
          </div>

          {/* Reward cards */}
          <div className="flex gap-4 mt-6">
            <RewardCard
              label="You Earn"
              coins={50}
              sublabel="per friend who joins"
            />
            <RewardCard
              label="Friend Gets"
              coins={25}
              sublabel="bonus coins on signup"
            />
          </div>
        </div>

        {/* ── REFERRAL LINK ────────────────────────────────────────────────── */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-400" />
              Your unique referral link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link input + copy button */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  readOnly
                  value={referralLink}
                  className="w-full h-11 px-4 rounded-xl bg-secondary border border-border text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 select-all cursor-text"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <Button
                onClick={handleCopy}
                className={`h-11 px-5 rounded-xl font-semibold transition-all duration-300 ${
                  copied
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-amber-950"
                }`}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-1.5" />
                ) : (
                  <Copy className="w-4 h-4 mr-1.5" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shareLinks.map((btn) =>
                btn.onClick ? (
                  <button
                    key={btn.id}
                    onClick={btn.onClick}
                    className={`flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-secondary/50 text-sm font-medium text-muted-foreground transition-all duration-200 ${btn.color}`}
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                ) : (
                  <a
                    key={btn.id}
                    href={btn.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-secondary/50 text-sm font-medium text-muted-foreground transition-all duration-200 ${btn.color}`}
                  >
                    {btn.icon}
                    {btn.label}
                  </a>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── PROGRESS TRACKER ─────────────────────────────────────────────── */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Your Referrals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Big number + progress */}
            <div className="text-center space-y-3">
              <div className="flex items-end justify-center gap-2">
                <span className="text-6xl font-black text-foreground leading-none">
                  {totalReferrals}
                </span>
                <span className="text-lg text-muted-foreground mb-2">friends joined</span>
              </div>

              {nextMilestone && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>{totalReferrals} friends</span>
                    <span>{nextMilestone.friends} friends</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                      style={{ width: `${nextMilestoneProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-amber-400 font-semibold">
                      {friendsNeeded} more{" "}
                      {friendsNeeded === 1 ? "friend" : "friends"}
                    </span>{" "}
                    = bonus{" "}
                    <span className="font-semibold text-foreground">
                      {nextMilestone.coins.toLocaleString()} coins
                    </span>
                    {nextMilestone.bonus && (
                      <> + {nextMilestone.bonus}</>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Milestone step tracker */}
            <div className="space-y-2">
              {MILESTONES.map((m, i) => {
                const state = getMilestoneState(m);
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      state === "claimed"
                        ? "bg-green-500/8 border-green-500/20"
                        : state === "next"
                        ? "bg-amber-500/8 border-amber-500/30"
                        : "bg-secondary/30 border-border/50 opacity-60"
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        state === "claimed"
                          ? "bg-green-500/20 text-green-400"
                          : state === "next"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {state === "claimed" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : state === "locked" ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {m.friends} {m.friends === 1 ? "friend" : "friends"}
                        </span>
                        {state === "next" && (
                          <Badge className="text-[10px] py-0 px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Next goal
                          </Badge>
                        )}
                        {state === "claimed" && (
                          <Badge className="text-[10px] py-0 px-1.5 bg-green-500/20 text-green-400 border-green-500/30">
                            ✓ Claimed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-amber-400 font-medium">
                          {m.coins.toLocaleString()} coins
                        </span>
                        {m.bonus && (
                          <span> + {m.bonus}</span>
                        )}
                      </p>
                    </div>

                    {/* Coins icon */}
                    <div className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Coins className="w-3.5 h-3.5" />
                      {(m.coins / 1000).toFixed(m.coins < 1000 ? 0 : 1)}
                      {m.coins >= 1000 ? "k" : ""}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TODO: POST /api/referrals/claim-reward */}
          </CardContent>
        </Card>

        {/* ── REFERRAL HISTORY TABLE ───────────────────────────────────────── */}
        {/* TODO: GET /api/referrals/my-referrals */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" />
              Referral History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {totalReferrals === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No referrals yet — share your link to get started!</p>
              </div>
            ) : (
              <div className="px-5 py-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="text-2xl font-black text-amber-400">{referralData.coins_earned.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">coins earned</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {referralData.completed_referrals} of {totalReferrals} referral{totalReferrals !== 1 ? "s" : ""} completed
                </p>
              </div>
            )}

            <div className="px-5 py-3 border-t border-border bg-secondary/20 rounded-b-xl">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-amber-400">Note:</span> Coins are
                awarded only after your friend completes their first 10 practice
                questions. Pending = signed up but not yet active.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── BOTTOM BANNER ────────────────────────────────────────────────── */}
        <div
          className="relative rounded-2xl p-6 text-center overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,179,8,0.12) 100%)",
          }}
        >
          {/* Pulsing gold border */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none border-pulse"
            style={{
              boxShadow:
                "0 0 0 1.5px rgba(245,158,11,0.5), 0 0 24px rgba(245,158,11,0.15)",
            }}
          />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <p className="text-base font-bold text-foreground">
                Limited Time:{" "}
                <span className="text-amber-400">Referral coins are 2x</span> until{" "}
                {bonusDeadlineStr} 🎉
              </p>
            </div>

            {/* Countdown */}
            {!countdown.expired ? (
              <div className="flex items-center justify-center gap-3">
                {[
                  { value: countdown.days, label: "Days" },
                  { value: countdown.hours, label: "Hours" },
                  { value: countdown.minutes, label: "Min" },
                  { value: countdown.seconds, label: "Sec" },
                ].map(({ value, label }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i > 0 && (
                      <span className="text-amber-400/60 font-bold text-lg">:</span>
                    )}
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-secondary border border-amber-500/20 flex items-center justify-center">
                        <span className="text-2xl font-black text-amber-400 tabular-nums">
                          {String(value ?? 0).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide font-medium">
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Bonus period has ended.</p>
            )}

            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Don't miss out — every referral earns double coins until the deadline!
            </p>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
