import { useEffect, useState, useContext } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { CheckCircle2, Crown, ArrowRight, Loader2 } from "lucide-react";
import { AuthContext } from "../App";
import { supabase } from "../services/supabaseClient";

const PRODUCT_LABELS = {
  coins_100: "100 coins have been added to your account.",
  coins_500: "500 coins have been added to your account.",
  coins_2000: "2,000 coins have been added to your account.",
  founder_bronze: "Your Bronze Founder Pass is now active.",
  founder_silver: "Your Silver Founder Pass is now active.",
  founder_gold: "Your Gold Founder Pass is now active.",
};

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const product = searchParams.get("product");
  const { user, setUser } = useContext(AuthContext);
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Re-fetch user profile from Supabase to pick up coins/founder_tier changes
  useEffect(() => {
    if (!user?.id) return;
    const refreshProfile = async () => {
      setRefreshing(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        if (!error && data) {
          const updated = { ...user, ...data };
          setUser(updated);
          localStorage.setItem("auth_user", JSON.stringify(updated));
        }
      } catch {
        // Supabase not yet configured — silently skip
      } finally {
        setRefreshing(false);
      }
    };
    refreshProfile();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFounder = product?.startsWith("founder_");
  const heading = isFounder ? "You're a Founder! 🎉" : "Purchase Complete! 🎉";
  const subtext = PRODUCT_LABELS[product] ?? "Your purchase was successful.";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={visible ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={visible ? { scale: 1 } : {}}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35 }}
        >
          <h1 className="text-3xl font-bold mb-2">{heading}</h1>
          <p className="text-muted-foreground text-lg mb-2">{subtext}</p>
          {isFounder && (
            <p className="text-muted-foreground text-sm mb-4">
              Your exclusive perks and badge are now active. Keep an eye on your email for updates.
            </p>
          )}

          {refreshing && (
            <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Updating your account…
            </p>
          )}

          {sessionId && (
            <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted rounded-lg px-3 py-2 inline-block">
              Order ID: {sessionId}
            </p>
          )}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white">
            <Link to="/dashboard">
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/store">
              <Crown className="w-4 h-4 mr-2" /> Back to Store
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
