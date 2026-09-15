import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { buildSpecies, type EyeSpec, type MouthSpec } from "./species";

/**
 * The study companion.
 *
 * This file is the rig: breath, tilt, ear droop, tail, blink, and the face.
 * The animal itself comes from species.tsx, which draws each of the five from
 * its own skeleton. Keeping them apart is what stopped the five from being one
 * drawing with different ears.
 *
 * What makes it read as alive is not detail, it is reaction: a body that keeps
 * breathing while nothing happens, ears that fall when the news is bad, and a
 * blink on an uneven beat — an even one reads as a machine.
 */

export type PetState =
  | "focusing"
  | "dozing"
  | "celebrating"
  | "deflated"
  | "happy"
  | "neutral"
  | "lonely";

/** States where the eyes are already shut, so the blink loop stands down. */
const EYES_SHUT: ReadonlySet<PetState> = new Set<PetState>(["dozing"]);

const bodyVariants: Variants = {
  focusing:    { y: 0, scaleY: [1, 1.03, 1], transition: { scaleY: { duration: 4.5, repeat: Infinity, ease: "easeInOut" } } },
  dozing:      { y: 4, scaleY: [1, 1.05, 1], transition: { scaleY: { duration: 6, repeat: Infinity, ease: "easeInOut" } } },
  celebrating: { y: [0, -11, 0, -4, 0], scaleY: 1, transition: { duration: 0.6, ease: "easeOut" } },
  deflated:    { y: 3, scaleY: 0.97, transition: { duration: 0.35, ease: "easeOut" } },
  happy:       { y: 0, scaleY: [1, 1.04, 1], transition: { scaleY: { duration: 3, repeat: Infinity, ease: "easeInOut" } } },
  neutral:     { y: 1, scaleY: [1, 1.03, 1], transition: { scaleY: { duration: 4, repeat: Infinity, ease: "easeInOut" } } },
  lonely:      { y: 3, scaleY: 0.98, transition: { duration: 0.4, ease: "easeOut" } },
};

/** Resting head tilt, used as-is when motion is reduced. */
const HEAD_TILT: Record<PetState, number> = {
  focusing: 0, dozing: -9, celebrating: 0, deflated: 4, happy: 0, neutral: 0, lonely: -12,
};

const headVariants: Variants = {
  focusing:    { rotate: 0, y: 0 },
  dozing:      { rotate: -9, y: 3 },
  celebrating: { rotate: [0, -6, 6, 0], transition: { duration: 0.6, ease: "easeOut" } },
  deflated:    { rotate: 4, y: 3 },
  happy:       { rotate: [-2, 2, -2], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } },
  neutral:     { rotate: 0, y: 0 },
  lonely:      { rotate: -12, y: 2 },
};

/** How far the ears fall. Posture, not decoration — see earAnimation. */
const EAR_DROOP: Record<PetState, number> = {
  focusing: 0, dozing: 13, celebrating: 0, deflated: 21, happy: 0, neutral: 4, lonely: 19,
};

/**
 * Only the states that move get a keyframe; the rest hold their droop.
 *
 * The droop survives `prefers-reduced-motion`: it is posture, and a dejected
 * animal with alert ears is simply drawn wrong. What the preference removes is
 * the idle flick, which says nothing.
 */
function earAnimation(state: PetState, side: -1 | 1, reduced: boolean) {
  const rest = EAR_DROOP[state] * side;
  if (reduced) return { rotate: rest, transition: { duration: 0 } };
  if (state === "celebrating") {
    return { rotate: [rest, -12 * side, rest], transition: { duration: 0.5, ease: "easeOut" as const } };
  }
  if (state === "happy") {
    return { rotate: [rest, -7 * side, rest], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const } };
  }
  return { rotate: rest, transition: { duration: 0.35, ease: "easeOut" as const } };
}

const tailVariants: Variants = {
  focusing:    { rotate: [0, 6, 0], transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } },
  dozing:      { rotate: 16 },
  celebrating: { rotate: [0, 22, -10, 0], transition: { duration: 0.6, ease: "easeOut" } },
  deflated:    { rotate: 30 },
  happy:       { rotate: [0, 24, 0], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  neutral:     { rotate: [0, 8, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  lonely:      { rotate: 28 },
};

function Eyes({ spec, state, blinking }: { spec: EyeSpec; state: PetState; blinking: boolean }) {
  const [lx, rx] = spec.x;

  if (EYES_SHUT.has(state) || blinking) {
    const lid = (cx: number) =>
      `M${cx - spec.rx - 0.8} ${spec.y} Q${cx} ${spec.y - spec.rx - 1} ${cx + spec.rx + 0.8} ${spec.y}`;
    return (
      <g stroke="var(--p-eye)" strokeWidth={spec.rx * 0.6} strokeLinecap="round" fill="none">
        <path d={lid(lx)} />
        <path d={lid(rx)} />
      </g>
    );
  }

  // Focusing looks down at the timer; lonely looks away. Two pixels each, and
  // they change what the face is doing more than a new drawing would.
  const dx = state === "lonely" ? -1.6 : 0;
  const dy = state === "focusing" ? 1.4 : state === "deflated" ? 1.2 : 0;
  const squash = state === "deflated" || state === "lonely" ? 0.7 : 1;

  return (
    <g fill="var(--p-eye)">
      {[lx, rx].map((cx) => (
        <ellipse key={cx} cx={cx + dx} cy={spec.y + dy} rx={spec.rx} ry={spec.ry * squash} />
      ))}
      {[lx, rx].map((cx) => (
        <circle
          key={cx}
          cx={cx + dx + spec.rx * 0.36}
          cy={spec.y + dy - spec.ry * 0.34}
          r={spec.rx * 0.33}
          fill="var(--p-glint)"
        />
      ))}
    </g>
  );
}

function Mouth({ spec, state }: { spec: MouthSpec; state: PetState }) {
  const { x, y, w } = spec;
  const stroke = {
    stroke: "var(--p-eye)",
    // Capped at both ends: the frog's mouth spans half its face, and a stroke
    // or a curve scaled straight off that width swallows the chin.
    strokeWidth: Math.min(2.6, Math.max(1.6, w * 0.17)),
    strokeLinecap: "round" as const,
    fill: "none",
  };
  const half = w / 2;
  const depth = Math.min(6.5, w * 0.5);

  if (state === "celebrating" || state === "happy") {
    return <path d={`M${x - half} ${y - 1} Q${x} ${y + depth} ${x + half} ${y - 1}`} {...stroke} />;
  }
  if (state === "deflated" || state === "lonely") {
    return <path d={`M${x - half * 0.8} ${y + 2.5} Q${x} ${y - depth * 0.55} ${x + half * 0.8} ${y + 2.5}`} {...stroke} />;
  }
  if (state === "dozing") {
    return <path d={`M${x - half * 0.4} ${y} Q${x} ${y + depth * 0.6} ${x + half * 0.4} ${y}`} {...stroke} />;
  }
  return <path d={`M${x - half * 0.45} ${y} h${w * 0.45}`} {...stroke} />;
}

export default function PetArt({
  petId,
  state,
  accentColor,
  className,
  label,
}: {
  petId: string;
  state: PetState;
  accentColor: string;
  className?: string;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const s = buildSpecies(petId, uid);
  const [blinking, setBlinking] = useState(false);

  // An even blink reads as a machine. The uneven gap is the whole trick.
  useEffect(() => {
    if (reduced || EYES_SHUT.has(state)) return;
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 120);
      }, 2200 + Math.random() * 3600);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [reduced, state]);

  const anim = reduced ? undefined : state;
  const [earX, earY] = s.earPivot ?? [50, 34];

  return (
    <svg
      viewBox="0 0 120 120"
      className={`${s.palette} ${className ?? ""}`}
      role="img"
      aria-label={label ?? `Study pet, ${state}`}
    >
      <defs>
        <radialGradient id={`${uid}-sheen`} cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="65%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="60" cy="109" rx="29" ry="4.5" fill="var(--p-shadow)" opacity="0.18" />

      {s.tail && (
        <motion.g
          variants={tailVariants}
          animate={anim}
          initial={false}
          // transform-box: view-box is what makes transform-origin resolve in
          // viewBox units. Without it the origin is read as CSS pixels against
          // the rendered size, so at 72px an origin of "96px" lands outside the
          // drawing and the tail swings off the body instead of pivoting on it.
          style={{ transformBox: "view-box", transformOrigin: "80px 96px" }}
        >
          {s.tail}
        </motion.g>
      )}

      <motion.g
        variants={bodyVariants}
        animate={anim}
        initial={false}
        style={{ transformBox: "view-box", transformOrigin: "60px 106px" }}
      >
        {s.body}
        {s.accent(accentColor)}

        <motion.g
          variants={headVariants}
          animate={reduced ? { rotate: HEAD_TILT[state], transition: { duration: 0 } } : anim}
          initial={false}
          style={{ transformBox: "view-box", transformOrigin: "60px 66px" }}
        >
          {/* Each ear pivots on its own base, mirrored. Rotating both as one
              group moves them sideways, which is not a droop. */}
          {s.ear &&
            ([-1, 1] as const).map((side) => (
              <motion.g
                key={side}
                animate={earAnimation(state, side, !!reduced)}
                initial={false}
                style={{
                  transformBox: "view-box",
                  transformOrigin: `${side === -1 ? earX : 120 - earX}px ${earY}px`,
                }}
              >
                <g transform={side === 1 ? "scale(-1 1) translate(-120 0)" : undefined}>{s.ear}</g>
              </motion.g>
            ))}

          {s.head}
          <Eyes spec={s.eyes} state={state} blinking={blinking} />
          <Mouth spec={s.mouth} state={state} />
          {s.over}
        </motion.g>
      </motion.g>

      {state === "dozing" && !reduced && (
        <motion.text
          x="94" y="34"
          fill="var(--p-eye)" opacity="0.5"
          fontSize="13" fontFamily="var(--app-font-sans)"
          animate={{ y: [34, 22], opacity: [0, 0.55, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        >
          z
        </motion.text>
      )}
    </svg>
  );
}
