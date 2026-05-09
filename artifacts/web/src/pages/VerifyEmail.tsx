import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Leaf, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/utils/api";


type Status = "loading" | "success" | "error" | "no-token";
type ResendStatus = "idle" | "loading" | "sent" | "error" | "rate-limited";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token: authToken, isAuthenticated, updateAuthUser } = useAuth();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>(token ? "loading" : "no-token");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [resendError, setResendError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const called = useRef(false);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  useEffect(() => {
    if (!token || called.current) return;
    called.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`);

        if (res.ok) {
          updateAuthUser({ emailVerified: true });
          setStatus("success");
          setTimeout(() => navigate("/", { replace: true }), 2500);
        } else {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error ?? "Verification link is invalid or has expired.");
          setStatus("error");
        }
      } catch {
        setErrorMsg("Could not connect to the server. Please try again.");
        setStatus("error");
      }
    })();
  }, [token]);

  function startCooldown() {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (!isAuthenticated || !authToken) return;
    setResendStatus("loading");
    setResendError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {

        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setResendStatus("sent");
        startCooldown();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setResendStatus("rate-limited");
          setResendError(data.error ?? "Too many requests. Please wait before trying again.");
        } else {
          setResendStatus("error");
          setResendError(data.error ?? "Failed to send verification email.");
        }
      }
    } catch {
      setResendStatus("error");
      setResendError("Could not connect to the server. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-primary)] mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-[var(--color-text-primary)]">FocusOura</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Email Verification</p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-lg text-center space-y-4">
          {status === "loading" && (
            <>
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
              <p className="text-[var(--color-text-secondary)] text-sm">Verifying your email…</p>
            </>
          )}

          {status === "no-token" && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-red-400" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Invalid Link</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                This verification link is missing or broken. Check your email for the correct link.
              </p>
              {isAuthenticated ? (
                <button
                  onClick={handleResend}
                  disabled={resendStatus === "loading" || resendStatus === "sent" || cooldown > 0}
                  className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-dark)] active:scale-95 transition disabled:opacity-60"
                >
                  {resendStatus === "loading" ? "Sending…" :
                   resendStatus === "sent" ? "Email sent!" :
                   cooldown > 0 ? `Resend in ${cooldown}s` :
                   "Send a new verification email"}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-block font-semibold text-[var(--color-primary)] hover:underline text-sm"
                >
                  Sign in to resend →
                </Link>
              )}
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Email Verified!</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Welcome to Focusoura 🌱 Redirecting you now…
              </p>
              <div className="w-5 h-5 mx-auto rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-red-400" />
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Link Expired</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">{errorMsg}</p>

              {isAuthenticated ? (
                <div className="space-y-3">
                  {(resendStatus === "error" || resendStatus === "rate-limited") && resendError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-left">
                      {resendError}
                    </div>
                  )}
                  {resendStatus === "sent" && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-xs text-left">
                      A new verification email has been sent. Check your inbox.
                    </div>
                  )}
                  <button
                    onClick={handleResend}
                    disabled={resendStatus === "loading" || resendStatus === "sent" || cooldown > 0}
                    className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-dark)] active:scale-95 transition disabled:opacity-60"
                  >
                    {resendStatus === "loading" ? "Sending…" :
                     resendStatus === "sent" ? "Email sent!" :
                     cooldown > 0 ? `Resend in ${cooldown}s` :
                     "Send a new verification email"}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-block font-semibold text-[var(--color-primary)] hover:underline text-sm"
                >
                  Sign in to resend →
                </Link>
              )}
            </>
          )}
        </div>

        {status !== "success" && (
          <p className="text-center text-[var(--color-text-secondary)] mt-5 text-sm">
            {isAuthenticated ? (
              <Link to="/" className="font-semibold text-[var(--color-primary)] hover:underline">
                Go to dashboard →
              </Link>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
                  Sign In
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
