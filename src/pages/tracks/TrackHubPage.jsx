import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Palette, TrendingUp, Mic2, Heart, ChevronRight } from 'lucide-react';
import { TRACKS } from '../../data/tracksData';

const ICON_MAP = { Cpu, Palette, TrendingUp, Mic2, Heart };

function TrackCard({ track, index }) {
  const navigate = useNavigate();
  const Icon = ICON_MAP[track.icon] ?? Cpu;

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/tracks/${track.id}`)}
      className={`group relative text-left w-full rounded-2xl bg-card border border-border overflow-hidden p-6 flex flex-col gap-4 transition-shadow hover:shadow-lg hover:shadow-black/30 ${track.colors.ring} focus:outline-none focus:ring-2`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
    >
      {/* Color accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${track.colors.bgSolid}`} />

      <div className="flex items-start gap-4 pl-3">
        <div className={`p-2.5 rounded-xl ${track.colors.bg} shrink-0`}>
          <Icon className={`w-5 h-5 ${track.colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-tight">{track.name}</p>
          <p className={`text-sm mt-0.5 ${track.colors.text}`}>{track.tagline}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
      </div>

      <div className="pl-3 flex flex-wrap gap-1.5">
        {track.skills.slice(0, 3).map((skill) => (
          <span key={skill} className={`text-sm md:text-[11px] font-medium px-2 py-0.5 rounded-full ${track.colors.badge}`}>
            {skill}
          </span>
        ))}
      </div>

      <p className="pl-3 text-sm md:text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {track.description}
      </p>
    </motion.button>
  );
}

export default function TrackHubPage() {
  return (
    <div className="min-h-full max-w-3xl mx-auto p-4 sm:p-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Choose Your Path</h1>
        <p className="mt-2 text-muted-foreground text-base">
          Build real skills. Build a real portfolio.
        </p>
      </motion.div>

      {/* Track grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TRACKS.map((track, i) => (
          <TrackCard key={track.id} track={track} index={i} />
        ))}
      </div>
    </div>
  );
}
