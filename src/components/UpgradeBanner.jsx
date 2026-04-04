import { useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { AuthContext } from "../App";
import { isFounder } from "../lib/founder";

/**
 * Global upgrade banner: "Upgrade to Lite — Faster AI, Saving, More Refinements".
 * Rendered in Layout on all pages except /settings.
 * Hidden for founders and users already on Lite plan.
 */
export default function UpgradeBanner() {
  const { user } = useContext(AuthContext);
  const isLite = user?.plan === "lite";
  const founder = isFounder(user);

  if (isLite || founder) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-3 rounded-lg bg-gradient-to-r from-orange-900/30 to-orange-950/20 border border-orange-500/30 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-400" />
        <span className="text-sm">Upgrade to Lite — Faster AI, Saving, More Refinements</span>
      </div>
      <Link to="/pricing">
        <Button size="sm" variant="outline">View Plans</Button>
      </Link>
    </motion.div>
  );
}
