# CLAUDE.md — Visionary Academy (Visionary-Arc)

## RULES FOR CLAUDE CODE
- Read this file before touching ANY code. Do not scan files to discover things already documented here.
- When editing a file, read ONLY the specific file needed. Do not glob-read the entire src/ tree.
- Make surgical edits. Do not rewrite working components.
- After each task, state exactly which files were changed and what was done.
- Never install packages not listed here unless the task explicitly requires it.
- If a task says "DONE — skip", skip it entirely.

---

## 1. PROJECT SNAPSHOT

| Item | Value |
|---|---|
| App name | Visionary Academy |
| Repo | tuplianchris-ux/Visionary-Arc |
| Live URL | https://visionary-arc.vercel.app |
| Framework | React 18 CRA (react-scripts 5) — NOT Next.js |
| Language | JavaScript (no TypeScript) |
| Router | react-router-dom v6 |
| Styling | Tailwind CSS 3 + Shadcn/Radix UI pattern |
| State | React Context only (no Redux/Zustand) |
| Backend | NONE — all mocked via axios interceptor |
| Database | NONE — localStorage only |
| Auth | Mock only — no real server |
| Payments | Stripe.js loaded, test key set, no webhook |
| AI | Groq (direct browser fetch) for Study Hub only |
| Real-time | Liveblocks (study rooms + whiteboard) |

---

## 2. EXACT FOLDER MAP

```
src/
├── App.js                          Root router + AuthContext + ThemeContext + daily coin/streak
├── index.js                        Entry point
├── index.css                       Global styles
├── liveblocks.config.js            Liveblocks client + room types
│
├── components/
│   ├── Layout.jsx                  Sidebar + <Outlet> wrapper
│   ├── Sidebar.jsx                 Left nav, user chip, theme toggle
│   ├── PageHeader.jsx              Page title + breadcrumb
│   ├── VisionaryChatbox.jsx        Floating bottom-right AI assistant
│   ├── UpgradeBanner.jsx           Founder tier upsell banner
│   ├── FounderBadge.jsx            Tier badge (seed/bronze/silver/gold)
│   ├── Leaderboard.jsx             Global leaderboard (mock 50 users)
│   ├── RewardsTrack.jsx            Level progress + milestone viz
│   ├── TransactionLog.jsx          Coin transaction history
│   ├── AssignmentRadar.jsx         Recharts RadarChart
│   ├── ui/                         60+ Shadcn/Radix primitives
│   ├── StudyRoom/                  Liveblocks study rooms
│   │   ├── StudyRoomPage.jsx
│   │   ├── StudyRoomList.jsx
│   │   ├── RoomTopBar.jsx
│   │   ├── ChatPanel.jsx
│   │   ├── WhiteboardCanvas.jsx    Excalidraw + Liveblocks sync
│   │   ├── LibraryDrawer.jsx
│   │   ├── LibraryCard.jsx
│   │   ├── useStudyRoom.js
│   │   ├── useLiveCanvas.js
│   │   └── mockLibraryData.js
│   ├── study-hub/                  Main AI chat interface
│   │   ├── ChatArea.jsx
│   │   ├── ChatInputBar.jsx
│   │   ├── UserMessage.jsx
│   │   ├── AssistantMessage.jsx    Renders QuizView/FlashcardView/SummaryView/SlidesView
│   │   ├── ModePopover.jsx         Mode: summarize/quiz/flashcards/notes/slides
│   │   ├── StylePopover.jsx
│   │   ├── QuizView.jsx
│   │   ├── FlashcardView.jsx
│   │   ├── SummaryView.jsx
│   │   ├── SlidesView.jsx
│   │   ├── AttachMenu.jsx
│   │   ├── anthropicClient.js      REAL Groq API fetch (browser-side)
│   │   ├── studyHubMock.js         Mock fallback responses
│   │   └── mockChatHistory.js
│   ├── ai-tools/
│   │   ├── AIToolsPanel.jsx
│   │   ├── ToolCard.jsx
│   │   ├── ToolModal.jsx
│   │   ├── ToolResult.jsx
│   │   ├── FormComponents.jsx
│   │   ├── hooks/
│   │   │   ├── useAITool.js        Tries /api/ai/generate (fails) → mock fallback
│   │   │   └── useXPReward.js
│   │   ├── student/                8 student tool components
│   │   └── teacher/                8 teacher tool components
│   ├── competitions/
│   │   ├── CompetitionsLobby.jsx
│   │   ├── WaitingRoom.jsx
│   │   ├── AccuracyDuelGame.jsx
│   │   ├── KnowledgeBlitzGame.jsx
│   │   ├── VocabJamGame.jsx
│   │   ├── StatsBar.jsx
│   │   ├── shared.jsx
│   │   ├── gameAI.js
│   │   └── useGameXP.js
│   └── icons/
│       └── PhosphorIcon.jsx
│
├── pages/
│   ├── Dashboard.jsx               Student home (tasks, missions, stats, streaks, coins)
│   ├── TasksPage.jsx
│   ├── StudyHub.jsx                AI study interface
│   ├── Library.jsx
│   ├── Community.jsx               Discord-style (mock messages)
│   ├── Shop.jsx                    Cosmetic shop (coin-gated, mock)
│   ├── Competitions.jsx
│   ├── Profile.jsx
│   ├── Settings.jsx
│   ├── AuthPage.jsx                Login/register + role select
│   ├── AuthCallback.jsx            OAuth redirect handler
│   ├── LandingPage.jsx
│   ├── Pricing.jsx
│   ├── NotesStudio.jsx             Tiptap + Excalidraw
│   ├── NotesGraph.jsx              d3-force knowledge graph
│   ├── SATACTPractice.jsx
│   ├── PracticePage.jsx
│   ├── ReferralPage.jsx
│   ├── Strengths.jsx
│   ├── Schools.jsx
│   ├── Wishlists.jsx
│   ├── Store.jsx                   Stripe checkout (UI only, no webhook)
│   ├── CheckoutSuccess.jsx
│   ├── Success.jsx
│   ├── InvestorDashboard.jsx
│   ├── student/
│   │   └── AIToolsPage.jsx
│   └── teacher/
│       ├── Classes.jsx
│       ├── Assignments.jsx
│       ├── Students.jsx
│       ├── StudentIntelligence.jsx
│       ├── Gradebook.jsx
│       ├── Resources.jsx
│       └── AIToolsPage.jsx
│
├── services/
│   ├── apiService.js               USE_REAL_API toggle (currently false)
│   ├── dataService.js              localStorage-backed mock store
│   └── mockAdapter.js              axios interceptor — catches all /api/* calls
│
├── data/
│   ├── mockLeaderboardData.js      50 hardcoded users
│   ├── mockPracticeData.js         ~1000 SAT/ACT questions
│   ├── rewardsProgram.js           Level 1-50 milestone definitions
│   ├── mockTeacherData.js
│   ├── mockAssignments.js
│   ├── mockNotes.js
│   ├── mockGraphNotes.js
│   └── mockStudentIntelligence.js
│
├── lib/
│   ├── themes.js                   6 theme definitions
│   ├── fonts.js                    Font family options
│   ├── founder.js                  Tier logic + feature flags + coin multipliers
│   ├── animations.js               Framer Motion variants
│   ├── validation.js               Zod schemas (loginSchema, registerSchema)
│   └── utils.js                    cn() helper
│
├── hooks/
│   ├── useApi.js
│   └── use-toast.js
│
├── utils/
│   ├── dashboardAnalytics.js
│   ├── notesGraphData.js
│   └── generateClassCode.js
│
└── templates/
    └── noteTemplates.js
```

---

## 3. AUTH CONTEXT (App.js)

AuthContext provides: `user, setUser, loading, token, login(), register(), logout(), isStudent, isTeacher, isInvestor`

Token: `localStorage['auth_token']`
User: `localStorage['auth_user']`
Daily coins: fires on `[user]` change — checks `localStorage['last_login_date']`, awards 10 coins + streak bonus if new day.
Role redirect on login: teacher → `/teacher`, investor → `/investor`, else `/dashboard`

---

## 4. MOCK SYSTEM

**Toggle:** `const USE_REAL_API = false` in `src/services/apiService.js` line 1.

**How it works:** `mockAdapter.js` registers `axios.interceptors.request.use()`. Every `/api/*` call is intercepted and resolved with mock data. Real network never called.

**Persistent mock state:**
- Coin balance: `localStorage['mock_coins']`
- Streak: `localStorage['mock_streak']`

**To enable real API:** Set `USE_REAL_API = true` in apiService.js AND provide a real backend at `REACT_APP_BACKEND_URL`.

---

## 5. REAL CONNECTIONS (Already Working)

| Service | File | Status |
|---|---|---|
| Groq AI (Llama 3.3 70B) | `src/components/study-hub/anthropicClient.js` | REAL — direct browser fetch |
| Liveblocks (study rooms) | `src/liveblocks.config.js` | REAL — needs valid key |
| Stripe.js | `src/pages/Store.jsx` | LOADED — test key, no webhook |

**Groq call pattern:**
```js
fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.REACT_APP_GROQ_API_KEY}` },
  body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', messages })
})
```

---

## 6. ENV VARIABLES

```
REACT_APP_BACKEND_URL=http://localhost:8000     (no server running)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...    (test key, set)
REACT_APP_LIVEBLOCKS_PUBLIC_KEY=pk_dev_...      (set)
REACT_APP_GROQ_API_KEY=gsk_...                  (set, working)
REACT_APP_ENABLE_VISUAL_EDITS=false
DISABLE_HOT_RELOAD=true
GENERATE_SOURCEMAP=false
SKIP_PREFLIGHT_CHECK=true
```

**Missing (not set):**
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_GOOGLE_CLIENT_ID`

---

## 7. KEY DATA SHAPES

### User object (in AuthContext + localStorage)
```js
{
  id: string,           // uuid
  email: string,
  name: string,
  role: 'student' | 'teacher' | 'investor',
  avatar: string,
  school: string,
  grade: number,
  xp: number,
  level: number,
  coins: number,
  streak: number,
  max_streak: number,
  last_activity_date: string, // ISO date
  is_premium: boolean,
  founder_tier: 'seed' | 'bronze' | 'silver' | 'gold' | null
}
```

### Coin transaction
```js
{ id, user_id, amount, reason, balance_after, created_at }
```

### Mission
```js
{ id, type: 'daily'|'weekly', title, description, xp_reward, coins_reward, progress, target, completed, claimed }
```

---

## 8. ROUTES (All in App.js)

Public: `/`, `/auth`, `/pricing`, `/auth/callback`

Protected (wrapped in Layout): `/dashboard`, `/tasks`, `/study`, `/library`, `/community`, `/shop`, `/competitions`, `/referrals`, `/practice`, `/practice-hub`, `/strengths`, `/notes-studio`, `/graph`, `/profile`, `/profile/:userId`, `/settings`, `/rewards`, `/schools`, `/wishlists`, `/store`, `/investor`, `/teacher`, `/teacher/classes`, `/teacher/assignments`, `/teacher/assignments/create`, `/teacher/students`, `/teacher/students/intelligence`, `/teacher/gradebook`, `/teacher/resources`, `/teacher/ai-tools`, `/student/ai-tools`

Special (no Layout): `/community/room/:roomId`

---

## 9. WHAT IS BUILT vs MISSING

### ✅ FULLY BUILT (do not rewrite)
- All page routes and navigation
- All UI components (Layout, Sidebar, Dashboard, StudyHub, Notes, Shop, etc.)
- Study Hub AI chat with QuizView, FlashcardView, SummaryView, SlidesView
- Floating VisionaryChatbox
- All teacher pages (Classes, Assignments, Gradebook, Students, Intelligence, Resources)
- All gamification UI (XP display, coins, streaks, leaderboard, missions, rewards track)
- Competitions (3 game modes, mock AI opponent)
- SAT/ACT practice (mock questions)
- Liveblocks study rooms + Excalidraw whiteboard
- Auth flow (mock), role selection, protected routes
- Founder tier system (founder.js), FounderBadge, UpgradeBanner
- Theme system (6 themes), font switching, Settings page
- Stripe.js loading, Store page UI, CheckoutSuccess page

### ❌ MISSING / BROKEN (these are the tasks)
- Supabase database + real auth (everything is localStorage)
- Real backend API server (no server.js exists)
- `/api/ai/generate` endpoint (returns 404, all AI tools use mock)
- Stripe webhook (payments complete but nothing happens)
- Coins ↔ AI usage connection (coins never deducted on real AI calls)
- File upload / Supabase Storage
- Google OAuth (AuthCallback exists but no provider configured)
- Real leaderboard (50 hardcoded users)
- Mission auto-reset cron
- Tango Card gift card redemption
- Push notifications

---

## 10. INSTALLED PACKAGES (do not re-install these)

axios, react-router-dom, framer-motion, tailwindcss, @radix-ui/* (21 pkgs), shadcn pattern, lucide-react, phosphor-react, recharts, react-force-graph-2d, d3-force, @tiptap/react + extensions, @excalidraw/excalidraw, @liveblocks/client + react + yjs, yjs, @stripe/stripe-js, @dnd-kit/core + sortable + utilities, react-hook-form, @hookform/resolvers, zod, date-fns, embla-carousel-react, react-markdown, remark-gfm, react-resizable-panels, sonner, vaul, cmdk, input-otp, next-themes, socket.io-client, class-variance-authority, clsx, tailwind-merge, tailwindcss-animate

**Not installed yet (needed for upcoming tasks):**
- `@supabase/supabase-js` — for database + auth
- `dexie` — IndexedDB offline storage
- `pptxgenjs` — PPTX export
- `docx` — DOCX export
- `jspdf` — PDF export

---

## 11. SUPABASE SCHEMA (to be created — not yet in DB)

```sql
-- Users (mirrors existing user shape)
users: id uuid, email, name, role, avatar, school, grade, xp, level, coins, streak, max_streak, last_activity_date, is_premium, founder_tier, created_at

-- Coins
coins_transactions: id uuid, user_id, amount, reason, balance_after, created_at

-- XP
xp_events: id uuid, user_id, amount, reason, created_at

-- Streaks
streaks: user_id, current_streak, max_streak, last_activity_date

-- Missions
missions: id, user_id, type, title, description, xp_reward, coins_reward, progress, target, completed, claimed, reset_at

-- Classes
classes: id, teacher_id, name, subject, grade_level, join_code, created_at
class_members: class_id, student_id, joined_at

-- Assignments
assignments: id, class_id, teacher_id, title, description, due_date, created_at
submissions: id, assignment_id, student_id, content, grade, feedback, submitted_at

-- Flashcard Sets
flashcard_sets: id, user_id, title, subject, created_at
flashcards: id, set_id, front, back, difficulty

-- AI Usage
ai_usage_log: id, user_id, model, tokens_used, coins_deducted, feature, created_at

-- Leaderboard (view or materialized)
leaderboard: user_id, name, avatar, school, xp, level, streak, founder_tier, weekly_xp
```

---

## 12. AI ROUTING LOGIC (to be implemented)

Route by task complexity. Add this to a new file `src/services/aiRouter.js`:

```
Tier 1 — FAST (1 coin): simple tasks (grammar, short summaries, single flashcard)
  → model: 'meta-llama/llama-3.3-70b-instruct:free' via Groq

Tier 2 — STANDARD (3 coins): lesson plans, essay feedback, quiz generation, document drafting
  → model: 'anthropic/claude-sonnet-4-5' via OpenRouter

Tier 3 — POWER (8 coins): slides, visual tasks, screenshot-to-code, deep research
  → model: 'moonshotai/kimi-k2.5' via OpenRouter

All calls go through: POST /api/ai/generate (backend route)
Backend logs to ai_usage_log, deducts coins, returns result.
```

---

## 13. COIN DEDUCTION RULES

```
Free tier (seed): 50 coins/day, resets midnight UTC
Bronze: 500 coins/month
Silver: 1500 coins/month
Gold: 10000 coins/month (effectively unlimited)

Cost per action:
- Fast AI call: 1 coin
- Standard AI call: 3 coins
- Power AI call: 8 coins
- Slide generation: 15 coins
- Meeting transcription: 20 coins
- Study Jam win bonus: +25 coins earned
- Daily quest complete: +10 coins earned
- Referral: +50 coins earned
```