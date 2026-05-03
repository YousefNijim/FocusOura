import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SLIDES = [
  {
    emoji: "🌱",
    bg: "linear-gradient(170deg, #1A5C35 0%, #2D6A4F 40%, #3D8B68 100%)",
    title: "Grow Your Focus,\nOne Seed at a Time",
    body: "Build better study habits, track your progress, and watch your virtual garden bloom.",
  },
  {
    emoji: "🐱",
    bg: "linear-gradient(170deg, #5C3D8F 0%, #6B4FA0 40%, #8B6FBF 100%)",
    title: "Your Study Pet\nKeeps You Company",
    body: "Unlock companions that grow happier as you study more. They'll miss you if you skip!",
  },
  {
    emoji: "🏆",
    bg: "linear-gradient(170deg, #B45309 0%, #D97706 40%, #F59E0B 100%)",
    title: "Challenge Friends,\nEarn Coins",
    body: "Compete in weekly study challenges, collect coins, and unlock exclusive pets & cosmetics.",
  },
  {
    emoji: "🎵",
    bg: "linear-gradient(170deg, #1E3A5F 0%, #2563EB 40%, #3B82F6 100%)",
    title: "Focus Deeper with\nAmbient Sound",
    body: "Rain, ocean, café, forest — pick a soundscape that helps you enter your flow state.",
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  function handleNext() {
    if (isLast) {
      localStorage.setItem("focusoura_onboarded", "true");
      navigate("/login", { replace: true });
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSkip() {
    localStorage.setItem("focusoura_onboarded", "true");
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden transition-all duration-700"
      style={{ background: slide.bg }}
    >
      {/* Skip button */}
      {!isLast && (
        <div className="flex justify-end px-6 pt-6">
          <button
            onClick={handleSkip}
            className="text-white/60 text-sm font-medium hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-4 pb-4">
        {/* Emoji illustration */}
        <div
          className="w-44 h-44 rounded-full flex items-center justify-center mb-8 transition-all duration-500"
          style={{ backgroundColor: "rgba(255,255,255,0.12)", fontSize: "80px" }}
        >
          {slide.emoji}
        </div>

        {/* Text */}
        <div className="text-center space-y-3 max-w-xs">
          <h1
            className="text-[1.75rem] font-bold text-white leading-snug"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {slide.title.split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 ? <br /> : ""}</span>
            ))}
          </h1>
          <p className="text-white/75 text-base leading-relaxed">
            {slide.body}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-12 flex flex-col items-center gap-4 max-w-sm mx-auto w-full">
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 h-2.5 bg-white"
                  : "w-2.5 h-2.5 bg-white/40"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-white font-semibold text-base active:scale-95 transition shadow-lg"
          style={{ color: "#1A5C35" }}
        >
          {isLast ? "Get Started" : "Next"}
        </button>

        {isLast && (
          <button
            onClick={() => {
              localStorage.setItem("focusoura_onboarded", "true");
              navigate("/register", { replace: true });
            }}
            className="text-white/70 text-sm font-medium"
          >
            Create new account
          </button>
        )}
      </div>
    </div>
  );
}
