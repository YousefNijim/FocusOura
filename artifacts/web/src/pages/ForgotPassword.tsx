import { useState } from "react";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // intentionally swallowed — always show the same message
    } finally {
      setLoading(false);
      setSubmitted(true);
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
          <p className="text-[var(--color-text-secondary)] mt-1">Reset your password</p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">Forgot Password</h2>

          {submitted ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">
                If this email exists, a reset link has been sent. Check your inbox.
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSubmitted(false)}
                  className="font-semibold text-[var(--color-primary)] hover:underline"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-white/60 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-white font-semibold text-base hover:bg-[var(--color-primary-dark)] active:scale-95 transition disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
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
