import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Timer, Sprout, Swords, User, Lock } from "lucide-react";
import { useSession } from "@/context/SessionContext";

const navItems = [
  { icon: Home,   label: "Home",   path: "/" },
  { icon: Sprout, label: "Garden", path: "/garden" },
  { icon: Timer,  label: "Focus",  path: "/focus" },
  { icon: Swords, label: "Arena",  path: "/arena" },
  { icon: User,   label: "Profile",path: "/profile" },
];

export const BottomNav = () => {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { session } = useSession();
  const hasSession  = !!session;
  const onFocusPage = location.pathname === "/focus";
  const isRunning   = session?.state === "running";
  const isDeepFocus = session?.sessionTypeId === "deep_focus" && isRunning;

  const [showLockModal, setShowLockModal] = useState(false);
  const [pendingPath, setPendingPath]     = useState<string | null>(null);

  const handleNavClick = (path: string) => {
    if (isDeepFocus && path !== "/focus") {
      setPendingPath(path);
      setShowLockModal(true);
      return;
    }
    navigate(path);
  };

  return (
    <>
      {/* z-40, not z-50. Every modal in the app is `fixed inset-0 z-50`, and they
          all render inside <main>, which comes BEFORE this nav in the DOM — so at
          an equal z-index the nav won every tie and painted over all ten bottom
          sheets, clipping their last row and leaving the nav undimmed behind a
          dimmed overlay. Nothing else in the app sits between z-20 and z-50, so
          the nav still floats above all page content. */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass-strong rounded-t-2xl z-40">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon     = item.icon;
            const isFocus  = item.label === "Focus";

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 relative ${
                  isFocus
                    ? "bg-primary text-primary-foreground -mt-5 p-3 rounded-2xl shadow-lg shadow-primary/30"
                    : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={isFocus ? 24 : 20} strokeWidth={isActive || isFocus ? 2.5 : 2} />
                {!isFocus && (
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                    {item.label}
                  </span>
                )}
                {isFocus && hasSession && !onFocusPage && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {showLockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLockModal(false)} />
          <div className="relative w-full max-w-xs bg-background rounded-3xl p-6 text-center shadow-xl border border-border">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Lock size={26} className="text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Deep Focus Active</h2>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Leaving will interrupt your Deep Focus session. Stay focused — you're doing great!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 py-3 rounded-2xl bg-muted text-foreground font-semibold text-sm active:scale-95 transition"
              >
                Stay Focused
              </button>
              <button
                onClick={() => {
                  setShowLockModal(false);
                  if (pendingPath) navigate(pendingPath);
                  setPendingPath(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-sm active:scale-95 transition"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
