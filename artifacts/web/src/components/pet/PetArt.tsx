import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The study companion, drawn as a layered SVG rig rather than an emoji.
 *
 * Same technique as the garden: one small vector, colours from CSS custom
 * properties so it follows the theme, and a variant map instead of a pile of
 * conditionals. What makes it read as alive is not detail — it is reaction:
 * anticipation before a move, follow-through after it, a blink on an uneven
 * beat, and a body that keeps breathing while nothing is happening.
 *
 * The five pets share one rig. They differ by ear shape and accent colour,
 * which is a deliberate call: a stylised companion family reads as intentional,
 * where five literal species drawn at this size would read as five attempts at
 * the same drawing.
 */

export type PetState =
  | "focusing"
  | "dozing"
  | "celebrating"
  | "deflated"
  | "happy"
  | "neutral"
  | "lonely";

type EarShape = "pointed" | "long" | "round";

const EARS: Record<string, EarShape> = {
  mochi: "pointed",
  luna: "long",
  sprout: "round",
  ember: "pointed",
  cosmo: "round",
};

/** States where the eyes are shut, so the blink loop stands down. */
const EYES_SHUT: ReadonlySet<PetState> = new Set<PetState>(["dozing"]);

const bodyVariants: Variants = {
  focusing:    { y: 0,  scaleY: [1, 1.03, 1], transition: { scaleY: { duration: 4.5, repeat: Infinity, ease: "easeInOut" } } },
  dozing:      { y: 4,  scaleY: [1, 1.05, 1], transition: { scaleY: { duration: 6, repeat: Infinity, ease: "easeInOut" } } },
  celebrating: { y: [0, -11, 0, -4, 0], scaleY: 1, transition: { duration: 0.6, ease: "easeOut" } },
  deflated:    { y: 3,  scaleY: 0.97, transition: { duration: 0.35, ease: "easeOut" } },
  happy:       { y: 0,  scaleY: [1, 1.04, 1], transition: { scaleY: { duration: 3, repeat: Infinity, ease: "easeInOut" } } },
  neutral:     { y: 1,  scaleY: [1, 1.03, 1], transition: { scaleY: { duration: 4, repeat: Infinity, ease: "easeInOut" } } },
  lonely:      { y: 3,  scaleY: 0.98, transition: { duration: 0.4, ease: "easeOut" } },
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

/** Ears carry most of the mood — up for interest, drooping outward for defeat. */
const EAR_DROOP: Record<PetState, number> = {
  focusing: 0, dozing: 13, celebrating: 0, deflated: 21, happy: 0, neutral: 4, lonely: 19,
};

/**
 * Only the states that move get a keyframe; the rest hold their droop.
 *
 * The droop itself survives `prefers-reduced-motion` — it is posture, not
 * decoration, and a sad pet with alert ears is simply drawn wrong. What the
 * preference removes is the looping idle flick, which says nothing.
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
  focusing:    { rotate: [0, 6, 0],    transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" } },
  dozing:      { rotate: 16 },
  celebrating: { rotate: [0, 22, -10, 0], transition: { duration: 0.6, ease: "easeOut" } },
  deflated:    { rotate: 30 },
  happy:       { rotate: [0, 24, 0],  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  neutral:     { rotate: [0, 8, 0],    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  lonely:      { rotate: 28 },
};

function Ear({ shape, side }: { shape: EarShape; side: -1 | 1 }) {
  // Drawn on the left, mirrored for the right. One shared drawing keeps the two
  // ears identical; mirroring is what lets each one pivot on its own base.
  const flip = side === 1 ? "scale(-1 1) translate(-120 0)" : undefined;
  const inner = (
    shape === "long" ? (
      <>
        <ellipse cx="46" cy="24" rx="6" ry="17" fill="var(--pet-fur)" transform="rotate(-11 46 24)" />
        <ellipse cx="46" cy="26" rx="2.6" ry="11" fill="var(--pet-ear-inner)" transform="rotate(-11 46 26)" />
      </>
    ) : shape === "round" ? (
      <>
        <circle cx="45" cy="34" r="10" fill="var(--pet-fur)" />
        <circle cx="45" cy="34" r="4.6" fill="var(--pet-ear-inner)" />
      </>
    ) : (
      <>
        <path d="M44 42 L41 22 L58 32 Z" fill="var(--pet-fur)" />
        <path d="M45.5 39 L44 27 L53.5 32.5 Z" fill="var(--pet-ear-inner)" />
      </>
    )
  );
  return <g transform={flip}>{inner}</g>;
}

function Eyes({ state, blinking }: { state: PetState; blinking: boolean }) {
  const shut = EYES_SHUT.has(state) || blinking;

  if (shut) {
    return (
      <g stroke="var(--pet-eye)" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M51 51 Q55 47.5 59 51" />
        <path d="M61 51 Q65 47.5 69 51" />
      </g>
    );
  }

  // Focusing looks down at the timer; lonely looks away. Both are a two-pixel
  // move, and both change what the face is doing far more than a new drawing would.
  const dx = state === "lonely" ? -1.6 : 0;
  const dy = state === "focusing" ? 1.4 : state === "deflated" ? 1.2 : 0;
  const ry = state === "deflated" || state === "lonely" ? 3.4 : 4.6;

  return (
    <g fill="var(--pet-eye)">
      <ellipse cx={55 + dx} cy={50 + dy} rx="3.9" ry={ry} />
      <ellipse cx={65 + dx} cy={50 + dy} rx="3.9" ry={ry} />
      <circle cx={56.4 + dx} cy={48.2 + dy} r="1.35" fill="var(--pet-eye-glint)" />
      <circle cx={66.4 + dx} cy={48.2 + dy} r="1.35" fill="var(--pet-eye-glint)" />
    </g>
  );
}

function Mouth({ state }: { state: PetState }) {
  const stroke = { stroke: "var(--pet-eye)", strokeWidth: 2, strokeLinecap: "round" as const, fill: "none" };
  if (state === "celebrating" || state === "happy") {
    return <path d="M55 60 Q60 65.5 65 60" {...stroke} />;
  }
  if (state === "deflated" || state === "lonely") {
    return <path d="M55.5 63 Q60 59 64.5 63" {...stroke} />;
  }
  if (state === "dozing") {
    return <path d="M57 61 Q60 63.5 63 61" {...stroke} />;
  }
  return <path d="M56 61 h8" {...stroke} />;
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

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label={label ?? `Study pet, ${state}`}
    >
      <ellipse cx="60" cy="108" rx="30" ry="5" fill="var(--pet-shadow)" opacity="0.18" />

      <motion.g variants={tailVariants} animate={anim} initial={false} style={{ transformBox: "view-box", transformOrigin: "84px 92px" }}>
        <path
          d="M84 92 Q102 90 100 74 Q99 66 92 66"
          stroke="var(--pet-fur)"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M93 68 Q99 67 99 74" stroke={accentColor} strokeWidth="6" strokeLinecap="round" fill="none" />
      </motion.g>

      <motion.g variants={bodyVariants} animate={anim} initial={false} style={{ transformBox: "view-box", transformOrigin: "60px 104px" }}>
        <ellipse cx="60" cy="86" rx="27" ry="23" fill="var(--pet-fur)" />
        <ellipse cx="60" cy="90" rx="16" ry="14" fill="var(--pet-fur-lt)" />
        <ellipse cx="45" cy="104" rx="8" ry="5" fill="var(--pet-fur-lt)" />
        <ellipse cx="75" cy="104" rx="8" ry="5" fill="var(--pet-fur-lt)" />

        {/* a collar in the pet's own colour — the one place each pet is itself */}
        <path d="M44 70 Q60 78 76 70" stroke={accentColor} strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="76" r="3.4" fill={accentColor} />

        <motion.g variants={headVariants} animate={anim} initial={false} style={{ transformBox: "view-box", transformOrigin: "60px 66px" }}>
          {([-1, 1] as const).map((side) => (
            <motion.g
              key={side}
              animate={earAnimation(state, side, !!reduced)}
              initial={false}
              style={{ transformBox: "view-box", transformOrigin: `${side === -1 ? 50 : 70}px 42px` }}
            >
              <Ear shape={EARS[petId] ?? "pointed"} side={side} />
            </motion.g>
          ))}

          <ellipse cx="60" cy="47" rx="25" ry="22" fill="var(--pet-fur)" />
          <ellipse cx="48" cy="57" rx="5.5" ry="3.4" fill="var(--pet-blush)" opacity="0.75" />
          <ellipse cx="72" cy="57" rx="5.5" ry="3.4" fill="var(--pet-blush)" opacity="0.75" />

          <Eyes state={state} blinking={blinking} />
          <path d="M60 56 l-2.6 -2.2 h5.2 Z" fill="var(--pet-nose)" />
          <Mouth state={state} />
        </motion.g>
      </motion.g>

      {state === "dozing" && !reduced && (
        <motion.text
          x="92" y="40"
          fill="var(--pet-eye)" opacity="0.5"
          fontSize="13" fontFamily="var(--app-font-sans)"
          animate={{ y: [40, 28], opacity: [0, 0.55, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        >
          z
        </motion.text>
      )}
    </svg>
  );
}
