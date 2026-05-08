import { useState } from "react";
import { Sprout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANT_CATALOG } from "@/constants/plants";

const PLANT_TRAITS: Record<string, string> = {
  orchid:    "Exotic & rare — just like your dedication",
  fern:      "Resilient & lush, thrives under pressure",
  succulent: "Stores energy for when it matters most",
  rose:      "Classic beauty with thorny determination",
  bamboo:    "Swift grower — bends but never breaks",
  lily:      "Pure elegance under challenging conditions",
  cactus:    "Tough and resilient, just like you on exam day",
  lavender:  "Calm and focused — the zen master",
};

interface StepTwoProps {
  subjectName: string;
  accentColor: string;
  onNext: (subjectId: string, plantType: string) => void;
}

export default function StepTwo({ subjectName, accentColor, onNext }: StepTwoProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const traitKey = hovered ?? selected;

  async function handleSubmit() {
    if (!selected) { setError("Choose a plant to continue"); return; }
    setError("");
    setLoading(true);
    try {
      const result = await fetchApi<{ id: string; plantId: string }>("/subjects", {
        method: "POST",
        body: JSON.stringify({ name: subjectName, accentColor, plantType: selected }),
      });
      onNext(result.id, selected);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-strong rounded-3xl p-6 shadow-2xl">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="text-center mb-4">
        <motion.div
          className="text-5xl mb-3 inline-block"
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.3 }}
        >
          🌿
        </motion.div>
        <h2 className="text-2xl font-serif text-foreground">Choose your study companion</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Your plant grows every time you focus.
          Take care of it — it needs you.
        </p>
      </div>

      {/* ── Trait display — fixed height so layout doesn't jump ────── */}
      <div className="h-8 mb-3 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {traitKey && (
            <motion.p
              key={traitKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="text-xs text-primary font-medium italic text-center px-2"
            >
              "{PLANT_TRAITS[traitKey] ?? ""}"
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Plant grid — game item selection feel ─────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {PLANT_CATALOG.map((plant, idx) => {
          const isSelected = selected === plant.id;
          return (
            <motion.button
              key={plant.id}
              type="button"
              onClick={() => { setSelected(plant.id); setError(""); }}
              onHoverStart={() => setHovered(plant.id)}
              onHoverEnd={() => setHovered(null)}
              // Staggered entrance
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, type: "spring", stiffness: 260, damping: 20 }}
              // Tactile tap
              whileTap={{ scale: 0.88 }}
              className={cn(
                "relative flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                  : "border-transparent hover:border-border hover:bg-card/60"
              )}
            >
              {/* Selected indicator dot */}
              <AnimatePresence>
                {isSelected && (
                  <motion.span
                    key="dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 16 }}
                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary"
                  />
                )}
              </AnimatePresence>

              {/* Plant image */}
              <motion.img
                src={plant.image}
                alt={plant.name}
                className="w-12 h-12 object-contain"
                // Bounce/pulse when selected
                animate={isSelected
                  ? { scale: [1, 1.18, 0.95, 1.08, 1], y: [0, -4, 0] }
                  : { scale: 1, y: 0 }}
                transition={isSelected
                  ? { duration: 0.45, times: [0, 0.3, 0.55, 0.75, 1] }
                  : { duration: 0.15 }}
                // Gentle hover lift
                whileHover={!isSelected ? { y: -3, scale: 1.05 } : {}}
              />

              <span className="text-[10px] font-medium text-foreground leading-tight text-center">
                {plant.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {error && (
        <p className="text-destructive text-xs mt-3 text-center">{error}</p>
      )}

      <Button
        className="w-full mt-4 shadow-lg shadow-primary/20"
        onClick={handleSubmit}
        disabled={loading || !selected}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            Creating…
          </span>
        ) : (
          <>
            <Sprout size={16} className="mr-2" />
            This is my plant →
          </>
        )}
      </Button>
    </div>
  );
}
