import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import apiService from "../services/apiService";

const REASON_LABELS = {
  quiz_completion: "Quiz completed",
  flashcard_session: "Flashcards studied",
  daily_login: "Daily login",
  streak_bonus: "Streak bonus",
  spend: "Spent",
  award: "Award",
};

export default function TransactionLog() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.coins
      .getTransactions()
      .then(setTxns)
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading...</p>;
  }

  if (txns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-muted/50 border border-dashed border-border">
        <Coins className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No coin activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">Complete quizzes, study flashcards, or log in daily to earn coins.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {txns.map((txn) => (
        <div key={txn.transaction_id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">{REASON_LABELS[txn.reason] ?? txn.reason}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(txn.timestamp).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold tabular-nums ${txn.amount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {txn.amount >= 0 ? "+" : ""}{txn.amount}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end tabular-nums">
              <Coins className="w-3 h-3" /> {txn.balance}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
