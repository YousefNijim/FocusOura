import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Leaf } from "lucide-react";

export default function ResetPassword() {
  const [searchParams]                        = useSearchParams();
  const navigate                              = useNavigate();
  const token                                 = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [error, setError]                     = useState("");

  // Missing token — link was opened without ?token=
  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-3xl p-6 shadow-lg text-center space-y-4">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Invalid Link</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              This reset link is missing or broken. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block font-semibold text-[var(--color-primary)] hover:underline"
            >
              Request a new reset link →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isExpiredError = error.toLowerCase().includes("expired") || error.toLowerCase().includes("invalid");

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-primary)] mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-[var(--color-text-primary)]">FocusOura</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Set a new password</p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-5">New Password</h2>

          {success ? (
            <div className="space-y-3 text-center">
              <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">
                Password reset! Redirecting to sign in...
              </div>
              <div className="w-5 h-5 mx-auto rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                  {isExpiredError && (
                    <div className="mt-1.5">
                      <Link to="/forgot-password" className="font-semibold hover:underline">
                        Request a new link →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 rounded-2xl border border-[var(--color-border)] bg-white/60 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition"
                    >
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-white/60 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-semibold text-base hover:bg-[var(--color-primary-dark)] active:scale-95 transition disabled:opacity-60"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[var(--color-text-secondary)] mt-5 text-sm">
          Remember your password?{" "}
          <Link to="/login" className="font-semibold text-[var(--color-primary)] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
