# CLAUDE.md — Visionary Arc
# Student Career + Study App | Solo founder | React 18 CRA | Supabase | Low budget
# Updated: March 2026

---

## 1. WHAT THIS APP IS (LOCKED)

Visionary Arc is a **gamified student productivity and career platform for ages 13–19**.

**One sentence:** "A gamified study + career app where students earn XP by studying
AND building real-world projects — turning schoolwork into a portfolio that gets them discovered."

**NOT:** a teacher tool, investor dashboard, Discord clone, or custom design/code editor.

**Core daily loop:**
Study tools (flashcards/quiz/notes) → Earn XP + Coins → Level up → Unlock project briefs
→ Build in external tools → Submit link → Portfolio auto-generated → Status tier rises
→ Companies discover top students

---

## 2. TECH STACK

- **Frontend:** React 18 CRA, Tailwind, shadcn/radix, Framer Motion
- **Backend:** Supabase (auth + DB + storage + edge functions)
- **AI:** OpenRouter (primary — cheaper) + Groq (interactive/fast features only)
- **Payments:** Stripe (Founder Pass one-time)
- **Rewards:** Tremendous API (gift cards, zero platform fees)
- **Hosting:** Vercel Pro ($20/month)
- **Canvas:** Excalidraw (npm — already installed, embed only)
- **Notes:** Tiptap (already installed, embed only)
- **Offline:** Dexie.js (already installed — IndexedDB for flashcards)

**AI model routing:**
| Task | Model | Provider | Approx cost/1K calls |
|---|---|---|---|
| Flashcards, quiz, summary | Llama 3.1 8B | OpenRouter | $0.07 |
| Notes, slides, AI tools | Llama 3.3 70B | OpenRouter | $0.42 |
| Project briefs | Claude Haiku 4.5 | OpenRouter | $1.25 |
| AI tutor (interactive) | Llama 3.3 70B | Groq | $0.79 (fast) |

---

## 3. WHAT'S BUILT VS WHAT'S NEEDED

### BUILT AND WORKING (just need API keys + Supabase tables):
- Supabase auth wired in App.js (signIn, signUp, getSession)
- supabaseClient.js singleton
- aiRouter.js (triple-tier routing, coin deduction, usage logging)
- useAITool.js wired to aiRouter
- anthropicClient.js (Study Hub) wired to aiRouter
- Study Hub (flashcards/quiz/summary/notes/slides)
- Notes Studio (Tiptap)
- Notes Knowledge Graph (d3)
- Whiteboard (Excalidraw)
- SAT/ACT Practice (mock data — keep as-is)
- Shop UI (connect to real coin balance)
- Competitions (3 game modes — rename to Challenges)
- Dashboard (connect XP/coins/streaks to real DB)
- Leaderboard (connect to real Supabase profiles)
- Referral page (connect referralService.js)
- Pricing page (connect Stripe payment links)
- Profile page (extend with portfolio section)
- Settings page (connect real user data)
- Services: coinService, missionService, referralService, flashcardService

### MUST BUILD (the actual Visionary Arc product):
1. Track Hub pages (5 career tracks)
2. AI Brief Generator (personalized project briefs per track+difficulty)
3. Project submission flow (paste link → XP → portfolio card)
4. Auto-portfolio page (public profile with project cards)
5. Status tier system (XP thresholds + feature gates)
6. Sponsored challenges board (company-posted challenges)
7. Friend system (follow, friend streaks, friend leaderboard)
8. Onboarding (3-step first-run experience)
9. Landing page rebuild (career accelerator angle)
10. Supabase SQL tables (ALL 12 tables)

### REMOVE FROM ROUTER (hide, keep files):
- /teacher/* — all teacher routes
- /investor — investor dashboard
- /community — replace with simple activity feed in Phase 2
- /wishlists — Phase 2
- /schools — absorb into onboarding (text field only)

---

## 4. DATABASE TABLES (paste in Supabase SQL Editor)

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- profiles (extends auth.users)
create table profiles (
  id uuid references auth.users(id) primary key,
  email text, name text, avatar text,
  school text, grade integer,
  xp integer default 0, level integer default 1,
  coins integer default 100,
  streak integer default 0, max_streak integer default 0,
  last_activity_date date,
  founder_tier text check (founder_tier in ('seed','bronze','silver','gold')),
  is_premium boolean default false,
  onboarded boolean default false,
  track_primary text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id);

-- streaks
create table streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  current_streak integer default 0,
  max_streak integer default 0,
  last_activity_date date,
  freeze_count integer default 0,
  created_at timestamptz default now()
);
alter table streaks enable row level security;
create policy "own streaks" on streaks for all using (auth.uid() = user_id);

-- study_sessions (XP activity log)
create table study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  activity_type text, -- 'flashcards','quiz','summary','notes','whiteboard','practice'
  subject text,
  xp_earned integer default 0,
  coins_earned integer default 0,
  duration_seconds integer,
  created_at timestamptz default now()
);
alter table study_sessions enable row level security;
create policy "own sessions" on study_sessions for all using (auth.uid() = user_id);

-- missions (daily missions)
create table missions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  type text, -- 'daily','weekly'
  title text, description text,
  xp_reward integer, coins_reward integer,
  progress integer default 0, target integer,
  completed boolean default false,
  claimed boolean default false,
  date date default current_date,
  created_at timestamptz default now()
);
alter table missions enable row level security;
create policy "own missions" on missions for all using (auth.uid() = user_id);

-- transactions (coin ledger, append-only)
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  amount integer, -- positive = credit, negative = debit
  reason text,
  balance_after integer,
  created_at timestamptz default now()
);
alter table transactions enable row level security;
create policy "own transactions" on transactions for all using (auth.uid() = user_id);

-- projects (brief + submission)
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  track text, difficulty text,
  title text, role text, client_name text,
  brief_json jsonb, -- full brief object from AI
  status text default 'active' check (status in ('active','submitted','completed','abandoned')),
  submission_url text,
  submission_notes text,
  xp_awarded integer default 0,
  coins_awarded integer default 0,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);
alter table projects enable row level security;
create policy "own projects" on projects for all using (auth.uid() = user_id);

-- portfolio_entries (public)
create table portfolio_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  project_id uuid references projects(id),
  track text, title text, role text,
  description text, skills text[],
  submission_url text,
  is_public boolean default true,
  created_at timestamptz default now()
);
alter table portfolio_entries enable row level security;
create policy "read public" on portfolio_entries for select using (is_public = true);
create policy "own entries" on portfolio_entries for all using (auth.uid() = user_id);

-- challenges (company-sponsored)
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  sponsor_name text, sponsor_logo_url text,
  title text, description text, track text,
  reward_type text, reward_value text,
  max_slots integer, current_slots integer default 0,
  required_tier text default 'Beginner',
  status text default 'open',
  deadline timestamptz,
  created_at timestamptz default now()
);
alter table challenges enable row level security;
create policy "read all challenges" on challenges for select using (status = 'open');

-- referrals
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid references profiles(id),
  referred_id uuid references profiles(id),
  status text default 'pending', -- 'pending','signed_up','streak_7','upgraded'
  coins_awarded integer default 0,
  created_at timestamptz default now()
);
alter table referrals enable row level security;
create policy "own referrals" on referrals for all using (auth.uid() = referrer_id);

-- friends
create table friends (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  friend_id uuid references profiles(id),
  status text default 'pending', -- 'pending','accepted'
  friend_streak integer default 0,
  last_both_active date,
  created_at timestamptz default now()
);
alter table friends enable row level security;
create policy "own friends" on friends for all using (auth.uid() = user_id or auth.uid() = friend_id);

-- ai_usage_log (cost tracking)
create table ai_usage_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  feature text, model text,
  tokens_used integer, coins_deducted integer,
  created_at timestamptz default now()
);
alter table ai_usage_log enable row level security;
create policy "own usage" on ai_usage_log for all using (auth.uid() = user_id);

-- leaderboard materialized view (refresh hourly)
create materialized view leaderboard_weekly as
select id, name, avatar, school, xp, level, streak,
  rank() over (order by xp desc) as rank
from profiles
order by xp desc limit 100;

-- Indexes for performance
create index on study_sessions(user_id, created_at);
create index on transactions(user_id, created_at);
create index on missions(user_id, date);
create index on projects(user_id, status);
create index on portfolio_entries(user_id, is_public);
```

---

## 5. XP EARNING TABLE

| Action | XP | Coin | Daily limit |
|---|---|---|---|
| Daily login | +5 | +2 | 1/day |
| Flashcard session (10+ cards) | +15 | +5 | 1/subject/day |
| Quiz (5+ questions) | +20 | +8 | 1/subject/day |
| Summary/notes saved | +10 | +3 | 1/day |
| Whiteboard saved | +10 | +3 | 1/day |
| Vocab drill (20 words) | +15 | +5 | 1/day |
| Daily mission completed | +25–75 | +10–25 | 3/day |
| SAT/ACT session | +30 | +10 | 1/day |
| 7-day streak bonus | +200 | +50 | Once at 7 days |
| 30-day streak bonus | +1,000 | +200 | Once at 30 days |
| Generate project brief | +50 | +5 | 1/track/week |
| Submit completed project (Starter) | +200 | +50 | Per project |
| Submit completed project (Standard) | +400 | +100 | Per project |
| Submit completed project (Advanced) | +700 | +175 | Per project |
| Submit completed project (Expert) | +1,000 | +250 | Per project |
| Refer friend (signs up) | +300 | +100 | Per referral |
| Refer friend (hits 7-day streak) | +100 | +50 | Per referral |
| Refer friend (upgrades to paid) | +500 | +250 | Per referral |
| Friend both active (friend streak day) | +20 | +10 | Per active friend |
| Portfolio entry published | +25 | +5 | Per project |

---

## 6. STATUS TIER THRESHOLDS

| Tier | XP | Unlocks |
|---|---|---|
| Beginner | 0 | Study tools, Starter briefs (1/week) |
| Builder | 500 | Standard briefs, public profile visible |
| Creator | 2,000 | Advanced briefs, challenge board access |
| Pro | 6,000 | Exclusive cohorts, apply to company challenges |
| Elite | 15,000 | Featured on discovery, direct company opportunities |

---

## 7. AI PROMPT RULES (save credits)

System prompts MUST be under 150 tokens. Always request JSON output.

**Flashcards:**
System: `Generate {n} flashcards as JSON array [{front, back}]. JSON only, no markdown.`

**Quiz:**
System: `Generate {n} MCQ questions as JSON [{question, options:["a","b","c","d"], answer:"a", explanation:""}]. JSON only.`

**Summary:**
System: `Summarize as {style} style. Use markdown headers and bullets. Max {length}.`

**Project brief:**
System: `You are a senior project director. Return ONLY JSON: {"title":"","role":"","client":"","clientNeed":"","briefSummary":"","deliverables":[],"skills":[],"timeline":"","difficulty":""}`
User: `Track: {track}. Difficulty: {difficulty}. Grade: {grade}. School: {school}.`
Model: Claude Haiku 4.5 via OpenRouter (quality required here)

**Cache everything:** 24h for briefs, per-content-hash for flashcards/quizzes.

---

## 8. ENVIRONMENT VARIABLES NEEDED

```
REACT_APP_SUPABASE_URL=                    # supabase.com → project → settings → API
REACT_APP_SUPABASE_ANON_KEY=               # same place
REACT_APP_OPENROUTER_API_KEY=              # openrouter.ai/keys
REACT_APP_GROQ_API_KEY=                    # console.groq.com (for fast interactive)
REACT_APP_STRIPE_PUBLISHABLE_KEY=          # stripe.com (already set)
REACT_APP_USE_MOCK=false                   # switch to true locally if needed
```

After adding keys: NEVER commit to GitHub. Keys go in .env.local only.
After building Supabase Edge Functions: move ALL AI calls server-side.

---

## 9. CODING RULES FOR CURSOR

- Read the ENTIRE file before editing any part of it
- Keep USE_REAL_API toggle working — mock always stays as fallback
- Add loading skeleton to every component that fetches data
- Use existing shadcn/radix components — no new UI libraries
- Use Framer Motion for animations — it's already installed
- After EVERY change, verify the app compiles without errors
- Commit after every successful Cursor session: git add . && git commit -m "what I built" && git push

NEVER:
- Set USE_REAL_API=true before Supabase tables are confirmed to exist
- Add new npm packages without checking existing packages first
- Make direct API calls from page components — always use aiRouter.js
- Hardcode user data — always pull from AuthContext
- Build teacher/investor pages
- Expose API keys in browser code (after backend is ready)