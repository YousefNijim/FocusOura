/**
 * Gradients and reusable shapes for every plant in the garden.
 *
 * Rendered once per page (from MobileLayout) into a zero-size SVG. Every
 * <PlantArt> references these by id, so forty plant states cost roughly what
 * four would. Colours come from CSS custom properties defined in index.css, so
 * the same drawing serves the light and night gardens.
 */
export default function GardenDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="gClump" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="var(--leaf-lt)" />
          <stop offset="42%" stopColor="var(--leaf-hi)" />
          <stop offset="78%" stopColor="var(--leaf-mid)" />
          <stop offset="100%" stopColor="var(--leaf-dk)" />
        </radialGradient>

        <radialGradient id="gPetal" cx="50%" cy="88%" r="86%">
          <stop offset="0%" stopColor="var(--pet-dk)" />
          <stop offset="38%" stopColor="var(--pet-mid)" />
          <stop offset="78%" stopColor="var(--pet-hi)" />
          <stop offset="100%" stopColor="var(--pet-lt)" />
        </radialGradient>

        <radialGradient id="gPetalDead" cx="50%" cy="88%" r="86%">
          <stop offset="0%" stopColor="var(--dead-dk)" />
          <stop offset="60%" stopColor="var(--dead-pet)" />
          <stop offset="100%" stopColor="var(--dead-hi)" />
        </radialGradient>

        <linearGradient id="gLeaf" x1="0" y1="1" x2="0.7" y2="0">
          <stop offset="0%" stopColor="var(--leaf-dk)" />
          <stop offset="55%" stopColor="var(--leaf-mid)" />
          <stop offset="100%" stopColor="var(--leaf-hi)" />
        </linearGradient>

        <linearGradient id="gBark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--bark-hi)" />
          <stop offset="38%" stopColor="var(--bark-mid)" />
          <stop offset="100%" stopColor="var(--bark-dk)" />
        </linearGradient>

        <linearGradient id="gDead" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--dead-hi)" />
          <stop offset="40%" stopColor="var(--dead-mid)" />
          <stop offset="100%" stopColor="var(--dead-dk)" />
        </linearGradient>

        <linearGradient id="gStem" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--stem-hi)" />
          <stop offset="60%" stopColor="var(--stem)" />
          <stop offset="100%" stopColor="var(--leaf-dk)" />
        </linearGradient>

        <linearGradient id="gCactus" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--cact-hi)" />
          <stop offset="42%" stopColor="var(--cact-mid)" />
          <stop offset="100%" stopColor="var(--cact-dk)" />
        </linearGradient>

        <linearGradient id="gSucc" x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0%" stopColor="var(--succ-dk)" />
          <stop offset="55%" stopColor="var(--succ-mid)" />
          <stop offset="88%" stopColor="var(--succ-hi)" />
          <stop offset="100%" stopColor="var(--succ-tip)" />
        </linearGradient>

        <linearGradient id="gBamboo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--bam-hi)" />
          <stop offset="45%" stopColor="var(--bam-mid)" />
          <stop offset="100%" stopColor="var(--bam-dk)" />
        </linearGradient>

        <radialGradient id="gOrchid" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--orch-hi)" />
          <stop offset="60%" stopColor="var(--orch-mid)" />
          <stop offset="100%" stopColor="var(--orch-dk)" />
        </radialGradient>

        <linearGradient id="gLav" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--lav-dk)" />
          <stop offset="60%" stopColor="var(--lav-mid)" />
          <stop offset="100%" stopColor="var(--lav-hi)" />
        </linearGradient>

        <linearGradient id="gPot" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="var(--pot-lt)" />
          <stop offset="45%" stopColor="var(--pot-mid)" />
          <stop offset="100%" stopColor="var(--pot-dk)" />
        </linearGradient>

        <radialGradient id="gShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--plant-shadow)" stopOpacity="0.28" />
          <stop offset="70%" stopColor="var(--plant-shadow)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="var(--plant-shadow)" stopOpacity="0" />
        </radialGradient>

        {/* ── reusable shapes ── */}
        <g id="clump">
          <path
            d="M95 50 A13 13 0 0 1 88.97 72.5 A13 13 0 0 1 72.5 88.97 A13 13 0 0 1 50 95
               A13 13 0 0 1 27.5 88.97 A13 13 0 0 1 11.03 72.5 A13 13 0 0 1 5 50
               A13 13 0 0 1 11.03 27.5 A13 13 0 0 1 27.5 11.03 A13 13 0 0 1 50 5
               A13 13 0 0 1 72.5 11.03 A13 13 0 0 1 88.97 27.5 A13 13 0 0 1 95 50 Z"
            fill="url(#gClump)"
          />
          <path
            d="M62 22 A10 10 0 0 1 44 17 A10 10 0 0 1 28 27 A10 10 0 0 1 24 43
               A22 22 0 0 1 38 24 A22 22 0 0 1 62 22 Z"
            fill="var(--leaf-lt)"
            opacity="0.55"
          />
          <path
            d="M78 74 A14 14 0 0 1 56 86 A14 14 0 0 1 32 78 A26 26 0 0 0 60 80 A26 26 0 0 0 78 74 Z"
            fill="var(--leaf-dk)"
            opacity="0.42"
          />
        </g>

        <g id="tuft" fill="var(--leaf-hi)">
          <ellipse cx="0" cy="0" rx="5.2" ry="2.6" transform="rotate(-28)" />
          <ellipse cx="9" cy="-4" rx="4.6" ry="2.3" transform="rotate(12)" />
          <ellipse cx="-8" cy="-3" rx="4.4" ry="2.2" transform="rotate(-52)" />
          <ellipse cx="2" cy="-9" rx="4.2" ry="2.1" transform="rotate(-8)" />
        </g>

        <path id="petal" d="M50 50 Q28 46 23 27 Q28 7 50 3 Q72 7 77 27 Q72 46 50 50 Z" />

        <g id="leaflet">
          <path d="M20 40 Q6 30 7 17 Q9 6 20 0 Q31 6 33 17 Q34 30 20 40 Z" fill="url(#gLeaf)" />
          <path d="M20 38 L20 3" stroke="var(--leaf-dk)" strokeWidth="0.9" opacity="0.55" />
          <path
            d="M20 30 L12 25 M20 30 L28 25 M20 22 L13 18 M20 22 L27 18 M20 14 L15 11 M20 14 L25 11"
            stroke="var(--leaf-dk)"
            strokeWidth="0.6"
            opacity="0.38"
            fill="none"
          />
        </g>

        <g id="leaf3">
          <path d="M0 0 L0 -16" stroke="var(--stem)" strokeWidth="1.6" />
          <g transform="translate(-13,-14) scale(0.52) rotate(-32 20 40)">
            <use href="#leaflet" />
          </g>
          <g transform="translate(3,-14) scale(0.52) rotate(32 20 40)">
            <use href="#leaflet" />
          </g>
          <g transform="translate(-6,-30) scale(0.50)">
            <use href="#leaflet" />
          </g>
        </g>

        <g id="bloom">
          <g fill="url(#gPetal)">
            <use href="#petal" />
            <use href="#petal" transform="rotate(72 50 50)" />
            <use href="#petal" transform="rotate(144 50 50)" />
            <use href="#petal" transform="rotate(216 50 50)" />
            <use href="#petal" transform="rotate(288 50 50)" />
          </g>
          <g fill="url(#gPetal)" transform="rotate(36 50 50)" opacity="0.97">
            <use href="#petal" transform="translate(50 50) scale(0.72) translate(-50 -50)" />
            <use href="#petal" transform="rotate(72 50 50) translate(50 50) scale(0.72) translate(-50 -50)" />
            <use href="#petal" transform="rotate(144 50 50) translate(50 50) scale(0.72) translate(-50 -50)" />
            <use href="#petal" transform="rotate(216 50 50) translate(50 50) scale(0.72) translate(-50 -50)" />
            <use href="#petal" transform="rotate(288 50 50) translate(50 50) scale(0.72) translate(-50 -50)" />
          </g>
          <g fill="var(--pet-mid)" transform="rotate(18 50 50)">
            <use href="#petal" transform="translate(50 50) scale(0.44) translate(-50 -50)" />
            <use href="#petal" transform="rotate(90 50 50) translate(50 50) scale(0.44) translate(-50 -50)" />
            <use href="#petal" transform="rotate(180 50 50) translate(50 50) scale(0.44) translate(-50 -50)" />
            <use href="#petal" transform="rotate(270 50 50) translate(50 50) scale(0.44) translate(-50 -50)" />
          </g>
          <path
            d="M50 58 Q40 54 42 46 Q44 39 51 40 Q57 41 56 47 Q55 52 50 51 Q47 50 48 47"
            fill="none"
            stroke="var(--pet-dk)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="50" cy="47" r="2.1" fill="var(--pollen)" opacity="0.8" />
        </g>

        <g id="bud">
          <path d="M50 64 Q36 56 36 38 Q36 18 50 8 Q64 18 64 38 Q64 56 50 64 Z" fill="url(#gPetal)" />
          <path
            d="M50 62 Q44 52 45 36 Q46 22 50 12 Q54 22 55 36 Q56 52 50 62 Z"
            fill="var(--pet-dk)"
            opacity="0.28"
          />
          <g fill="var(--leaf-mid)">
            <path d="M50 66 Q36 60 32 44 Q42 52 50 54 Z" />
            <path d="M50 66 Q64 60 68 44 Q58 52 50 54 Z" />
            <path d="M50 66 Q48 78 42 86 Q52 80 50 66 Z" />
            <path d="M50 66 Q52 78 58 86 Q48 80 50 66 Z" />
          </g>
        </g>

        <g id="frond">
          <path d="M0 0 Q2 -26 -6 -52" stroke="var(--stem)" strokeWidth="2" fill="none" />
          <g fill="url(#gLeaf)">
            <ellipse cx="-7" cy="-6" rx="9" ry="3.4" transform="rotate(-14 -7 -6)" />
            <ellipse cx="7" cy="-7" rx="8.6" ry="3.3" transform="rotate(16 7 -7)" />
            <ellipse cx="-7" cy="-15" rx="8.2" ry="3.1" transform="rotate(-18 -7 -15)" />
            <ellipse cx="7" cy="-16" rx="7.8" ry="3" transform="rotate(12 7 -16)" />
            <ellipse cx="-7" cy="-24" rx="7" ry="2.7" transform="rotate(-22 -7 -24)" />
            <ellipse cx="6" cy="-25" rx="6.6" ry="2.6" transform="rotate(8 6 -25)" />
            <ellipse cx="-8" cy="-33" rx="5.6" ry="2.3" transform="rotate(-26 -8 -33)" />
            <ellipse cx="4" cy="-34" rx="5.2" ry="2.1" />
            <ellipse cx="-8" cy="-41" rx="4.2" ry="1.8" transform="rotate(-30 -8 -41)" />
            <ellipse cx="2" cy="-43" rx="3.8" ry="1.6" />
            <ellipse cx="-6" cy="-49" rx="3" ry="1.3" transform="rotate(-34 -6 -49)" />
          </g>
        </g>

        <g id="fiddle">
          <path
            d="M0 0 Q1 -14 -3 -22 Q-8 -30 -14 -27 Q-19 -24 -16 -19 Q-13 -15 -9 -18"
            fill="none"
            stroke="var(--leaf-mid)"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <circle cx="-11" cy="-19" r="1.6" fill="var(--leaf-hi)" />
        </g>

        <g id="bamLeaves" fill="var(--bam-mid)">
          <path d="M0 0 Q10 -6 22 -4 Q10 2 0 0 Z" />
          <path d="M0 0 Q9 -14 20 -18 Q12 -6 0 0 Z" fill="var(--bam-hi)" />
          <path d="M0 0 Q-9 -8 -20 -8 Q-8 0 0 0 Z" fill="var(--bam-dk)" />
          <path d="M0 0 Q-7 -15 -16 -20 Q-9 -7 0 0 Z" />
        </g>

        <path id="succLeaf" d="M0 0 Q-8 -14 -5 -30 Q-2 -40 0 -44 Q2 -40 5 -30 Q8 -14 0 0 Z" />

        <g id="orchid">
          <g fill="url(#gOrchid)">
            <ellipse cx="0" cy="-13" rx="6" ry="9" />
            <ellipse cx="-13" cy="-5" rx="9" ry="6.5" transform="rotate(-22 -13 -5)" />
            <ellipse cx="13" cy="-5" rx="9" ry="6.5" transform="rotate(22 13 -5)" />
            <ellipse cx="-10" cy="8" rx="7.5" ry="6" transform="rotate(-30 -10 8)" />
            <ellipse cx="10" cy="8" rx="7.5" ry="6" transform="rotate(30 10 8)" />
          </g>
          <path d="M0 2 Q-6 6 -5 12 Q-3 17 0 17 Q3 17 5 12 Q6 6 0 2 Z" fill="var(--orch-lip)" />
          <circle cx="0" cy="1" r="2.4" fill="var(--orch-dk)" />
        </g>

        <g id="lavSpike">
          <path d="M0 0 L0 -30" stroke="var(--lav-leaf)" strokeWidth="1.6" />
          <g fill="url(#gLav)">
            <ellipse cx="-2.6" cy="-31" rx="3.1" ry="2.3" />
            <ellipse cx="2.6" cy="-34" rx="3" ry="2.2" />
            <ellipse cx="-2.4" cy="-37" rx="2.9" ry="2.1" />
            <ellipse cx="2.3" cy="-40" rx="2.7" ry="2" />
            <ellipse cx="-2" cy="-43" rx="2.5" ry="1.9" />
            <ellipse cx="1.8" cy="-46" rx="2.3" ry="1.7" />
            <ellipse cx="-1.4" cy="-49" rx="2" ry="1.5" />
            <ellipse cx="0.6" cy="-52" rx="1.6" ry="1.3" />
          </g>
        </g>

        <g id="pot">
          <ellipse cx="100" cy="228" rx="62" ry="7" fill="url(#gShadow)" />
          <path
            d="M44 186 L156 186 L149 214 Q148 219 142 219 L58 219 Q52 219 51 214 Z"
            fill="url(#gPot)"
          />
          <rect x="60" y="219" width="16" height="5" rx="1.6" fill="var(--pot-dk)" />
          <rect x="124" y="219" width="16" height="5" rx="1.6" fill="var(--pot-dk)" />
          <ellipse cx="100" cy="186" rx="56" ry="9.5" fill="var(--pot-lt)" />
          <ellipse cx="100" cy="187" rx="49" ry="7.4" fill="var(--soil)" />
          <path
            d="M62 186 Q76 181 92 184 Q108 187 124 183 Q136 180 145 185 Q130 191 100 192 Q70 192 62 186 Z"
            fill="var(--soil-hi)"
            opacity="0.7"
          />
          <g fill="var(--moss)" opacity="0.85">
            <ellipse cx="76" cy="186" rx="7" ry="2.4" />
            <ellipse cx="118" cy="184.5" rx="8.5" ry="2.6" />
          </g>
          <path
            d="M46 190 Q54 205 58 216"
            stroke="var(--pot-dk)"
            strokeWidth="1"
            fill="none"
            opacity="0.35"
          />
        </g>

        {/* pale top-dressing: desert species get grit where the others get moss */}
        <g id="grit" fill="var(--pot-lt)" opacity="0.55">
          <ellipse cx="78" cy="185" rx="3.4" ry="1.4" />
          <ellipse cx="94" cy="188" rx="2.8" ry="1.2" />
          <ellipse cx="112" cy="184" rx="3.8" ry="1.5" />
          <ellipse cx="126" cy="187" rx="2.6" ry="1.1" />
        </g>
      </defs>
    </svg>
  );
}
