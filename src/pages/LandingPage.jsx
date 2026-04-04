import { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { AuthContext } from "../App";
import { TRACKS } from "../data/tracksData";
import {
  Cpu,
  Palette,
  TrendingUp,
  Mic2,
  Heart,
  ArrowRight,
  Zap,
  Flame,
  Trophy,
  Target,
  Sparkles,
} from "lucide-react";

// ─── Icon map for track icons (stored as strings in tracksData) ───────────────
const ICON_MAP = { Cpu, Palette, TrendingUp, Mic2, Heart };

// ─── Sample projects per track ────────────────────────────────────────────────
const TRACK_PROJECTS = {
  "tech-ai":              ["Build an AI chatbot for a local nonprofit", "Automate your school's lost & found", "Create a student sports stats dashboard"],
  "design-branding":      ["Rebrand a local café's visual identity", "Design a mobile app UI for a fitness startup", "Create a brand kit for a student-run business"],
  "business":             ["Write a go-to-market plan for a new product", "Build a financial model for a school store", "Design a pitch deck for an investor"],
  "content-storytelling": ["Launch a newsletter for your school community", "Script a 60-second brand video", "Write a brand voice guide for a local org"],
  "social-impact":        ["Design a campaign to cut food waste at school", "Create a community research report", "Write a grant proposal for a local shelter"],
};

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 30, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [text, speed, delay]);

  return { displayed, done };
}

// ─── Animated count-up number ────────────────────────────────────────────────
function CountUp({ target, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1600;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Section wrapper with scroll animation ────────────────────────────────────
function Section({ id, className = "", children }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Hero brief card with typewriter ─────────────────────────────────────────
const BRIEF_TEXT = "You'll research the org, define their brand voice, and design a 3-post Instagram campaign — ready to pitch to a real client.";

function HeroBriefCard() {
  const { displayed, done } = useTypewriter(BRIEF_TEXT, 22, 900);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
      className="relative mt-10 rounded-2xl border border-orange-500/30 bg-zinc-900/80 backdrop-blur p-5 shadow-xl shadow-purple-900/20 text-left max-w-lg mx-auto"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
        <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">AI Brief — Design & Branding</span>
      </div>

      <p className="text-xs text-zinc-400 font-medium mb-1">Role</p>
      <p className="text-sm font-semibold text-white mb-3">You are a Junior Brand Strategist</p>

      <p className="text-xs text-zinc-400 font-medium mb-1">Client</p>
      <p className="text-sm text-zinc-200 mb-3">
        Nour Foundation — a local women's shelter — needs a social media rebrand.
      </p>

      <p className="text-xs text-zinc-400 font-medium mb-1">Brief</p>
      <p className="text-sm text-zinc-200 min-h-[3.5rem]">
        {displayed}
        {!done && <span className="inline-block w-0.5 h-4 bg-orange-600/10 ml-0.5 animate-pulse align-middle" />}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {["Brand Strategy", "Visual Identity", "Social Media", "Copywriting"].map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-orange-600/15 text-orange-400 border border-orange-500/30">
            {s}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur" style={{ borderBottom: "1px solid var(--border)", background: "rgba(10,10,15,0.85)" }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-display" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Sparkles className="w-4 h-4" style={{ color: "var(--bg-base)" }} />
            </div>
            Visionary Arc
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="hidden sm:block text-sm" style={{ color: "var(--text-secondary)" }}>
              Founder Pass
            </Link>
            <button
              className="btn btn-primary"
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
            >
              {user ? "Dashboard" : "Start free"} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-5 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, var(--accent-glow), transparent)" }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <div className="inline-flex max-w-full items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-7" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-glow)", color: "var(--accent)" }}>
            <Zap className="w-3.5 h-3.5" />
            <span className="truncate sm:whitespace-normal">AI-powered career projects for students</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-5 break-words" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Turn your skills into{" "}
            <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              a career
            </span>
            <br />
            before graduation.
          </h1>

          <p className="text-base sm:text-lg md:text-xl max-w-xl mx-auto mb-9 px-1" style={{ color: "var(--text-secondary)" }}>
            AI-guided projects. Real portfolio. Get discovered by companies.
          </p>

          <div className="flex w-full flex-col gap-3 justify-center sm:w-auto sm:flex-row">
            <button
              className="btn btn-primary w-full sm:w-auto px-8"
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
            >
              Start for free <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <button
              className="btn btn-ghost w-full sm:w-auto px-8"
              onClick={scrollToHowItWorks}
            >
              See how it works
            </button>
          </div>

          <HeroBriefCard />
        </motion.div>
      </section>

      {/* ── 2. STATS BAR ─────────────────────────────────────────────────── */}
      <Section className="border-y border-zinc-800 bg-zinc-900/50 py-10 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-center">
          {[
            { value: 12000, suffix: "+", label: "students" },
            { value: 5,     suffix: "",  label: "career tracks" },
            { value: null,  label: "Auto portfolios", static: true },
            { value: null,  label: "Company challenges", static: true },
            { value: null,  label: "Free to start", static: true },
          ].map((stat, i) => (
            <div key={i}>
              <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none mb-1">
                {stat.static ? (
                  <span className="bg-gradient-to-r from-orange-700 to-pink-400 bg-clip-text text-transparent">✓</span>
                ) : (
                  <CountUp target={stat.value} suffix={stat.suffix} />
                )}
              </p>
              <p className="text-xs sm:text-sm text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. TRACKS ────────────────────────────────────────────────────── */}
      <Section id="tracks" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Choose your path.</h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Five real-world career tracks, each with AI-generated briefs matched to your level.
            </p>
          </div>

          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="flex gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-5 md:overflow-visible md:pb-0 snap-x snap-mandatory md:snap-none">
            {TRACKS.map((track) => {
              const Icon = ICON_MAP[track.icon] ?? Sparkles;
              const projects = TRACK_PROJECTS[track.id] ?? [];
              return (
                <motion.div
                  key={track.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="card flex-none w-64 md:w-auto snap-start flex flex-col gap-3"
                  style={{ borderColor: `var(--track-${track.id})` }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, var(--track-${track.id}) 15%, transparent)` }}>
                    <Icon className="w-5 h-5" style={{ color: `var(--track-${track.id})` }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{track.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: `var(--track-${track.id})` }}>{track.tagline}</p>
                  </div>
                  <ul className="space-y-1 mt-auto">
                    {projects.map((p) => (
                      <li key={p} className="text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
                        · {p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── 4. HOW IT WORKS ──────────────────────────────────────────────── */}
      <Section id="how-it-works" className="py-20 px-5" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>How it works.</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-8 md:gap-4 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px" style={{ background: "linear-gradient(90deg, transparent, var(--accent-glow), transparent)" }} />

            {[
              { n: "01", title: "Pick a track",         body: "Choose from 5 career paths: Tech, Design, Business, Content, or Social Impact." },
              { n: "02", title: "Get your AI brief",    body: "Our AI generates a real-world project brief personalized to your grade and goals." },
              { n: "03", title: "Build the project",    body: "Use any tool you want. Submit your link when you're done — no gatekeeping." },
              { n: "04", title: "It goes in your portfolio", body: "Your completed project publishes automatically to your public profile." },
            ].map((step) => (
              <div key={step.n} className="flex-1 flex flex-col items-center text-center relative z-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <span className="text-lg font-extrabold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
                    {step.n}
                  </span>
                </div>
                <p className="font-bold text-base mb-1">{step.title}</p>
                <p className="text-sm text-zinc-400 max-w-[180px]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 5. THE BRIEF ─────────────────────────────────────────────────── */}
      <Section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
            Your brief. Made by AI. Made for you.
          </h2>
          <p className="text-zinc-400 mb-10">
            Every brief is personalized — your track, your grade, your level.
          </p>

          {/* Brief card mockup */}
          <div className="card text-left mb-8" style={{ borderColor: "var(--track-content)" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--track-content)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--track-content)", fontFamily: "var(--font-display)" }}>Design & Branding · Standard</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Your Role</p>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Junior Brand Strategist</p>
              </div>
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Timeline</p>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>2 weeks</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Client</p>
              <p style={{ color: "var(--text-secondary)" }}>
                Nour Foundation — a local women's shelter — needs a social media rebrand.
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Brief</p>
              <p style={{ color: "var(--text-secondary)" }}>
                You'll research the org, define their brand voice, and design a 3-post Instagram campaign.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {["Brand Strategy", "Visual Identity", "Social Media", "Copywriting"].map((s) => (
                <span key={s} className="difficulty-pill" data-rank="B">
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>+400 XP on completion</span>
              <span className="text-xs font-medium" style={{ color: "var(--rank-d)" }}>Portfolio-ready</span>
            </div>
          </div>

          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Generate yours in 10 seconds.</p>
          <button
            className="btn btn-primary px-10"
            onClick={() => navigate(user ? "/tracks" : "/auth")}
          >
            Start free <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </Section>

      {/* ── 6. GAMIFICATION ──────────────────────────────────────────────── */}
      <Section className="py-20 px-5" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>Level up. For real.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Trophy, rankVar: "--rank-s",  title: "Status Tiers",       body: "Climb from Beginner to Elite. Each tier unlocks harder projects, better companies, and exclusive opportunities.", detail: "Beginner → Builder → Creator → Pro → Elite" },
              { icon: Flame,  rankVar: "--rank-a",  title: "Daily Streaks",      body: "Study every day. Earn XP. Maintain your streak to unlock bonus coins and rare project briefs.",                  detail: "7-day streak = +200 XP bonus" },
              { icon: Target, rankVar: "--rank-d",  title: "Company Challenges", body: "Real companies post real challenges. Win prizes. Get noticed. Add it to your portfolio.",                         detail: "Real rewards. Real experience." },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="card">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--surface-3)" }}>
                    <Icon className="w-5 h-5" style={{ color: `var(${card.rankVar})` }} />
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "var(--font-display)" }}>{card.title}</h3>
                  <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{card.body}</p>
                  <p className="text-xs font-semibold" style={{ color: `var(${card.rankVar})`, fontFamily: "var(--font-display)" }}>{card.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── 7. FOOTER CTA ────────────────────────────────────────────────── */}
      <Section className="py-28 px-5 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-5 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Your portfolio won't{" "}
            <span style={{ background: "linear-gradient(90deg, var(--rank-s), var(--rank-a))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              build itself.
            </span>
          </h2>
          <p className="mb-9 text-lg" style={{ color: "var(--text-secondary)" }}>
            Join thousands of students already building real career experience — for free.
          </p>
          <button
            className="btn btn-primary px-12 text-base"
            onClick={() => navigate(user ? "/dashboard" : "/auth")}
          >
            Get started free <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </Section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-8 px-5" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
          <div className="flex items-center gap-2 font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--bg-base)" }} />
            </div>
            Visionary Arc
          </div>
          <p>© 2026 Visionary Arc. Built for the next generation.</p>
          <div className="flex gap-5">
            <Link to="/pricing" style={{ color: "var(--text-secondary)" }}>Pricing</Link>
            <a href="mailto:hello@visionaryacademy.com" style={{ color: "var(--text-secondary)" }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
