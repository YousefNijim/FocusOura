import { useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, VERIFY_BANNER_DISMISSED_KEY, VERIFICATION_REQUIRED_EVENT } from "@/utils/api";



export function VerificationBanner() {
  const { authUser, token, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(VERIFY_BANNER_DISMISSED_KEY) === "1");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // A dismissed banner comes back the moment the API refuses an action for
  // being unverified — that is when the user needs the explanation.
  useEffect(() => {
    const reveal = () => setDismissed(false);
    window.addEventListener(VERIFICATION_REQUIRED_EVENT, reveal);
    return () => window.removeEventListener(VERIFICATION_REQUIRED_EVENT, reveal);
  }, []);

  // Don't render for verified users, unauthenticated users, or dismissed sessions
  if (!isAuthenticated || !authUser || authUser.emailVerified || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(VERIFY_BANNER_DISMISSED_KEY, "1");
    setDismissed(true);
  }

  function startCooldown() {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (!token || resendStatus === "loading" || cooldown > 0) return;
    setResendStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {

        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResendStatus("sent");
        startCooldown();
      } else {
        setResendStatus("error");
        setTimeout(() => setResendStatus("idle"), 3000);
      }
    } catch {
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 3000);
    }
  }

  const resendLabel =
    resendStatus === "loading" ? "Sending…" :
    resendStatus === "sent"    ? (cooldown > 0 ? `Resend in ${cooldown}s` : "Sent!") :
    resendStatus === "error"   ? "Failed — try again" :
    cooldown > 0               ? `Resend in ${cooldown}s` :
                                 "Resend email";

  return (
    // Sticky rather than fixed: fixed took the banner out of the flow, so it
    // covered the top of every page — "Welcome, YOUSEF" and "My Garden" were
    // both sliced through. Sticky keeps it pinned while scrolling and still
    // reserves its own height.
    <div className="sticky top-0 inset-x-0 z-[100]">
      <div className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 text-sm font-medium shadow-md">
        <Mail size={15} className="flex-shrink-0 shrink-0" />
        <span className="flex-1 min-w-0 truncate">
          Please verify your email address to unlock all features.
        </span>
        <button
          onClick={handleResend}
          disabled={resendStatus === "loading" || cooldown > 0}
          className="shrink-0 text-xs font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60 transition"
        >
          {resendLabel}
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 ml-1 opacity-80 hover:opacity-100 transition"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
