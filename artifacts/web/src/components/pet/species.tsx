import type { ReactNode } from "react";

/**
 * Five animals, drawn one at a time.
 *
 * An earlier version shared a single rig between all five and changed only the
 * ears — which is exactly what it looked like. A rabbit is not a cat with
 * longer ears: it sits differently, its head is a different shape, its hind
 * feet carry its weight, and its face is mostly cheek. So each species brings
 * its own silhouette, its own build, and its own markings, and the rig in
 * PetArt only animates what they have in common: breath, blink, tilt, droop.
 *
 * Every part is drawn facing front in a 120×120 box, standing on y≈106. Ears
 * are drawn on the LEFT and mirrored by the rig, so an ear is only ever drawn
 * once.
 *
 * Colours are CSS custom properties from the `.pet-<id>` palette class — never
 * literal hex — so a species can be recoloured for night without being redrawn.
 */

export type EyeSpec = { x: [number, number]; y: number; rx: number; ry: number };
export type MouthSpec = { x: number; y: number; w: number };

export type Species = {
  /** Class carrying this species' palette. */
  palette: string;
  eyes: EyeSpec;
  mouth: MouthSpec;
  /** Base of the LEFT ear, the point it pivots on. */
  earPivot?: [number, number];
  /** One ear, drawn on the left. Omitted for species that have none. */
  ear?: ReactNode;
  /** Behind everything, inside the tail motion group. */
  tail?: ReactNode;
  /** Torso, limbs, feet. Breathes. */
  body: ReactNode;
  /** Head shape and markings, under the eyes and mouth. Tilts. */
  head: ReactNode;
  /** Whiskers and the like, drawn over the face. */
  over?: ReactNode;
  /** Where this species wears its colour. */
  accent: (color: string) => ReactNode;
};

const FUR = "var(--p-fur)";
const DK = "var(--p-fur-dk)";
const LT = "var(--p-fur-lt)";
const INNER = "var(--p-inner)";
const NOSE = "var(--p-nose)";

/** A soft top-light, so a body reads as round instead of flat. */
function sheen(uid: string, cx: number, cy: number, rx: number, ry: number) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={"url(#" + uid + "-sheen)"} />;
}

/** Toe lines. Three short strokes turn an ellipse into a paw. */
function toes(cx: number, y: number, spread: number, depth = 4) {
  return (
    <g stroke={DK} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" fill="none">
      <path d={"M" + (cx - spread) + " " + y + " v" + depth} />
      <path d={"M" + cx + " " + (y - 0.6) + " v" + depth} />
      <path d={"M" + (cx + spread) + " " + y + " v" + depth} />
    </g>
  );
}

function whiskers(y: number, reach: number) {
  return (
    <g stroke={DK} strokeWidth="0.9" strokeLinecap="round" opacity="0.5" fill="none">
      <path d={"M50 " + (y - 2) + " q-" + reach + " -1.5 -" + (reach + 3) + " -3"} />
      <path d={"M50 " + (y + 1) + " q-" + reach + " 0.5 -" + (reach + 4) + " 0.5"} />
      <path d={"M70 " + (y - 2) + " q" + reach + " -1.5 " + (reach + 3) + " -3"} />
      <path d={"M70 " + (y + 1) + " q" + reach + " 0.5 " + (reach + 4) + " 0.5"} />
    </g>
  );
}

// ── Mochi — ginger tabby cat ────────────────────────────────────────────────
// Slim, upright, high shoulders. The tabby stripes are the point: without them
// a cat at 72px is just an oval with two triangles on it.
function mochi(uid: string): Species {
  return {
    palette: "pet-mochi",
    eyes: { x: [52, 68], y: 46, rx: 4.1, ry: 5.2 },
    mouth: { x: 60, y: 59, w: 11 },
    earPivot: [50, 34],
    ear: (
      <>
        <path d="M43 40 L39 16 L59 30 Z" fill={FUR} />
        <path d="M45 36 L43 23 L54 30 Z" fill={INNER} />
        <path d="M39 16 L41 25 L46 21 Z" fill={DK} opacity="0.35" />
      </>
    ),
    tail: (
      <>
        <path d="M80 96 Q104 94 103 73 Q102 61 92 61" stroke={FUR} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M103 80 q-0.5 5 -1.5 8" stroke={DK} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.55" />
        <path d="M99 65 q2 3 2.5 6" stroke={DK} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.55" />
        <circle cx="92.5" cy="61.5" r="4" fill={LT} />
      </>
    ),
    body: (
      <>
        <ellipse cx="60" cy="85" rx="24" ry="22" fill={FUR} />
        {/* forelegs first, then the chest over them, so the chest reads in front */}
        <path d="M51 86 v16" stroke={LT} strokeWidth="9.5" strokeLinecap="round" />
        <path d="M69 86 v16" stroke={LT} strokeWidth="9.5" strokeLinecap="round" />
        <path d="M60 68 Q70 78 68 96 Q60 101 52 96 Q50 78 60 68 Z" fill={LT} />
        <path d="M41 78 q4 3 5 7" stroke={DK} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M79 78 q-4 3 -5 7" stroke={DK} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
        {toes(51, 100, 3)}
        {toes(69, 100, 3)}
        {sheen(uid, 54, 78, 20, 18)}
      </>
    ),
    head: (
      <>
        <path d="M60 25 Q81 27 82 45 Q82 60 70 65 Q60 68 50 65 Q38 60 38 45 Q39 27 60 25 Z" fill={FUR} />
        <ellipse cx="49" cy="55" rx="9" ry="7" fill={LT} />
        <ellipse cx="71" cy="55" rx="9" ry="7" fill={LT} />
        <ellipse cx="60" cy="56" rx="8" ry="6" fill={LT} />
        {/* the tabby "M" */}
        <g stroke={DK} strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.65">
          <path d="M54 29 q2.5 5 2.5 9" />
          <path d="M60 27 v10" />
          <path d="M66 29 q-2.5 5 -2.5 9" />
        </g>
        <path d="M60 54 l-3.2 -2.8 h6.4 Z" fill={NOSE} />
        {sheen(uid, 54, 38, 18, 15)}
      </>
    ),
    over: whiskers(56, 9),
    accent: (c) => (
      <>
        <path d="M45 67 Q60 75 75 67" stroke={c} strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="73" r="3.2" fill={c} />
        <circle cx="59" cy="72" r="1" fill="#fff" opacity="0.6" />
      </>
    ),
  };
}

// ── Sprout — tree frog ──────────────────────────────────────────────────────
// No ears and no tail, so the whole mood lands on a mouth that spans the face
// and on eyes that sit on top of the skull rather than in it.
function sprout(uid: string): Species {
  return {
    palette: "pet-sprout",
    eyes: { x: [46, 74], y: 34, rx: 5.4, ry: 6 },
    mouth: { x: 60, y: 54, w: 30 },
    body: (
      <>
        {/* hind legs folded alongside, the way a sitting frog holds them */}
        <path d="M34 82 q-8 8 -2 16 q6 6 14 3" stroke={DK} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M86 82 q8 8 2 16 q-6 6 -14 3" stroke={DK} strokeWidth="8" strokeLinecap="round" fill="none" />
        <ellipse cx="60" cy="86" rx="29" ry="21" fill={FUR} />
        <ellipse cx="60" cy="91" rx="18" ry="14" fill={LT} />
        <ellipse cx="42" cy="78" rx="4.5" ry="3" fill={DK} opacity="0.45" />
        <ellipse cx="78" cy="78" rx="4.5" ry="3" fill={DK} opacity="0.45" />
        <path d="M40 101 q7 -6 14 0 q-7 6 -14 0 Z" fill={LT} />
        <path d="M66 101 q7 -6 14 0 q-7 6 -14 0 Z" fill={LT} />
        <g stroke={DK} strokeWidth="1" opacity="0.5" fill="none">
          <path d="M44 99 v4" /><path d="M47 98 v5" /><path d="M50 99 v4" />
          <path d="M70 99 v4" /><path d="M73 98 v5" /><path d="M76 99 v4" />
        </g>
        {sheen(uid, 53, 79, 22, 17)}
      </>
    ),
    head: (
      <>
        <ellipse cx="60" cy="47" rx="25" ry="18" fill={FUR} />
        {/* the turrets a frog watches the world over */}
        <circle cx="46" cy="34" r="11.5" fill={FUR} />
        <circle cx="74" cy="34" r="11.5" fill={FUR} />
        <ellipse cx="60" cy="52" rx="15" ry="9" fill={INNER} opacity="0.45" />
        <circle cx="56" cy="44" r="1.2" fill={NOSE} />
        <circle cx="64" cy="44" r="1.2" fill={NOSE} />
        {sheen(uid, 50, 34, 10, 9)}
      </>
    ),
    accent: (c) => (
      // A leaf, not a collar — a frog in a collar reads as a costume. It needs
      // its own outline: this pet's colour is green, and a green leaf laid on a
      // green frog is not a leaf, it is nothing.
      <g transform="rotate(-16 62 20)">
        <path d="M62 20 Q76 8 81 17 Q77 29 62 20 Z" fill={c} stroke={DK} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M64 20 Q72 16 79 17" stroke={DK} strokeWidth="1" fill="none" opacity="0.7" />
        <path d="M62 20 q-3 2 -5 5" stroke={DK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
    ),
  };
}

// ── Luna — lilac rabbit ─────────────────────────────────────────────────────
// Weight sits at the back on two long hind feet; the front paws barely touch.
function luna(uid: string): Species {
  return {
    palette: "pet-luna",
    eyes: { x: [53, 67], y: 46, rx: 4.3, ry: 5.4 },
    mouth: { x: 60, y: 58, w: 9 },
    earPivot: [52, 36],
    ear: (
      <>
        <ellipse cx="46" cy="15" rx="6.5" ry="21" fill={FUR} transform="rotate(-9 46 15)" />
        <ellipse cx="46" cy="17" rx="3.1" ry="14" fill={INNER} transform="rotate(-9 46 17)" />
      </>
    ),
    tail: <circle cx="84" cy="93" r="7.5" fill={LT} />,
    body: (
      <>
        <ellipse cx="60" cy="85" rx="23" ry="22" fill={FUR} />
        {/* hind feet, long and flat on the ground */}
        <ellipse cx="43" cy="101" rx="11.5" ry="6" fill={LT} />
        <ellipse cx="77" cy="101" rx="11.5" ry="6" fill={LT} />
        {toes(43, 99, 4, 3.4)}
        {toes(77, 99, 4, 3.4)}
        <ellipse cx="60" cy="87" rx="14.5" ry="15" fill={LT} />
        <ellipse cx="53" cy="96" rx="5" ry="6.5" fill={LT} />
        <ellipse cx="67" cy="96" rx="5" ry="6.5" fill={LT} />
        {sheen(uid, 54, 78, 19, 18)}
      </>
    ),
    head: (
      <>
        <ellipse cx="60" cy="46" rx="21" ry="19" fill={FUR} />
        <ellipse cx="50" cy="54" rx="8.5" ry="6.5" fill={LT} />
        <ellipse cx="70" cy="54" rx="8.5" ry="6.5" fill={LT} />
        {/* a rabbit's split lip */}
        <path d="M60 53 v4.5" stroke={NOSE} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M60 48.5 q-3.6 1 0 4.5 q3.6 -3.5 0 -4.5 Z" fill={NOSE} />
        {sheen(uid, 54, 38, 16, 14)}
      </>
    ),
    over: whiskers(55, 7),
    accent: (c) => (
      // A bow at the throat. It started at the base of an ear, where the head
      // drew straight over it — the accent has to live below the head group.
      <g>
        <path d="M46 68 Q60 76 74 68" stroke={c} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M60 72 q-7 -5 -10 0 q5 5 10 0 Z" fill={c} />
        <path d="M60 72 q7 -5 10 0 q-5 5 -10 0 Z" fill={c} />
        <circle cx="60" cy="72" r="2.4" fill={c} />
      </g>
    ),
  };
}

// ── Ember — red fox ─────────────────────────────────────────────────────────
// Everything about a fox is pointed: ears, muzzle, ruff. The dark ear tips and
// stockings are what stop it reading as an orange cat.
function ember(uid: string): Species {
  return {
    palette: "pet-ember",
    eyes: { x: [52, 68], y: 44, rx: 4, ry: 4.8 },
    mouth: { x: 60, y: 60, w: 8 },
    earPivot: [50, 33],
    ear: (
      <>
        <path d="M42 39 L36 11 L60 29 Z" fill={FUR} />
        <path d="M36 11 L40 24 L47 20 Z" fill={INNER} />
        <path d="M44 36 L42 21 L55 29 Z" fill={LT} opacity="0.85" />
      </>
    ),
    tail: (
      <>
        <path d="M78 98 Q104 94 101 70 Q99 58 89 60" stroke={FUR} strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M101 74 q-1 6 -3 10" stroke={DK} strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.5" />
        <circle cx="89.5" cy="60.5" r="7.5" fill={LT} />
      </>
    ),
    body: (
      <>
        <ellipse cx="60" cy="85" rx="23" ry="21" fill={FUR} />
        {/* stockings */}
        <path d="M51 88 v14" stroke={INNER} strokeWidth="9" strokeLinecap="round" />
        <path d="M69 88 v14" stroke={INNER} strokeWidth="9" strokeLinecap="round" />
        <path d="M60 69 Q71 80 69 97 Q60 102 51 97 Q49 80 60 69 Z" fill={LT} />
        {sheen(uid, 54, 78, 19, 17)}
      </>
    ),
    head: (
      <>
        {/* wide at the ears, narrowing to the muzzle */}
        <path d="M60 24 Q83 30 80 47 Q76 60 60 67 Q44 60 40 47 Q37 30 60 24 Z" fill={FUR} />
        <path d="M41 42 Q37 58 48 63 Q54 65 60 62 Q66 65 72 63 Q83 58 79 42 Q72 57 60 56 Q48 57 41 42 Z" fill={LT} />
        <path d="M60 50 Q68 53 65 60 Q60 65 55 60 Q52 53 60 50 Z" fill={LT} />
        <path d="M60 53 l-3.4 -3 h6.8 Z" fill={NOSE} />
        <path d="M60 55 v4" stroke={NOSE} strokeWidth="1.2" strokeLinecap="round" />
        {sheen(uid, 54, 36, 17, 13)}
      </>
    ),
    over: whiskers(58, 8),
    accent: (c) => <path d="M46 66 Q60 74 74 66 L71 71 Q60 78 49 71 Z" fill={c} />,
  };
}

// ── Cosmo — brown bear ──────────────────────────────────────────────────────
// Broad and low, arms hanging at the sides, small ears set wide on a wide head.
function cosmo(uid: string): Species {
  return {
    palette: "pet-cosmo",
    eyes: { x: [53, 67], y: 44, rx: 3.7, ry: 4.4 },
    mouth: { x: 60, y: 58, w: 9 },
    earPivot: [44, 34],
    ear: (
      <>
        <circle cx="43" cy="27" r="10" fill={FUR} />
        <circle cx="43" cy="28" r="5.2" fill={INNER} />
      </>
    ),
    tail: <circle cx="83" cy="95" r="5.5" fill={DK} />,
    body: (
      <>
        {/* arms behind the torso, so the belly stays the front plane */}
        <ellipse cx="36" cy="86" rx="7.5" ry="12" fill={DK} />
        <ellipse cx="84" cy="86" rx="7.5" ry="12" fill={DK} />
        <ellipse cx="60" cy="86" rx="27" ry="22" fill={FUR} />
        <ellipse cx="60" cy="89" rx="17" ry="15" fill={LT} />
        <ellipse cx="47" cy="102" rx="10" ry="6" fill={LT} />
        <ellipse cx="73" cy="102" rx="10" ry="6" fill={LT} />
        {toes(47, 100, 3.6, 3.4)}
        {toes(73, 100, 3.6, 3.4)}
        {sheen(uid, 53, 79, 22, 18)}
      </>
    ),
    head: (
      <>
        <ellipse cx="60" cy="45" rx="24" ry="21" fill={FUR} />
        <ellipse cx="60" cy="55" rx="12.5" ry="9" fill={LT} />
        <ellipse cx="60" cy="50" rx="4.8" ry="3.6" fill={NOSE} />
        {sheen(uid, 53, 36, 18, 15)}
      </>
    ),
    accent: (c) => (
      <path d="M43 65 Q60 74 77 65" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" />
    ),
  };
}

const BUILDERS: Record<string, (uid: string) => Species> = {
  mochi, sprout, luna, ember, cosmo,
};

export function buildSpecies(petId: string, uid: string): Species {
  return (BUILDERS[petId] ?? mochi)(uid);
}
