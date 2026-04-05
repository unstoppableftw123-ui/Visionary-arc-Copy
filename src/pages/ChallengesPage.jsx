import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../App";
import { useFeatureGate } from "../hooks/useFeatureGate";
import LockedFeatureOverlay from "../components/LockedFeatureOverlay";
import { supabase } from "../services/supabaseClient";
import { getTierForXP } from "../services/xpService";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";

const TIER_ORDER = ["Beginner", "Builder", "Creator", "Pro", "Elite"];
const TIER_XP = {
  Beginner: 0,
  Builder: 500,
  Creator: 2000,
  Pro: 6000,
  Elite: 15000,
};

const TRACK_BADGE_STYLES = {
  "tech-ai": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "design-branding": "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "social-impact": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  business: "bg-orange-600/15 text-orange-400 border-orange-500/30",
  "content-storytelling": "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

function daysLeft(deadline) {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function challengeTrackLabel(track) {
  return (track || "general")
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function SponsorAvatar({ name }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  const hue = ((name || "x").charCodeAt(0) * 19) % 360;
  return (
    <div
      className="h-10 w-10 rounded-full text-[var(--text-primary)] font-semibold flex items-center justify-center shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 70%, 45%)` }}
      aria-hidden
    >
      {letter}
    </div>
  );
}

export default function ChallengesPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const gate = useFeatureGate('challenge_board');
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [appName, setAppName] = useState(user?.name ?? "");
  const [appWhy, setAppWhy] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadChallenges() {
      setLoading(true);
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", "open")
        .order("deadline", { ascending: true });

      if (!mounted) return;
      if (error) {
        setChallenges([]);
        toast.error("Could not load sponsored challenges.");
      } else {
        setChallenges(data ?? []);
      }
      setLoading(false);
    }

    loadChallenges();
    return () => {
      mounted = false;
    };
  }, []);

  const userXP = user?.xp ?? 0;
  const userTier = getTierForXP(userXP);

  const selectedEligibility = useMemo(() => {
    if (!selected) return { eligible: false, neededXP: 0 };
    const requiredTier = selected.required_tier || "Beginner";
    const eligible = TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
    const neededXP = Math.max(0, (TIER_XP[requiredTier] ?? 0) - userXP);
    return { eligible, neededXP };
  }, [selected, userTier, userXP]);

  const handleApply = () => {
    if (!selected) return;
    if (!appName.trim() || !appWhy.trim()) {
      toast.error("Please complete your name and motivation.");
      return;
    }
    toast.success("Challenge application started.");
    navigate(`/tracks/${selected.track}/brief`, {
      state: {
        challenge_id: selected.id,
        challenge_title: selected.title,
        challenge_track: selected.track,
        applicant_name: appName.trim(),
        motivation: appWhy.trim(),
      },
    });
    setSelected(null);
    setAppWhy("");
  };

  return (
    <div className="relative min-h-screen bg-background px-4 py-6 sm:py-8">
      {!gate.loading && !gate.unlocked && (
        <LockedFeatureOverlay
          featureName="Company Challenge Board"
          threshold={gate.threshold}
          currentUsers={gate.currentUsers}
        />
      )}
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sponsored Challenges</h1>
          <p className="text-muted-foreground mt-1">
            Earn real rewards from companies
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="pt-6 space-y-2">
                  <div className="h-5 w-40 rounded bg-secondary animate-pulse" />
                  <div className="h-4 w-full rounded bg-secondary animate-pulse" />
                  <div className="h-4 w-4/5 rounded bg-secondary animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <Card className="border-border">
            <CardContent className="pt-8 pb-8 text-sm text-muted-foreground text-center">
              No challenges available right now — check back soon!
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {challenges.map((challenge) => {
              const slotsLeft = Math.max(0, (challenge.max_slots ?? 0) - (challenge.current_slots ?? 0));
              const slotPct = challenge.max_slots
                ? Math.min(100, Math.round(((challenge.current_slots ?? 0) / challenge.max_slots) * 100))
                : 0;
              const deadlineDays = daysLeft(challenge.deadline);
              const trackStyle =
                TRACK_BADGE_STYLES[challenge.track] ?? "bg-secondary text-foreground border-border";

              return (
                <Card
                  key={challenge.id}
                  className="border-border cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelected(challenge)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {challenge.sponsor_logo_url ? (
                          <img
                            src={challenge.sponsor_logo_url}
                            alt={`${challenge.sponsor_name} logo`}
                            className="h-10 w-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <SponsorAvatar name={challenge.sponsor_name} />
                        )}
                        <p className="font-semibold truncate">{challenge.sponsor_name}</p>
                      </div>
                      <Badge className={trackStyle}>{challengeTrackLabel(challenge.track)}</Badge>
                    </div>
                    <CardTitle className="text-xl">{challenge.title}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2">{challenge.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-semibold">
                        {challenge.reward_value} {challenge.reward_type === "cash" ? "prize" : challenge.reward_type}
                      </Badge>
                      <Badge variant="secondary">{challenge.required_tier}</Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{slotsLeft} spots left</span>
                        <span>{challenge.current_slots}/{challenge.max_slots}</span>
                      </div>
                      <Progress value={slotPct} className="h-1.5" />
                    </div>

                    <p className="text-xs text-muted-foreground">{deadlineDays} days left</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>
                  Sponsored by {selected.sponsor_name} · {challengeTrackLabel(selected.track)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selected.description}</p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Reward: {selected.reward_value} ({selected.reward_type})
                  </Badge>
                  <Badge variant="outline">Required tier: {selected.required_tier}</Badge>
                  <Badge variant="outline">{daysLeft(selected.deadline)} days left</Badge>
                </div>

                {!selectedEligibility.eligible ? (
                  <Card className="border-amber-500/40 bg-amber-500/5">
                    <CardContent className="pt-4 text-sm">
                      Unlock at <span className="font-semibold">{selected.required_tier}</span> - you need{" "}
                      <span className="font-semibold">{selectedEligibility.neededXP.toLocaleString()} more XP</span>.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <Input
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="Your name"
                    />
                    <Textarea
                      value={appWhy}
                      onChange={(e) => setAppWhy(e.target.value)}
                      placeholder="Why do you want this challenge?"
                      rows={5}
                    />
                    <Button className="w-full" onClick={handleApply}>
                      Apply to Challenge
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
