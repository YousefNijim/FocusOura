import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useSession } from "@/context/SessionContext";
import { useAuth } from "@/context/AuthContext";
import { PLANT_CATALOG } from "@/constants/plants";
import { Timer, Zap } from "lucide-react";

const BANNER_DISMISSED_KEY = "focusoura_verify_banner_dismissed";

interface MobileLayoutProps {
  children: ReactNode;
}

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ActiveSessionBar({ bannerOffset }: { bannerOffset: boolean }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { session, elapsedSecs, timeLeft } = useSession();

  if (!session || location.pathname === "/focus") return null;

  const plant    = PLANT_CATALOG[session.plantIndex] ?? PLANT_CATALOG[0];
  const display  = session.mode === "countdown" ? formatTime(Math.max(0, timeLeft)) : formatTime(elapsedSecs);
  const isPaused = session.state === "paused";

  return (
    <button
      onClick={() => navigate("/focus")}
      className={`fixed left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-4 pt-2 pb-1 ${bannerOffset ? "top-10" : "top-0"}`}
    >
      <div className="glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-3 border border-primary/20 shadow-lg shadow-primary/10">
        <div className="relative flex-shrink-0">
          <img src={plant.image} alt={plant.name} className="w-9 h-9 object-contain" />
          {!isPaused && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-background animate-pulse" />
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs text-muted-foreground leading-none mb-0.5">
            {isPaused ? "Session Paused" : "Session Running"}
          </p>
          <p className="text-sm font-semibold text-foreground leading-none">{plant.name}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {session.mode === "countdown" ? (
            <Timer size={14} className="text-primary" />
          ) : (
            <Zap size={14} className="text-primary" />
          )}
          <span className="text-base font-bold text-primary font-mono">{display}</span>
        </div>
        <div className="text-[10px] text-muted-foreground border-l border-border pl-2 leading-tight">
          Tap<br/>to view
        </div>
      </div>
    </button>
  );
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const { session } = useSession();
  const { isAuthenticated, authUser } = useAuth();
  const location    = useLocation();
  const [bannerDismissed] = useState(() => sessionStorage.getItem(BANNER_DISMISSED_KEY) === "1");

  const showBar    = !!session && location.pathname !== "/focus";
  const showBanner = isAuthenticated && !!authUser && !authUser.emailVerified && !bannerDismissed;

  let topPadding = "";
  if (showBanner && showBar) topPadding = "pt-[104px]";
  else if (showBanner)       topPadding = "pt-10";
  else if (showBar)          topPadding = "pt-16";

  return (
    <div className="min-h-screen max-w-md mx-auto relative bg-background">
      <ActiveSessionBar bannerOffset={showBanner} />
      <main className={`pb-24 min-h-screen ${topPadding}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
