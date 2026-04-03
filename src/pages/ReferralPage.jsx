import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../App";
import { toast } from "sonner";
import { getReferralCode, getReferralStats } from "../services/referralService";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Check, Copy, Coins, Link2, Share2, Trophy, Users } from "lucide-react";

const DEFAULT_STATS = {
  total: 0,
  signed_up: 0,
  streak_7: 0,
  upgraded: 0,
  coins_earned: 0,
};

const REWARD_TIERS = [
  { title: "Level 1", label: "Friend signs up", xp: 300, coins: 100 },
  { title: "Level 2", label: "Friend hits 7-day streak", xp: 100, coins: 50 },
  { title: "Level 3", label: "Friend upgrades to paid", xp: 500, coins: 250 },
];

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, cursorY);
      line = `${word} `;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line.trim(), x, cursorY);
}

export default function ReferralPage() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    getReferralStats(user.id)
      .then((data) => {
        if (mounted) setStats(data ?? DEFAULT_STATS);
      })
      .catch(() => {
        if (mounted) setStats(DEFAULT_STATS);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const referralCode = useMemo(() => getReferralCode(user?.id), [user?.id]);
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;

  const achievedTier = useMemo(() => {
    if (stats.upgraded > 0) return "Level 3";
    if (stats.streak_7 > 0) return "Level 2";
    return "Level 1";
  }, [stats.upgraded, stats.streak_7]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Copied your referral link.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleShareImage = async () => {
    setSharing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(1, "#1e293b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText("Visionary Arc", 80, 130);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 58px sans-serif";
      ctx.fillText(`I just hit ${achievedTier}!`, 80, 250);

      ctx.font = "38px sans-serif";
      wrapText(
        ctx,
        `I just hit ${achievedTier} on Visionary Arc! Study smarter -> ${referralLink}`,
        80,
        330,
        920,
        52
      );

      ctx.fillStyle = "#94a3b8";
      ctx.font = "32px sans-serif";
      ctx.fillText(`Total referrals: ${stats.total}`, 80, 520);
      ctx.fillText(`Signed up: ${stats.signed_up}`, 80, 580);
      ctx.fillText(`7-day streak: ${stats.streak_7}`, 80, 640);
      ctx.fillText(`Upgraded: ${stats.upgraded}`, 80, 700);
      ctx.fillText(`Coins earned: ${stats.coins_earned}`, 80, 760);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Image generation failed"));
        }, "image/png");
      });

      const file = new File([blob], "visionary-arc-referral.png", { type: "image/png" });
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Visionary Arc Referral",
          text: "I just hit a referral milestone on Visionary Arc.",
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "visionary-arc-referral.png";
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success("Share image ready.");
    } catch {
      toast.error("Could not generate share image.");
    } finally {
      setSharing(false);
    }
  };

  const statCards = [
    { label: "Total referrals", value: stats.total, icon: Users },
    { label: "Signed up", value: stats.signed_up, icon: Check },
    { label: "Hit 7-day streak", value: stats.streak_7, icon: Trophy },
    { label: "Upgraded to paid", value: stats.upgraded, icon: Link2 },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Invite Friends, Earn Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your referral link
            </p>
            <div className="rounded-lg border bg-secondary/40 p-3 font-mono text-sm break-all">
              {referralLink}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Button
                variant="outline"
                onClick={handleShareImage}
                disabled={sharing}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                {sharing ? "Generating..." : "Share as image"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border bg-card">
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">{loading ? "--" : value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-muted-foreground">Coins earned from referrals</p>
            </div>
            <p className="text-3xl font-black mt-2 text-amber-500">
              {loading ? "--" : stats.coins_earned.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Referral Reward Tiers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {REWARD_TIERS.map((tier) => (
              <div key={tier.title} className="rounded-lg border bg-secondary/20 p-4">
                <p className="font-semibold">{tier.title} - {tier.label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  +{tier.xp} XP + {tier.coins} coins
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
