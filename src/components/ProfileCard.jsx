import { useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
import { Download, ExternalLink, Flame, Star, CheckSquare, Briefcase } from "lucide-react";
import { Button } from "./ui/button";
import { RANK_COLORS } from "../styles/ranks";
import { AuthContext } from "../App";

// Map XP to rank key
function xpToRank(xp = 0) {
  if (xp >= 15000) return "S";
  if (xp >= 6000) return "A";
  if (xp >= 2000) return "B";
  if (xp >= 500) return "C";
  if (xp >= 100) return "D";
  return "E";
}

// XP thresholds per rank tier
const RANK_XP = {
  E: { min: 0,     max: 100 },
  D: { min: 100,   max: 500 },
  C: { min: 500,   max: 2000 },
  B: { min: 2000,  max: 6000 },
  A: { min: 6000,  max: 15000 },
  S: { min: 15000, max: 15000 },
};

function nextRankKey(rank) {
  const order = ["E", "D", "C", "B", "A", "S"];
  const idx = order.indexOf(rank);
  return order[Math.min(idx + 1, order.length - 1)];
}

export default function ProfileCard({ profile, guilds = [], viewOnly = false }) {
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const { user: authUser } = useContext(AuthContext);

  const data = profile || authUser || {};
  const xp = data.xp ?? 0;
  const rank = xpToRank(xp);
  const rankMeta = RANK_COLORS[rank];
  const next = nextRankKey(rank);
  const nextMeta = RANK_COLORS[next];
  const { min, max } = RANK_XP[rank];
  const progress = max === min ? 100 : Math.min(100, ((xp - min) / (max - min)) * 100);

  // Stat radar — derive from profile data if available, otherwise mock
  const radarData = [
    { axis: "Tech",     value: data.stat_tech     ?? Math.round((xp / 15000) * 80 + 10) },
    { axis: "Design",   value: data.stat_design   ?? Math.round((xp / 15000) * 60 + 10) },
    { axis: "Content",  value: data.stat_content  ?? Math.round((xp / 15000) * 70 + 10) },
    { axis: "Business", value: data.stat_business ?? Math.round((xp / 15000) * 55 + 10) },
    { axis: "Impact",   value: data.stat_impact   ?? Math.round((xp / 15000) * 65 + 10) },
  ];

  const handleExport = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0f1117",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${data.name ?? "profile"}-visionary-arc.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const visibleGuilds = guilds.slice(0, 3);
  const extraGuilds = guilds.length > 3 ? guilds.length - 3 : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`profile-card rank-glow-${rank}`}
        style={{
          minHeight: 520,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          borderColor: rankMeta.color,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Rank badge */}
          <div
            className="badge-rank lg"
            data-rank={rank}
            style={{ borderRadius: 12 }}
          >
            {rank}
          </div>

          {/* Username + tier */}
          <div style={{ textAlign: "center", flex: 1, padding: "0 12px" }}>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: "var(--text-primary)" }}>
              {data.name ?? "Student"}
            </p>
            <p style={{ fontSize: 11, color: rankMeta.color, margin: 0, fontWeight: 600 }}>
              {rankMeta.label} · Lv {data.level ?? 1}
            </p>
          </div>

          {/* Guild badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {visibleGuilds.map((g, i) => (
              <div
                key={i}
                title={g.name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: g.color ? `${g.color}22` : "#ffffff11",
                  border: `1px solid ${g.color ?? "#ffffff33"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                {g.emoji ?? "⚔️"}
              </div>
            ))}
            {extraGuilds > 0 && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#ffffff11",
                  border: "1px solid #ffffff22",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "#aaa",
                  fontWeight: 600,
                }}
              >
                +{extraGuilds}
              </div>
            )}
          </div>
        </div>

        {/* XP bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "var(--text-secondary)" }}>
            <span>{xp.toLocaleString()} XP</span>
            <span style={{ color: "var(--text-muted)" }}>
              {rank !== "S" ? `→ ${nextMeta.label} @ ${RANK_XP[next].min.toLocaleString()}` : "MAX RANK"}
            </span>
          </div>
          <div className="xp-bar-track" style={{ height: 8 }}>
            <motion.div
              className="xp-bar-fill"
              data-rank={rank}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
        </div>

        {/* Radar chart */}
        <div className="radar-wrapper" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius={70}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke={rankMeta.color}
                fill={rankMeta.color}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-primary)" }}>
            <Flame size={15} style={{ color: "var(--rank-a)" }} />
            <span>Streak: <strong>{data.streak ?? 0} days</strong></span>
            {data.max_streak > 0 && (
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>· best {data.max_streak}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-primary)" }}>
              <CheckSquare size={14} style={{ color: "var(--rank-d)" }} />
              <span>Missions: <strong>{data.missions_completed ?? 0}</strong></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-primary)" }}>
              <Briefcase size={14} style={{ color: "var(--rank-c)" }} />
              <span>Portfolio: <strong>{data.portfolio_count ?? 0}</strong></span>
            </div>
          </div>
          {data.avg_rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-primary)" }}>
              <Star size={14} style={{ color: "var(--rank-s)" }} />
              <span>Avg Rating: <strong>{Number(data.avg_rating).toFixed(1)}</strong></span>
            </div>
          )}
        </div>

        {/* School + track */}
        {(data.school || data.track_primary) && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            {data.school && <span>{data.school}</span>}
            {data.school && data.track_primary && <span style={{ margin: "0 6px" }}>·</span>}
            {data.track_primary && <span style={{ color: rankMeta.color }}>{data.track_primary}</span>}
          </div>
        )}
      </motion.div>

      {/* Action buttons — below card, not captured in export */}
      {!viewOnly && (
        <div style={{ display: "flex", gap: 12 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download size={14} />
            Export PNG
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/portfolio")}
            className="flex items-center gap-2"
          >
            <ExternalLink size={14} />
            View Portfolio
          </Button>
        </div>
      )}
    </div>
  );
}
