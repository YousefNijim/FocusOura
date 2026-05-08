import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { API_BASE } from "@/utils/api";


/**
 * Persistent banner that appears when the API server is unreachable.
 * Polls every 10 seconds to auto-dismiss when connectivity is restored.
 * Uses HEAD /api/ — a network error = server down, 4xx/5xx = server up (just auth issue).
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // HEAD request: network error = server unreachable; any HTTP status = server alive
        await fetch(`${API_BASE}/api/`, { method: "HEAD", cache: "no-store" });

        // Any response (even 404/401) means the server IS reachable
        if (cancelled) return;
        setIsOffline(false);
        setTimeout(() => { if (!cancelled) setVisible(false); }, 1200);
      } catch {
        // Network error = server is down / unreachable
        if (cancelled) return;
        setIsOffline(true);
        setVisible(true);
      }
    }

    check();
    const interval = setInterval(check, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[200] transition-all duration-500 ${
        isOffline ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-medium justify-center shadow-lg">
        <WifiOff size={15} className="flex-shrink-0" />
        <span>Offline — data may not save. Reconnecting…</span>
      </div>
    </div>
  );
}
