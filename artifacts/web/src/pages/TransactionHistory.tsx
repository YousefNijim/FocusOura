import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Coins, ArrowUpRight, ArrowDownLeft, Trophy, ShoppingBag, Swords, ChevronLeft } from "lucide-react";
import { fetchApi } from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  reward:          { icon: <ArrowUpRight size={15} />,   color: "text-green-500",     label: "Focus Reward" },
  debit:           { icon: <ShoppingBag size={15} />,    color: "text-red-500",       label: "Purchase" },
  purchase:        { icon: <ShoppingBag size={15} />,    color: "text-red-500",       label: "Purchase" },
  challenge_stake: { icon: <Swords size={15} />,         color: "text-orange-500",    label: "Challenge Stake" },
  challenge_win:   { icon: <Trophy size={15} />,         color: "text-yellow-500",    label: "Challenge Win" },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: <Coins size={15} />, color: "text-muted-foreground", label: type };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1)   return "Just now";
  if (diffH < 24)  return `${Math.floor(diffH)}h ago`;
  if (diffH < 48)  return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TransactionHistory() {
  const navigate = useNavigate();
  const { wallet } = useUser();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi<Transaction[]>("/wallet/transactions")
      .then(setTxns)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const totalEarned = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent  = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <MobileLayout>
      <div className="px-5 pt-5 pb-28 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Coin History</h1>
            <p className="text-xs text-muted-foreground">All your transactions</p>
          </div>
        </div>

        {/* Balance summary */}
        <div className="glass rounded-2xl p-5 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl">🪙</span>
              <span className="text-2xl font-bold text-foreground">{wallet?.balance ?? 0}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-lg font-bold text-green-600">+{totalEarned}</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-lg font-bold text-red-500">-{totalSpent}</p>
            </div>
          </div>
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-4xl">📡</div>
            <p className="font-semibold">Couldn't load history</p>
            <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
          </div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">🪙</div>
            <p className="font-semibold">No transactions yet</p>
            <p className="text-sm text-muted-foreground">Complete a focus session to earn your first coins!</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wide">
              {txns.length} transaction{txns.length !== 1 ? "s" : ""}
            </p>
            {txns.map((t, i) => {
              const meta = getTypeMeta(t.type);
              const isPositive = t.amount > 0;
              return (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isPositive ? "bg-green-500/10" : "bg-red-500/10"
                  } ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                    <p className="text-[11px] text-muted-foreground">{meta.label} · {formatDate(t.createdAt)}</p>
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${isPositive ? "text-green-500" : "text-red-500"}`}>
                    {isPositive ? "+" : ""}{t.amount}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
