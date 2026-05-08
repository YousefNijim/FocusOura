import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";

interface OnboardingProps {
  onComplete: () => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -64 : 64, opacity: 0 }),
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dir, setDir] = useState(1);

  // Data collected across steps
  const [subjectName, setSubjectName] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [plantType, setPlantType] = useState("");

  function advance(next: 1 | 2 | 3, direction = 1) {
    setDir(direction);
    setStep(next);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3] as const).map((n) => (
          <div
            key={n}
            className={`rounded-full transition-all duration-300 ${
              n === step
                ? "w-8 h-1.5 bg-primary"
                : n < step
                  ? "w-4 h-1.5 bg-primary/50"
                  : "w-4 h-1.5 bg-border"
            }`}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">{step} / 3</span>
      </div>

      {/* Step card — AnimatePresence swaps on step change */}
      <div className="w-full max-w-md overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 1 && (
              <StepOne
                onNext={(name, color) => {
                  setSubjectName(name);
                  setAccentColor(color);
                  advance(2, 1);
                }}
              />
            )}
            {step === 2 && (
              <StepTwo
                subjectName={subjectName}
                accentColor={accentColor}
                onNext={(sId, pType) => {
                  setSubjectId(sId);
                  setPlantType(pType);
                  advance(3, 1);
                }}
              />
            )}
            {step === 3 && (
              <StepThree
                subjectName={subjectName}
                subjectId={subjectId}
                plantType={plantType}
                onComplete={onComplete}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
