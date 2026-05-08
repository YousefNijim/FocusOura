import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { PLANT_CATALOG } from "@/constants/plants";

// ── Lightweight confetti burst (no external dep) ───────────────────────────
const CONFETTI_COLORS = [
  "hsl(152 45% 40%)",  // primary green
  "hsl(36 60% 55%)",   // accent amber
  "hsl(45 90% 55%)",   // coin gold
  "hsl(0 65% 65%)",    // coral
  "hsl(210 80% 60%)",  // blue
  "hsl(280 60% 65%)",  // violet
];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  size: number;
  life: number;
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let rafId: number;
    const particles: Particle[] = [];

    // Burst 80 particles from the centre-top
    const cx = canvas.width / 2;
    for (let i = 0; i < 80; i++) {
      const angle = (Math.PI / 180) * (Math.random() * 360);
      const speed = 2 + Math.random() * 6;
      particles.push({
        id: i,
        x: cx,
        y: canvas.height * 0.28,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        size: 5 + Math.random() * 7,
        life: 1,
      });
    }

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const p of particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.98; // air resistance
        p.rotation += p.rotationSpeed;
        p.life = Math.max(0, p.life - 0.012);

        if (p.life <= 0 || p.y > canvas.height + 20) continue;
        alive = true;

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (alive) rafId = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl"
    />
  );
}

// ── Component ─────────────────────────────────────────────────────────────
interface StepThreeProps {
  subjectName: string;
  subjectId: string;
  plantType: string;
  onComplete: () => void;
}

export default function StepThree({ subjectName, subjectId, plantType, onComplete }: StepThreeProps) {
  const navigate = useNavigate();
  const { updateAuthUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const plant = PLANT_CATALOG.find((p) => p.id === plantType) ?? PLANT_CATALOG[0];

  async function markComplete() {
    await fetchApi("/users/onboarding-complete", { method: "PATCH" });
    updateAuthUser({ onboardingCompleted: true });
  }

  async function handleStartSession() {
    setLoading(true);
    try {
      await markComplete();
      onComplete();
      navigate("/focus", { state: { subjectId } });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleExplore() {
    try { await markComplete(); } catch { /* Don't block dismissal on error */ }
    onComplete();
  }

  return (
    <div className="relative glass-strong rounded-3xl p-6 shadow-2xl text-center overflow-hidden">

      {/* ── Confetti burst (fires once when step mounts) ─────────── */}
      <Confetti />

      {/* ── Header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
        className="text-5xl mb-3 inline-block"
      >
        🎉
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-2xl font-serif text-foreground mb-1"
      >
        Your study space is ready!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="text-sm text-muted-foreground mb-5"
      >
        Now let's grow it
      </motion.p>

      {/* ── Summary card ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 18 }}
        className="bg-card rounded-2xl p-4 border border-border mb-6 text-left space-y-3"
      >
        {/* Subject row */}
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Subject created
            </p>
            <p className="text-sm font-semibold text-foreground">{subjectName}</p>
          </div>
        </div>

        {/* Plant row — with growing animation */}
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Plant selected
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Growing animation: scales from 0.4 to 1 slowly */}
              <motion.img
                src={plant.image}
                alt={plant.name}
                className="w-8 h-8 object-contain"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.45,
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1], // easeOutExpo — feels like growing
                }}
              />
              <p className="text-sm font-semibold text-foreground">{plant.name}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {error && <p className="text-destructive text-xs mb-3">{error}</p>}

      {/* ── CTA button — gentle pulse to draw attention ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {/* Pulse ring behind button */}
        <div className="relative">
          {!loading && (
            <motion.span
              className="absolute inset-0 rounded-full bg-primary/30 pointer-events-none"
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <Button
            className="w-full relative shadow-lg shadow-primary/25"
            onClick={handleStartSession}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Starting…
              </span>
            ) : (
              <>
                <Rocket size={16} className="mr-2" />
                Start my first session
              </>
            )}
          </Button>
        </div>
      </motion.div>

      <button
        type="button"
        onClick={handleExplore}
        disabled={loading}
        className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors w-full disabled:opacity-50"
      >
        Explore the app first
      </button>
    </div>
  );
}
