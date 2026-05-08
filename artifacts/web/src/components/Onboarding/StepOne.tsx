import { useState } from "react";
import { Leaf, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = [
  { hex: "#3D7A5C", label: "Forest" },
  { hex: "#4A90D9", label: "Sky" },
  { hex: "#9B59B6", label: "Violet" },
  { hex: "#E67E22", label: "Amber" },
  { hex: "#E74C3C", label: "Coral" },
  { hex: "#1ABC9C", label: "Teal" },
  { hex: "#F1C40F", label: "Gold" },
  { hex: "#E91E8A", label: "Rose" },
];

// Floating emoji decorations for the hero illustration
const FLOATERS = [
  { emoji: "🌱", style: { top: "10%",  left: "12%",  animationDelay: "0s",    fontSize: 28 } },
  { emoji: "🍃", style: { top: "8%",   right: "14%", animationDelay: "0.7s",  fontSize: 22 } },
  { emoji: "✨", style: { top: "60%",  left: "6%",   animationDelay: "1.2s",  fontSize: 18 } },
  { emoji: "🌿", style: { bottom: "8%", right: "10%", animationDelay: "0.4s", fontSize: 24 } },
  { emoji: "🌸", style: { bottom: "12%", left: "18%", animationDelay: "1.6s", fontSize: 20 } },
];

interface StepOneProps {
  onNext: (name: string, accentColor: string) => void;
}

export default function StepOne({ onNext }: StepOneProps) {
  const { user } = useUser();
  const displayName = user?.displayName ?? "Student";

  const [name, setName]                   = useState("");
  const [selectedColor, setSelectedColor] = useState(ACCENT_COLORS[0].hex);
  const [error, setError]                 = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Subject name is required"); return; }
    if (trimmed.length > 50) { setError("Keep it under 50 characters"); return; }
    setError("");
    onNext(trimmed, selectedColor);
  }

  return (
    <div className="glass-strong rounded-3xl p-6 shadow-2xl">

      {/* ── Hero Illustration ─────────────────────────────────────── */}
      <div className="relative flex items-center justify-center mb-6 h-36 select-none">
        {/* Orbital ring */}
        <div className="absolute w-28 h-28 rounded-full border-2 border-dashed border-primary/20 animate-spin"
          style={{ animationDuration: "18s", animationTimingFunction: "linear" }} />
        {/* Inner glow ring */}
        <div className="absolute w-20 h-20 rounded-full bg-primary/8 animate-pulse-glow" />
        {/* Centre sprout */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          className="relative z-10 w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-5xl"
        >
          🌱
        </motion.div>
        {/* Floating emoji decorations */}
        {FLOATERS.map(({ emoji, style }, i) => (
          <motion.span
            key={i}
            className="absolute animate-float pointer-events-none"
            style={{ ...style, animationDelay: style.animationDelay }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 200 }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>

      {/* ── Heading ───────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif text-foreground">
          Welcome, {displayName}!
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          FocusOura turns your study sessions into a growing garden.
          Every minute of focus makes your plants bloom.
        </p>
        <p className="text-xs text-primary font-medium mt-3 tracking-wide uppercase">
          Every great student starts here
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Subject Name Input ────────────────────────────────────── */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Subject Name
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="e.g. Mathematics, History, Biology…"
            autoFocus
          />
          {error && <p className="text-destructive text-xs mt-1">{error}</p>}
        </div>

        {/* ── Live Subject Preview (animates in as user types) ──────── */}
        <AnimatePresence>
          {name.trim() && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <motion.div
                className="w-4 h-4 rounded-full flex-shrink-0 shadow-md"
                style={{ backgroundColor: selectedColor }}
                animate={{ backgroundColor: selectedColor }}
                transition={{ duration: 0.25 }}
              />
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {name.trim()}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Preview
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Color Picker (tactile — ring + checkmark + bounce) ────── */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Accent Color
          </label>
          <div className="flex gap-2.5 flex-wrap">
            {ACCENT_COLORS.map(({ hex, label }) => {
              const isSelected = selectedColor === hex;
              return (
                <motion.button
                  key={hex}
                  type="button"
                  onClick={() => setSelectedColor(hex)}
                  whileTap={{ scale: 0.85 }}
                  animate={isSelected ? { scale: [1, 1.22, 1.08] } : { scale: 1 }}
                  transition={isSelected ? { duration: 0.3, times: [0, 0.4, 1] } : { duration: 0.15 }}
                  className="relative w-9 h-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: hex }}
                  aria-label={`Select ${label}`}
                  title={label}
                >
                  {/* Outer ring on selected */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        key="ring"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          boxShadow: `0 0 0 3px hsl(var(--background)), 0 0 0 5px ${hex}`,
                        }}
                      />
                    )}
                  </AnimatePresence>
                  {/* Checkmark */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Check size={14} className="text-white drop-shadow-sm" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        <Button type="submit" className="w-full mt-2 shadow-lg shadow-primary/20">
          <Leaf size={16} className="mr-2" />
          Let's grow →
        </Button>
      </form>
    </div>
  );
}
