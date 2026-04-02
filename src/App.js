import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import axios from "axios";
import apiService, { isUsingRealAPI, streaksAPI } from "./services/apiService";
import { supabase } from "./services/supabaseClient";
import { getMockUserSync } from "./services/dataService";
import { getDefaultThemeId, getTheme, applyTheme as doApplyTheme, themes as themeList } from "./lib/themes";
import { getDefaultFontId, getFont, applyFont as doApplyFont } from "./lib/fonts";

if (!isUsingRealAPI()) {
  require("./services/mockAdapter");
}

// Pages
import LandingPage from "./pages/LandingPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherClasses from "./pages/teacher/Classes";
import TeacherAssignments from "./pages/teacher/Assignments";
import AssignmentCreator from "./pages/AssignmentCreator";
import TeacherStudents from "./pages/teacher/Students";
import StudentIntelligence from "./pages/teacher/StudentIntelligence";
import TeacherGradebook from "./pages/teacher/Gradebook";
import TeacherResources from "./pages/teacher/Resources";
import TeacherAIToolsPage from "./pages/teacher/AIToolsPage";
import StudentAIToolsPage from "./pages/student/AIToolsPage";
import MyGrades from "./pages/MyGrades";
import DMInbox from "./pages/DMInbox";
import InvestorDashboard from "./pages/InvestorDashboard";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import TasksPage from "./pages/TasksPage";
import StudyHub from "./pages/StudyHub";
import Library from "./pages/Library";
import Community from "./pages/Community";
import StudyRoomPage from "./components/StudyRoom/StudyRoomPage";
import Shop from "./pages/Shop";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Competitions from "./pages/Competitions";
import SATACTPractice from "./pages/SATACTPractice";
import PracticePage from "./pages/PracticePage";
import ReferralPage from "./pages/ReferralPage";
import Strengths from "./pages/Strengths";
import NotesStudio from "./pages/NotesStudio";
import NotesGraph from "./pages/NotesGraph";
import Pricing from "./pages/Pricing";
import Success from "./pages/Success";
import RewardsTrack from "./components/RewardsTrack";
import LevelUpOverlay from "./components/LevelUpOverlay";
// Components
import VisionaryChatbox from "./components/VisionaryChatbox";
import Layout from "./components/Layout";

// ── Global axios interceptor: catch 429 rate-limit responses and show a toast ──
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 429) {
      const retryAfter = error.response.data?.retry_after ?? 60;
      toast.warning("Whoa, slow down! ⏳", {
        description: `You're doing that too fast. Try again in ${retryAfter} second${retryAfter !== 1 ? "s" : ""}.`,
        duration: 5000,
      });
    }
    return Promise.reject(error);
  }
);

// Context
export const AuthContext = createContext(null);
export const ThemeContext = createContext(null);

// API configuration (kept for compatibility, but using apiService)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
export const API = `${BACKEND_URL}/api`;

// Theme + Font provider (uses lib/themes.js and lib/fonts.js)
function ThemeProvider({ children }) {
  const [activeTheme, setActiveTheme] = useState(null);
  const [activeFont, setActiveFont] = useState(null);

  useEffect(() => {
    const themeId = getDefaultThemeId();
    setActiveTheme(themeId);
    doApplyTheme(themeId);
  }, []);

  useEffect(() => {
    const fontId = getDefaultFontId();
    setActiveFont(fontId);
    doApplyFont(fontId);
  }, []);

  const setTheme = (themeId) => {
    if (!getTheme(themeId)) return;
    setActiveTheme(themeId);
    doApplyTheme(themeId);
  };

  const setFont = (fontId) => {
    if (!getFont(fontId)) return;
    setActiveFont(fontId);
    doApplyFont(fontId);
  };

  const toggleMode = () => {
    const current = getTheme(activeTheme);
    const next = current?.mode === "dark"
      ? themeList.find((t) => t.mode === "light") ?? themeList[0]
      : themeList.find((t) => t.mode === "dark") ?? themeList[1];
    if (next) setTheme(next.id);
  };

  // Legacy: theme = "light" | "dark" for backwards compatibility (e.g. Sidebar)
  const theme = activeTheme ? (getTheme(activeTheme)?.mode ?? "dark") : "dark";
  const toggleTheme = toggleMode;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        toggleMode,
        activeTheme: activeTheme ?? "dark",
        activeFont: activeFont ?? "inter",
        setFont,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Auth Provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    isUsingRealAPI() ? null : getMockUserSync()
  );
  const [loading, setLoading] = useState(() => isUsingRealAPI());
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const handleDailyStreakLogin = async (loadedUser) => {
    if (!loadedUser) return;
    const today = new Date().toISOString().split('T')[0];
    const lastStreakLogin = localStorage.getItem('last_streak_login');
    if (lastStreakLogin === today) return;
    // Mark done for today before async work to prevent double-fire on rapid re-renders
    localStorage.setItem('last_streak_login', today);
    try {
      const streakData = await streaksAPI.getStreak();
      // Toast if streak > 3 and not yet kept today
      if (streakData.current_streak > 3 && streakData.last_activity_date !== today) {
        toast.warning("Your streak resets tonight — complete any activity to keep it.", {
          duration: 8000,
        });
      }
      await streaksAPI.increment();
    } catch (_) {}
  };

  const awardDailyLoginCoins = async (loadedUser, updater) => {
    if (!loadedUser) return;
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = localStorage.getItem('last_coin_login');
    if (lastLogin === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const isStreak = lastLogin === yesterday;
    localStorage.setItem('last_coin_login', today);
    try {
      let result = await apiService.coins.award(10, 'daily_login');
      if (isStreak) {
        result = await apiService.coins.award(5, 'streak_bonus');
      }
      updater(prev => ({ ...prev, coins: result.balance }));
    } catch (_) {}
  };

  useEffect(() => {
    if (isUsingRealAPI()) {
      const checkAuth = async () => {
        const justAuth = sessionStorage.getItem("just_authenticated");
        if (!justAuth) {
          await new Promise(r => setTimeout(r, 150));
        } else {
          sessionStorage.removeItem("just_authenticated");
        }
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
            const userData = profile || session.user;
            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            localStorage.setItem('auth_token', session.access_token);
            awardDailyLoginCoins(userData, setUser);
            handleDailyStreakLogin(userData);
          } else {
            setUser(null);
            setToken(null);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
        } catch (e) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        } finally {
          setLoading(false);
        }
      };
      checkAuth();
    } else {
      // Mock mode: sync with localStorage in case it was updated
      apiService.auth.getCurrentUser().then(u => {
        setUser(u);
        awardDailyLoginCoins(u, setUser);
        handleDailyStreakLogin(u);
      }).catch(() => {});
    }
  }, [token]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
    const userData = profile || data.user;
    setUser(userData);
    setToken(data.session.access_token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_token', data.session.access_token);
    return { user: userData, token: data.session.access_token };
  };

  const register = async (email, password, name, role = 'student') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const newUser = {
      id: data.user.id,
      email,
      name,
      role,
      avatar: '',
      school: '',
      grade: 0,
      xp: 0,
      level: 1,
      coins: 50,
      streak: 0,
      max_streak: 0,
      last_activity_date: new Date().toISOString().split('T')[0],
      is_premium: false,
      founder_tier: 'seed',
    };
    await supabase.from('users').insert(newUser);
    return login(email, password);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const processOAuthCode = async (code) => {
    const response = await apiService.auth.processOAuthCode(code);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem("token", response.token);
    return response;
  };

  const refreshCoins = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('users').select('coins').eq('id', user.id).single();
    if (error || !data) return;
    setUser(prev => ({ ...prev, coins: data.coins }));
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        localStorage.setItem('auth_user', JSON.stringify({ ...parsed, coins: data.coins }));
      } catch (_) {}
    }
  };

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isInvestor = user?.role === 'investor';

  return (
    <AuthContext.Provider value={{ user, setUser, loading, token, login, register, logout, processOAuthCode, isStudent, isTeacher, isInvestor, refreshCoins }}>
      {children}
    </AuthContext.Provider>
  );
}

// Mock mode indicator (demo data, no backend)
function MockModeBanner() {
  if (isUsingRealAPI()) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-40 py-1.5 px-4 text-center text-xs bg-amber-500/90 text-amber-950 font-medium">
      Using demo data – no backend
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

// App Router
function AppRouter() {
  const location = useLocation();
  const { user } = useContext(AuthContext);

  // Handle OAuth callback synchronously
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  const defaultRoute = user?.role === 'teacher' ? '/teacher' : user?.role === 'investor' ? '/investor' : '/dashboard';

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
      </Route>
      <Route path="/tasks" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<TasksPage />} />
      </Route>
      <Route path="/study" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<StudyHub />} />
      </Route>
      <Route path="/library" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Library />} />
      </Route>
      <Route path="/community" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Community />} />
      </Route>
      <Route path="/community/room/:roomId" element={<ProtectedRoute><StudyRoomPage /></ProtectedRoute>} />
      <Route path="/shop" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Shop />} />
      </Route>
      <Route path="/competitions" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Competitions />} />
      </Route>
      <Route path="/referrals" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<ReferralPage />} />
      </Route>
      <Route path="/practice" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<SATACTPractice />} />
      </Route>
      <Route path="/practice-hub" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<PracticePage />} />
      </Route>
      <Route path="/strengths" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Strengths />} />
      </Route>
      <Route path="/notes-studio" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<NotesStudio />} />
      </Route>
      <Route path="/graph" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<NotesGraph />} />
      </Route>
      <Route path="/profile" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Profile />} />
        <Route path=":userId" element={<Profile />} />
      </Route>
      <Route path="/settings" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Settings />} />
      </Route>
      <Route path="/teacher" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="assignments" element={<TeacherAssignments />} />
        <Route path="assignments/create" element={<AssignmentCreator />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="students/intelligence" element={<StudentIntelligence />} />
        <Route path="gradebook" element={<TeacherGradebook />} />
        <Route path="ai-generator" element={<TeacherAssignments autoOpenAI />} />
        <Route path="resources" element={<TeacherResources />} />
        <Route path="ai-tools" element={<TeacherAIToolsPage />} />
      </Route>
      <Route path="/student" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="ai-tools" element={<StudentAIToolsPage />} />
      </Route>
      <Route path="/investor" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<InvestorDashboard />} />
      </Route>
      <Route path="/rewards" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<RewardsTrack />} />
      </Route>
      <Route path="/grades" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<MyGrades />} />
      </Route>
      <Route path="/messages" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DMInbox />} />
        <Route path=":userId" element={<DMInbox />} />
      </Route>
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/success" element={<Success />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <MockModeBanner />
          <AppRouter />
          <LevelUpOverlay />
          <VisionaryChatbox />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
