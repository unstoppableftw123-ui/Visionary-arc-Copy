import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Cpu,
  FileText,
  FolderKanban,
  Heart,
  Palette,
  Sparkles,
  TrendingUp,
  Upload,
  Mic2,
} from "lucide-react";
import { AuthContext } from "../App";
import { TRACKS, getTrack } from "../data/tracksData";
import { getProfile, updateProfile } from "../services/db";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";

const ICON_MAP = { Cpu, Palette, TrendingUp, Mic2, Heart };

const WALKTHROUGH_STEPS = [
  {
    id: "brief",
    title: "Get your AI brief",
    description: "A clear challenge appears with a real-world client, role, and deliverables.",
  },
  {
    id: "build",
    title: "Build your project",
    description: "Use the tools you already know to create something worth showing off.",
  },
  {
    id: "submit",
    title: "Submit your work",
    description: "Turn in your finished project when you're ready for the next step.",
  },
  {
    id: "portfolio",
    title: "It goes in your portfolio",
    description: "Your best work stacks up into proof you can share with the world.",
  },
];

const DIFFICULTY_OPTIONS = [
  { id: "starter", label: "Starter", detail: "3-5 days" },
  { id: "standard", label: "Standard", detail: "1-2 weeks" },
  { id: "advanced", label: "Advanced", detail: "2-3 weeks" },
];

function ProgressDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 text-lg" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          className={dot <= step ? "text-foreground" : "text-muted-foreground/40"}
          aria-hidden="true"
        >
          ●
        </span>
      ))}
    </div>
  );
}

function TrackOption({ track, selected, onSelect, index }) {
  const Icon = ICON_MAP[track.icon] ?? Cpu;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(track.id)}
      className={`group relative w-full overflow-hidden rounded-3xl border bg-card p-5 text-left transition-all ${
        selected
          ? `${track.colors.border} ${track.colors.bg} shadow-lg`
          : "border-border hover:border-border/80 hover:bg-card/90"
      }`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${track.colors.bgSolid}`} />
      <div className="flex items-start gap-4 pl-3">
        <div className={`rounded-2xl p-3 ${track.colors.bg}`}>
          <Icon className={`h-5 w-5 ${track.colors.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{track.name}</p>
              <p className={`mt-1 text-sm ${track.colors.text}`}>{track.tagline}</p>
            </div>
            {selected && (
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${track.colors.bgSolid}`}>
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{track.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {track.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${track.colors.badge}`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function WalkthroughVisual({ step }) {
  return (
    <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-lg">
      <AnimatePresence mode="wait">
        {step.id === "brief" && (
          <motion.div
            key="brief"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-4 w-4" /> AI brief incoming
            </div>
            <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-300">
                  Tech & AI
                </span>
                <span className="text-xs text-muted-foreground">Starter</span>
              </div>
              <p className="text-base font-semibold text-foreground">Build an AI helper for a local nonprofit</p>
              <p className="mt-2 text-sm text-muted-foreground">Client goal: save volunteers time and make support easier.</p>
            </div>
          </motion.div>
        )}

        {step.id === "build" && (
          <motion.div
            key="build"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Figma", className: "bg-rose-500/15 text-rose-300" },
                { label: "Docs", className: "bg-blue-500/15 text-blue-300" },
                { label: "Canva", className: "bg-cyan-500/15 text-cyan-300" },
                { label: "GitHub", className: "bg-emerald-500/15 text-emerald-300" },
              ].map((tool, index) => (
                <motion.div
                  key={tool.label}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08 }}
                  className={`rounded-2xl px-4 py-5 text-center text-sm font-semibold ${tool.className}`}
                >
                  {tool.label}
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Use your favorite workflow. Visionary Arc cares about what you build, not locking you into one tool.</p>
          </motion.div>
        )}

        {step.id === "submit" && (
          <motion.div
            key="submit"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-border bg-background/70 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Upload className="h-5 w-5 text-primary" />
                <p className="font-medium text-foreground">Your files are ready</p>
              </div>
              <motion.div
                initial={{ width: "35%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.1 }}
                className="h-2 rounded-full bg-primary"
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button className="mt-4 w-full gap-2">
                  Submit My Work
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {step.id === "portfolio" && (
          <motion.div
            key="portfolio"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-emerald-300">Portfolio entry added</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">AI Helper for Bright Futures</p>
                  <p className="mt-2 text-sm text-muted-foreground">Shows product thinking, workflow skills, and real client problem-solving.</p>
                </div>
                <FolderKanban className="h-6 w-6 text-emerald-300" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingPage() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [difficulty, setDifficulty] = useState("starter");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [walkthroughIndex, setWalkthroughIndex] = useState(0);

  const selectedTrackData = useMemo(() => getTrack(selectedTrack), [selectedTrack]);
  const currentWalkthrough = WALKTHROUGH_STEPS[walkthroughIndex];
  const walkthroughProgress = ((walkthroughIndex + 1) / WALKTHROUGH_STEPS.length) * 100;

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      if (!user?.id) {
        navigate("/auth", { replace: true });
        return;
      }

      try {
        const { data: profile } = await getProfile(user.id);
        if (!active) return;
        if (profile?.onboarded) {
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch (_) {
      } finally {
        if (active) setChecking(false);
      }
    };

    checkAccess();
    return () => {
      active = false;
    };
  }, [navigate, user?.id]);

  useEffect(() => {
    if (currentStep !== 2) return undefined;

    const interval = window.setInterval(() => {
      setWalkthroughIndex((prev) => (prev + 1) % WALKTHROUGH_STEPS.length);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 2) {
      setWalkthroughIndex(0);
    }
  }, [currentStep]);

  const persistOnboarding = async () => {
    if (!user?.id || !selectedTrack) return false;

    setSaving(true);
    const { error } = await updateProfile(user.id, {
      onboarded: true,
      track_primary: selectedTrack,
    });

    if (error) {
      toast.error(error.message || "Could not save onboarding");
      setSaving(false);
      return false;
    }

    const nextUser = { ...(user ?? {}), onboarded: true, track_primary: selectedTrack };
    setUser(nextUser);
    localStorage.setItem("auth_user", JSON.stringify(nextUser));
    setSaving(false);
    return true;
  };

  const handleGenerate = async () => {
    const saved = await persistOnboarding();
    if (!saved) return;
    navigate(`/tracks/${selectedTrack}/brief?difficulty=${difficulty}`);
  };

  const handleSkip = async () => {
    const saved = await persistOnboarding();
    if (!saved) return;
    navigate("/dashboard");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading onboarding...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="space-y-4 text-center">
          <ProgressDots step={currentStep} />
          <div className="mx-auto h-px w-full max-w-xs bg-border" />
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.section
              key="step-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Step 1</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                  Hi {user?.name || "there"}! Which path excites you most?
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Pick one to start with. You can explore the others anytime.
                </p>
              </div>

              <div className="space-y-4">
                {TRACKS.map((track, index) => (
                  <TrackOption
                    key={track.id}
                    track={track}
                    index={index}
                    selected={selectedTrack === track.id}
                    onSelect={setSelectedTrack}
                  />
                ))}
              </div>

              {selectedTrack && (
                <div className="flex justify-end">
                  <Button size="lg" className="gap-2" onClick={() => setCurrentStep(2)}>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </motion.section>
          )}

          {currentStep === 2 && (
            <motion.section
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Step 2</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                  Here&apos;s how Visionary Arc works
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  One real project flow, from brief to portfolio.
                </p>
              </div>

              <Card className="border-border bg-card/60">
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-foreground">{currentWalkthrough.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {walkthroughIndex + 1} / {WALKTHROUGH_STEPS.length}
                      </p>
                    </div>
                    <Progress value={walkthroughProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground">{currentWalkthrough.description}</p>
                  </div>

                  <WalkthroughVisual step={currentWalkthrough} />
                </CardContent>
              </Card>

              <div className="flex justify-between gap-3">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button size="lg" className="gap-2" onClick={() => setCurrentStep(3)}>
                  Got it!
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.section>
          )}

          {currentStep === 3 && (
            <motion.section
              key="step-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Step 3</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                  Your first brief is waiting.
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  We&apos;ll start simple and get you moving fast.
                </p>
              </div>

              <Card className="overflow-hidden border-border">
                <CardContent className="space-y-6 p-6">
                  <div className="rounded-3xl border border-border bg-muted/30 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">First track</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          {selectedTrackData?.name ?? "Choose a track"}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {selectedTrackData?.tagline}
                        </p>
                      </div>
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Difficulty
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {DIFFICULTY_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setDifficulty(option.id)}
                          className={`rounded-2xl border p-4 text-left transition-colors ${
                            difficulty === option.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-foreground hover:bg-secondary"
                          }`}
                        >
                          <p className="font-semibold">{option.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{option.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3 text-center">
                <Button
                  size="lg"
                  className="w-full gap-2 sm:w-auto"
                  onClick={handleGenerate}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Generate My First Brief"}
                  {!saving && <ArrowRight className="h-4 w-4" />}
                </Button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                >
                  Skip for now
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
