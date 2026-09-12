import type { ReactNode } from "react";

/**
 * Vector art for the eight garden species.
 *
 * Each species has four growth stages plus a withered state. A stage is a
 * different plant, not the same plant scaled: trunks thicken and bend, rosettes
 * gain rows, buds open. Every entry below draws the plant body only — the pot,
 * the top-dressing and the idle sway are added once by <PlantArt>.
 *
 * Requires <GardenDefs /> to be mounted somewhere on the page.
 */

export const PLANT_TYPES = [
  "fern",
  "succulent",
  "bamboo",
  "rose",
  "cactus",
  "bonsai",
  "orchid",
  "lavender",
] as const;

export type PlantType = (typeof PLANT_TYPES)[number];
export type PlantStage = 1 | 2 | 3 | 4 | "withered";

/** Species planted in grit rather than moss. */
const DESERT: ReadonlySet<PlantType> = new Set<PlantType>(["cactus", "succulent"]);

export function isPlantType(value: unknown): value is PlantType {
  return typeof value === "string" && (PLANT_TYPES as readonly string[]).includes(value);
}

/** Rows stored before the picker was fixed can hold a type the garden cannot draw. */
export function toPlantType(value: unknown): PlantType {
  return isPlantType(value) ? value : "fern";
}

/** The art has four stages, and the API caps growthLevel to match. */
export const MAX_PLANT_LEVEL = 4;

/** growthLevel is 1-based; the art tops out at stage 4. */
export function stageForGrowth(growthLevel: number): PlantStage {
  if (!Number.isFinite(growthLevel) || growthLevel < 1) return 1;
  return Math.min(4, Math.floor(growthLevel)) as PlantStage;
}

const BONSAI_TRUNK =
  "M86 186 Q82 170 94 158 Q110 146 98 130 Q86 116 100 100 Q106 93 104 84 L114 84 " +
  "Q115 95 109 103 Q97 118 108 130 Q122 147 106 160 Q94 170 100 186 Z";

const ART: Record<PlantType, Record<PlantStage | 1 | 2 | 3 | 4, ReactNode>> = {
  // ── BONSAI ──────────────────────────────────────────────────────────────
  bonsai: {
    1: (
      <>
        <path d="M100 184 Q99.4 176 100.2 169" stroke="var(--leaf-mid)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <ellipse cx="93" cy="167" rx="7.5" ry="3.8" fill="var(--leaf-hi)" transform="rotate(-24 93 167)" />
        <ellipse cx="107" cy="166" rx="7.5" ry="3.8" fill="var(--leaf-mid)" transform="rotate(22 107 166)" />
        <ellipse cx="100" cy="161" rx="4.4" ry="3" fill="var(--leaf-lt)" />
      </>
    ),
    2: (
      <>
        <path d="M97.6 185 Q96 160 101 140 Q103 132 102 126 L106 126 Q107 134 105 142 Q101 162 102.6 185 Z" fill="url(#gBark)" />
        <g transform="translate(74,98) scale(0.52)"><use href="#clump" /></g>
        <g transform="translate(78,84) scale(0.30)"><use href="#clump" /></g>
        <use href="#tuft" transform="translate(86,112) scale(0.8)" />
      </>
    ),
    3: (
      <>
        <path d="M92 186 Q90 168 98 152 Q106 136 100 120 Q97 112 99 104 L106 104 Q104 113 107 121 Q113 137 105 153 Q97 169 100 186 Z" fill="url(#gBark)" />
        <path d="M100 140 Q88 136 76 132" stroke="var(--bark-mid)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g transform="translate(46,96) scale(0.62)"><use href="#clump" /></g>
        <g transform="translate(76,62) scale(0.70)"><use href="#clump" /></g>
        <use href="#tuft" transform="translate(58,98) scale(0.85)" />
        <use href="#tuft" transform="translate(132,78) scale(0.8) rotate(-14)" />
      </>
    ),
    4: (
      <>
        <path d={BONSAI_TRUNK} fill="url(#gBark)" />
        <path d="M92 180 Q90 168 100 158" stroke="var(--bark-dk)" strokeWidth="1.2" fill="none" opacity="0.55" />
        <path d="M103 146 Q98 134 106 122" stroke="var(--bark-dk)" strokeWidth="1" fill="none" opacity="0.45" />
        <path d="M84 186 Q90 178 100 179 Q112 180 116 186 Z" fill="var(--bark-dk)" />
        <path d="M96 152 Q78 146 60 144" stroke="var(--bark-mid)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M104 126 Q124 122 140 118" stroke="var(--bark-mid)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <g transform="translate(112,92) scale(0.66)" opacity="0.92"><use href="#clump" /></g>
        <g transform="translate(24,112) scale(0.72)"><use href="#clump" /></g>
        <g transform="translate(120,98) scale(0.60)"><use href="#clump" /></g>
        <g transform="translate(44,70) scale(0.64)"><use href="#clump" /></g>
        <g transform="translate(72,34) scale(0.84)"><use href="#clump" /></g>
        <use href="#tuft" transform="translate(34,116) scale(0.9)" />
        <use href="#tuft" transform="translate(160,108) scale(0.85) rotate(16)" />
        <use href="#tuft" transform="translate(100,28) scale(0.95) rotate(-6)" />
      </>
    ),
    withered: (
      <>
        <path d={BONSAI_TRUNK} fill="url(#gDead)" />
        <path d="M84 186 Q90 178 100 179 Q112 180 116 186 Z" fill="var(--dead-dk)" />
        <path d="M96 152 Q78 146 62 140 M70 144 Q64 138 58 136" stroke="var(--dead-mid)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M104 126 Q124 122 138 114 M128 119 Q134 112 138 106" stroke="var(--dead-mid)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g fill="var(--dead-leaf)" opacity="0.8">
          <ellipse cx="62" cy="138" rx="4.4" ry="2.2" transform="rotate(-38 62 138)" />
          <ellipse cx="137" cy="112" rx="4" ry="2" transform="rotate(24 137 112)" />
        </g>
        <g fill="var(--dead-leaf)" opacity="0.6">
          <ellipse cx="80" cy="186" rx="4" ry="1.6" />
          <ellipse cx="121" cy="185" rx="3.6" ry="1.5" />
        </g>
      </>
    ),
  },

  // ── ROSE ────────────────────────────────────────────────────────────────
  rose: {
    1: (
      <>
        <path d="M100 184 Q99 176 100 170" stroke="var(--stem)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <ellipse cx="92" cy="170" rx="7" ry="3.6" fill="var(--leaf-hi)" transform="rotate(-22 92 170)" />
        <ellipse cx="108" cy="169" rx="7" ry="3.6" fill="var(--leaf-mid)" transform="rotate(20 108 169)" />
        <g transform="translate(94,150) scale(0.42)"><use href="#leaflet" /></g>
      </>
    ),
    2: (
      <>
        <path d="M98 185 Q96 160 101 138" stroke="url(#gStem)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <g transform="translate(98,168) rotate(-18)"><use href="#leaf3" /></g>
        <g transform="translate(100,150) rotate(24) scale(0.92)"><use href="#leaf3" /></g>
        <g transform="translate(101,136) rotate(-6) scale(0.8)"><use href="#leaf3" /></g>
        <path d="M96 172 l-3 -3 l3 -1 Z M104 156 l3 -3 l-3 -1 Z" fill="var(--leaf-dk)" />
      </>
    ),
    3: (
      <>
        <path d="M97 185 Q94 156 101 128 Q104 116 102 104" stroke="url(#gStem)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M100 148 Q86 142 76 134" stroke="var(--stem)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <g transform="translate(96,172) rotate(-20)"><use href="#leaf3" /></g>
        <g transform="translate(101,150) rotate(26)"><use href="#leaf3" /></g>
        <g transform="translate(76,134) rotate(-40) scale(0.88)"><use href="#leaf3" /></g>
        <path d="M95 168 l-3.4 -3 l3.4 -1 Z M105 154 l3.4 -3 l-3.4 -1 Z" fill="var(--leaf-dk)" />
        <g transform="translate(78,62) scale(0.48)"><use href="#bud" /></g>
      </>
    ),
    4: (
      <>
        <path d="M96 185 Q92 154 100 124 Q104 110 102 96" stroke="url(#gStem)" strokeWidth="4.4" fill="none" strokeLinecap="round" />
        <path d="M99 142 Q80 134 66 118" stroke="var(--stem)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M101 120 Q120 114 134 100" stroke="var(--stem)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g transform="translate(95,176) rotate(-22)"><use href="#leaf3" /></g>
        <g transform="translate(101,156) rotate(28)"><use href="#leaf3" /></g>
        <g transform="translate(84,136) rotate(-44) scale(0.9)"><use href="#leaf3" /></g>
        <g transform="translate(116,116) rotate(48) scale(0.86)"><use href="#leaf3" /></g>
        <path d="M94 170 l-3.6 -3 l3.6 -1 Z M104 150 l3.6 -3 l-3.6 -1 Z" fill="var(--leaf-dk)" />
        <g transform="translate(38,78) scale(0.56)"><use href="#bloom" /></g>
        <g transform="translate(106,64) scale(0.50)"><use href="#bloom" /></g>
        <g transform="translate(72,26) scale(0.62)"><use href="#bloom" /></g>
      </>
    ),
    withered: (
      <>
        <path d="M96 185 Q94 154 102 126 Q108 112 120 108 Q130 106 132 116" stroke="var(--dead-mid)" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M99 146 Q84 140 72 128" stroke="var(--dead-mid)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* The stem ends at (132,116); translating the petal hinge (50,50) onto
            that point is what keeps the head attached to it. */}
        <g transform="translate(132,116) rotate(150) scale(0.40) translate(-50,-50)">
          <g fill="url(#gPetalDead)">
            <use href="#petal" />
            <use href="#petal" transform="rotate(72 50 50)" />
            <use href="#petal" transform="rotate(288 50 50)" />
          </g>
        </g>
        <ellipse cx="72" cy="128" rx="5" ry="2.4" fill="var(--dead-leaf)" opacity="0.8" transform="rotate(-42 72 128)" />
        <g fill="var(--dead-pet)" opacity="0.75">
          <ellipse cx="78" cy="186" rx="5" ry="2" />
          <ellipse cx="120" cy="185" rx="4.4" ry="1.9" />
          <ellipse cx="100" cy="189" rx="4" ry="1.7" />
        </g>
      </>
    ),
  },

  // ── FERN ────────────────────────────────────────────────────────────────
  fern: {
    1: <g transform="translate(100,184) scale(0.8)"><use href="#fiddle" /></g>,
    2: (
      <>
        <g transform="translate(92,184) scale(0.62) rotate(-14)"><use href="#frond" /></g>
        <g transform="translate(110,184) scale(0.56) rotate(16)"><use href="#frond" /></g>
        <g transform="translate(100,182) scale(0.7)"><use href="#fiddle" /></g>
      </>
    ),
    3: (
      <>
        <g transform="translate(86,185) scale(0.86) rotate(-30)"><use href="#frond" /></g>
        <g transform="translate(114,185) scale(0.82) rotate(30)"><use href="#frond" /></g>
        <g transform="translate(94,184) scale(0.9) rotate(-10)"><use href="#frond" /></g>
        <g transform="translate(108,184) scale(0.88) rotate(12)"><use href="#frond" /></g>
      </>
    ),
    4: (
      <>
        <g transform="translate(78,186) scale(1.02) rotate(-52)"><use href="#frond" /></g>
        <g transform="translate(122,186) scale(1.0) rotate(52)"><use href="#frond" /></g>
        <g transform="translate(84,185) scale(1.12) rotate(-32)"><use href="#frond" /></g>
        <g transform="translate(116,185) scale(1.1) rotate(32)"><use href="#frond" /></g>
        <g transform="translate(92,184) scale(1.2) rotate(-14)"><use href="#frond" /></g>
        <g transform="translate(108,184) scale(1.18) rotate(14)"><use href="#frond" /></g>
        <g transform="translate(100,183) scale(1.24)"><use href="#frond" /></g>
      </>
    ),
    withered: (
      <>
        <g opacity="0.9">
          <path d="M92 185 Q86 166 72 156 M72 156 l-7 -3 M78 162 l-8 -2 M84 170 l-9 -2" stroke="var(--dead-mid)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M106 185 Q116 168 132 160 M132 160 l7 -4 M124 165 l8 -3 M116 172 l8 -3" stroke="var(--dead-mid)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M100 184 Q102 162 96 146 M96 146 l-6 -5 M98 156 l-7 -4" stroke="var(--dead-hi)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
        <g fill="var(--dead-leaf)" opacity="0.55">
          <ellipse cx="84" cy="187" rx="4.4" ry="1.7" />
          <ellipse cx="116" cy="186" rx="4" ry="1.6" />
        </g>
      </>
    ),
  },

  // ── BAMBOO ──────────────────────────────────────────────────────────────
  bamboo: {
    1: (
      <>
        <path d="M100 186 Q94 172 100 160 Q106 172 100 186 Z" fill="var(--bam-mid)" />
        <path d="M100 186 Q97 174 100 164" stroke="var(--bam-dk)" strokeWidth="0.9" fill="none" opacity="0.6" />
      </>
    ),
    2: (
      <>
        <rect x="96" y="140" width="8" height="46" rx="3" fill="url(#gBamboo)" />
        <path d="M96 172 h8 M96 156 h8" stroke="var(--bam-dk)" strokeWidth="1.4" />
        <g transform="translate(100,154) scale(0.7)"><use href="#bamLeaves" /></g>
        <g transform="translate(100,140) scale(0.8)"><use href="#bamLeaves" /></g>
      </>
    ),
    3: (
      <>
        <rect x="88" y="118" width="8" height="68" rx="3" fill="url(#gBamboo)" />
        <path d="M88 166 h8 M88 146 h8 M88 128 h8" stroke="var(--bam-dk)" strokeWidth="1.4" />
        <rect x="106" y="134" width="7" height="52" rx="3" fill="url(#gBamboo)" opacity="0.9" />
        <path d="M106 168 h7 M106 150 h7" stroke="var(--bam-dk)" strokeWidth="1.2" />
        <g transform="translate(92,144) scale(0.78)"><use href="#bamLeaves" /></g>
        <g transform="translate(92,120) scale(0.9)"><use href="#bamLeaves" /></g>
        <g transform="translate(110,136) scale(0.72)"><use href="#bamLeaves" /></g>
      </>
    ),
    4: (
      <>
        <rect x="112" y="106" width="7" height="80" rx="3" fill="url(#gBamboo)" opacity="0.85" />
        <path d="M112 160 h7 M112 138 h7 M112 118 h7" stroke="var(--bam-dk)" strokeWidth="1.2" />
        <rect x="82" y="92" width="9" height="94" rx="3.5" fill="url(#gBamboo)" />
        <path d="M82 158 h9 M82 134 h9 M82 112 h9" stroke="var(--bam-dk)" strokeWidth="1.5" />
        <rect x="97" y="118" width="8" height="68" rx="3" fill="url(#gBamboo)" />
        <path d="M97 164 h8 M97 142 h8 M97 126 h8" stroke="var(--bam-dk)" strokeWidth="1.4" />
        <g transform="translate(86,134) scale(0.9)"><use href="#bamLeaves" /></g>
        <g transform="translate(86,110) scale(1.05)"><use href="#bamLeaves" /></g>
        <g transform="translate(86,92) scale(0.9)"><use href="#bamLeaves" /></g>
        <g transform="translate(101,142) scale(0.8)"><use href="#bamLeaves" /></g>
        <g transform="translate(101,120) scale(0.95)"><use href="#bamLeaves" /></g>
        <g transform="translate(115,120) scale(0.75)"><use href="#bamLeaves" /></g>
        <g transform="translate(115,106) scale(0.85)"><use href="#bamLeaves" /></g>
      </>
    ),
    withered: (
      <>
        <rect x="82" y="104" width="9" height="82" rx="3.5" fill="url(#gDead)" />
        <path d="M82 158 h9 M82 134 h9 M82 116 h9" stroke="var(--dead-dk)" strokeWidth="1.4" />
        <rect x="99" y="126" width="8" height="60" rx="3" fill="url(#gDead)" transform="rotate(7 103 186)" />
        <path d="M104 172 h8 M106 150 h8" stroke="var(--dead-dk)" strokeWidth="1.2" />
        <g fill="var(--dead-leaf)" opacity="0.7">
          <path d="M91 128 Q102 122 112 126 Q100 132 91 128 Z" />
          <path d="M82 150 Q71 146 63 150 Q74 155 82 150 Z" />
        </g>
        <ellipse cx="120" cy="186" rx="5" ry="1.8" fill="var(--dead-leaf)" opacity="0.5" />
      </>
    ),
  },

  // ── CACTUS ──────────────────────────────────────────────────────────────
  cactus: {
    1: (
      <>
        <ellipse cx="100" cy="178" rx="11" ry="10" fill="url(#gCactus)" />
        <path d="M94 172 v11 M100 170 v14 M106 172 v11" stroke="var(--cact-dk)" strokeWidth="0.8" opacity="0.5" />
        <g stroke="var(--spine)" strokeWidth="0.8" strokeLinecap="round">
          <path d="M94 174 l-3 -2 M100 170 l0 -3 M106 174 l3 -2 M97 182 l-2 2 M104 182 l2 2" />
        </g>
      </>
    ),
    2: (
      <>
        <path d="M91 186 Q90 152 100 148 Q110 152 109 186 Z" fill="url(#gCactus)" />
        <path d="M96 184 Q95 158 100 152 M104 184 Q105 158 100 152" stroke="var(--cact-dk)" strokeWidth="0.9" fill="none" opacity="0.45" />
        <g stroke="var(--spine)" strokeWidth="0.8" strokeLinecap="round">
          <path d="M91 176 l-3 -1 M91 166 l-3 -1 M109 176 l3 -1 M109 166 l3 -1 M100 149 l0 -3" />
        </g>
      </>
    ),
    3: (
      <>
        <path d="M89 186 Q88 138 100 132 Q112 138 111 186 Z" fill="url(#gCactus)" />
        <path d="M89 162 Q76 160 74 146 Q74 136 80 134 Q86 136 86 146 L86 160 Z" fill="url(#gCactus)" />
        <path d="M95 184 Q94 146 100 138 M105 184 Q106 146 100 138" stroke="var(--cact-dk)" strokeWidth="0.9" fill="none" opacity="0.45" />
        <path d="M80 158 Q78 148 80 140" stroke="var(--cact-dk)" strokeWidth="0.8" fill="none" opacity="0.4" />
        <g stroke="var(--spine)" strokeWidth="0.8" strokeLinecap="round">
          <path d="M89 172 l-3 -1 M89 152 l-3 -1 M111 172 l3 -1 M111 152 l3 -1 M100 133 l0 -3 M74 144 l-3 -1 M80 133 l0 -3" />
        </g>
      </>
    ),
    4: (
      <>
        <path d="M87 186 Q86 120 100 114 Q114 120 113 186 Z" fill="url(#gCactus)" />
        <path d="M87 158 Q72 156 70 140 Q70 128 77 126 Q84 128 84 140 L84 156 Z" fill="url(#gCactus)" />
        <path d="M113 150 Q128 148 130 134 Q130 124 124 122 Q117 124 117 134 L117 148 Z" fill="url(#gCactus)" />
        <path d="M94 184 Q93 130 100 120 M106 184 Q107 130 100 120" stroke="var(--cact-dk)" strokeWidth="0.9" fill="none" opacity="0.45" />
        <g stroke="var(--spine)" strokeWidth="0.8" strokeLinecap="round">
          <path d="M87 170 l-3 -1 M87 146 l-3 -1 M113 170 l3 -1 M113 140 l3 -1 M70 138 l-3 -1 M130 132 l3 -1 M77 125 l0 -3 M124 121 l0 -3" />
        </g>
        <g transform="translate(100,112) scale(0.30)"><use href="#bloom" /></g>
        <g transform="translate(77,124) scale(0.20)"><use href="#bloom" /></g>
        <g transform="translate(124,120) scale(0.18)"><use href="#bloom" /></g>
      </>
    ),
    withered: (
      <>
        <path d="M89 186 Q92 140 100 132 Q108 142 111 186 Z" fill="url(#gDead)" />
        <path d="M89 158 Q76 158 74 146 Q75 138 80 138 Q84 142 84 150 L85 157 Z" fill="url(#gDead)" opacity="0.85" />
        <path d="M95 184 Q97 148 100 138 M105 184 Q104 150 100 138" stroke="var(--dead-dk)" strokeWidth="1" fill="none" opacity="0.5" />
        <path d="M92 176 q4 -3 8 0 M92 164 q4 -3 8 0 M92 152 q4 -3 8 0" stroke="var(--dead-dk)" strokeWidth="0.8" fill="none" opacity="0.4" />
      </>
    ),
  },

  // ── SUCCULENT ───────────────────────────────────────────────────────────
  succulent: {
    1: (
      <g fill="url(#gSucc)" transform="translate(100,186) scale(0.30)">
        <use href="#succLeaf" />
        <use href="#succLeaf" transform="rotate(120)" />
        <use href="#succLeaf" transform="rotate(240)" />
      </g>
    ),
    2: (
      <g fill="url(#gSucc)" transform="translate(100,186) scale(0.46)">
        <use href="#succLeaf" />
        <use href="#succLeaf" transform="rotate(60)" />
        <use href="#succLeaf" transform="rotate(120)" />
        <use href="#succLeaf" transform="rotate(180)" />
        <use href="#succLeaf" transform="rotate(240)" />
        <use href="#succLeaf" transform="rotate(300)" />
      </g>
    ),
    3: (
      <>
        <g fill="url(#gSucc)" transform="translate(100,186) scale(0.62)" opacity="0.9">
          <use href="#succLeaf" transform="rotate(30)" />
          <use href="#succLeaf" transform="rotate(90)" />
          <use href="#succLeaf" transform="rotate(150)" />
          <use href="#succLeaf" transform="rotate(210)" />
          <use href="#succLeaf" transform="rotate(270)" />
          <use href="#succLeaf" transform="rotate(330)" />
        </g>
        <g fill="url(#gSucc)" transform="translate(100,186) scale(0.42)">
          <use href="#succLeaf" />
          <use href="#succLeaf" transform="rotate(72)" />
          <use href="#succLeaf" transform="rotate(144)" />
          <use href="#succLeaf" transform="rotate(216)" />
          <use href="#succLeaf" transform="rotate(288)" />
        </g>
        <g fill="url(#gSucc)" transform="translate(128,188) scale(0.22)">
          <use href="#succLeaf" />
          <use href="#succLeaf" transform="rotate(120)" />
          <use href="#succLeaf" transform="rotate(240)" />
        </g>
      </>
    ),
    4: (
      <>
        <g fill="url(#gSucc)" transform="translate(100,186) scale(0.86)" opacity="0.85">
          <use href="#succLeaf" transform="rotate(22)" />
          <use href="#succLeaf" transform="rotate(67)" />
          <use href="#succLeaf" transform="rotate(112)" />
          <use href="#succLeaf" transform="rotate(157)" />
          <use href="#succLeaf" transform="rotate(202)" />
          <use href="#succLeaf" transform="rotate(247)" />
          <use href="#succLeaf" transform="rotate(292)" />
          <use href="#succLeaf" transform="rotate(337)" />
        </g>
        <g fill="url(#gSucc)" transform="translate(100,186) scale(0.62)" opacity="0.93">
          <use href="#succLeaf" transform="rotate(30)" />
          <use href="#succLeaf" transform="rotate(90)" />
          <use href="#succLeaf" transform="rotate(150)" />
          <use href="#succLeaf" transform="rotate(210)" />
          <use href="#succLeaf" transform="rotate(270)" />
          <use href="#succLeaf" transform="rotate(330)" />
        </g>
        <g fill="url(#gSucc)" transform="translate(100,186) scale(0.38)">
          <use href="#succLeaf" />
          <use href="#succLeaf" transform="rotate(72)" />
          <use href="#succLeaf" transform="rotate(144)" />
          <use href="#succLeaf" transform="rotate(216)" />
          <use href="#succLeaf" transform="rotate(288)" />
        </g>
        <g fill="url(#gSucc)" transform="translate(132,188) scale(0.30)">
          <use href="#succLeaf" />
          <use href="#succLeaf" transform="rotate(90)" />
          <use href="#succLeaf" transform="rotate(180)" />
          <use href="#succLeaf" transform="rotate(270)" />
        </g>
        <g fill="url(#gSucc)" transform="translate(68,189) scale(0.24)">
          <use href="#succLeaf" />
          <use href="#succLeaf" transform="rotate(120)" />
          <use href="#succLeaf" transform="rotate(240)" />
        </g>
      </>
    ),
    withered: (
      <>
        <g fill="url(#gDead)" transform="translate(100,186) scale(0.62)" opacity="0.9">
          <use href="#succLeaf" transform="rotate(34)" />
          <use href="#succLeaf" transform="rotate(104)" />
          <use href="#succLeaf" transform="rotate(186)" />
          <use href="#succLeaf" transform="rotate(256)" />
          <use href="#succLeaf" transform="rotate(310)" />
        </g>
        <g fill="var(--dead-leaf)" opacity="0.55">
          <ellipse cx="76" cy="187" rx="5" ry="2" transform="rotate(-20 76 187)" />
          <ellipse cx="124" cy="186" rx="4.6" ry="1.9" transform="rotate(16 124 186)" />
        </g>
      </>
    ),
  },

  // ── ORCHID ──────────────────────────────────────────────────────────────
  orchid: {
    1: (
      <>
        <ellipse cx="92" cy="178" rx="12" ry="5" fill="var(--leaf-mid)" transform="rotate(-10 92 178)" />
        <ellipse cx="109" cy="180" rx="10" ry="4.4" fill="var(--leaf-hi)" transform="rotate(8 109 180)" />
      </>
    ),
    2: (
      <>
        <ellipse cx="80" cy="176" rx="20" ry="7" fill="var(--leaf-mid)" transform="rotate(-12 80 176)" />
        <ellipse cx="120" cy="178" rx="19" ry="6.6" fill="var(--leaf-hi)" transform="rotate(10 120 178)" />
        <ellipse cx="96" cy="168" rx="14" ry="5.4" fill="var(--leaf-dk)" transform="rotate(-6 96 168)" />
      </>
    ),
    3: (
      <>
        <ellipse cx="80" cy="177" rx="21" ry="7.2" fill="var(--leaf-mid)" transform="rotate(-12 80 177)" />
        <ellipse cx="121" cy="179" rx="20" ry="6.8" fill="var(--leaf-hi)" transform="rotate(10 121 179)" />
        <path d="M100 176 Q104 148 96 124" stroke="var(--stem)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <ellipse cx="96" cy="124" rx="5" ry="7" fill="var(--orch-mid)" transform="rotate(-8 96 124)" />
        <ellipse cx="102" cy="138" rx="4.2" ry="6" fill="var(--orch-dk)" transform="rotate(10 102 138)" />
        <ellipse cx="100" cy="152" rx="3.6" ry="5" fill="var(--orch-dk)" opacity="0.8" />
      </>
    ),
    4: (
      <>
        <ellipse cx="78" cy="178" rx="22" ry="7.6" fill="var(--leaf-mid)" transform="rotate(-12 78 178)" />
        <ellipse cx="122" cy="180" rx="21" ry="7" fill="var(--leaf-hi)" transform="rotate(10 122 180)" />
        <ellipse cx="98" cy="170" rx="15" ry="5.6" fill="var(--leaf-dk)" transform="rotate(-5 98 170)" />
        <path d="M100 174 Q112 146 104 116 Q100 100 88 92" stroke="var(--stem)" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        <g transform="translate(108,150) scale(0.82)"><use href="#orchid" /></g>
        <g transform="translate(107,120) scale(0.92)"><use href="#orchid" /></g>
        <g transform="translate(92,96) scale(0.86)"><use href="#orchid" /></g>
        <ellipse cx="82" cy="84" rx="4" ry="5.6" fill="var(--orch-mid)" transform="rotate(-18 82 84)" />
      </>
    ),
    withered: (
      <>
        <ellipse cx="80" cy="179" rx="20" ry="6.4" fill="var(--dead-mid)" transform="rotate(-14 80 179)" />
        <ellipse cx="120" cy="181" rx="18" ry="5.8" fill="var(--dead-hi)" opacity="0.8" transform="rotate(12 120 181)" />
        <path d="M100 176 Q106 150 100 126 Q98 118 92 116" stroke="var(--dead-mid)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g transform="translate(92,116) rotate(160) scale(0.5) translate(-50,-50)" opacity="0.75">
          <g fill="url(#gPetalDead)">
            <use href="#petal" />
            <use href="#petal" transform="rotate(100 50 50)" />
          </g>
        </g>
        <g fill="var(--dead-pet)" opacity="0.6">
          <ellipse cx="86" cy="187" rx="4.6" ry="1.9" />
          <ellipse cx="114" cy="186" rx="4" ry="1.7" />
        </g>
      </>
    ),
  },

  // ── LAVENDER ────────────────────────────────────────────────────────────
  lavender: {
    1: (
      <path
        d="M100 185 L100 172 M100 178 L94 170 M100 178 L106 170"
        stroke="var(--lav-leaf)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    ),
    2: (
      <g stroke="var(--lav-leaf)" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <path d="M100 185 L88 160 M100 185 L94 156 M100 185 L100 152 M100 185 L106 156 M100 185 L112 160 M100 185 L82 166 M100 185 L118 166" />
      </g>
    ),
    3: (
      <>
        <g stroke="var(--lav-leaf)" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d="M100 185 L86 156 M100 185 L93 150 M100 185 L107 150 M100 185 L114 156 M100 185 L80 164 M100 185 L120 164" />
        </g>
        <g transform="translate(92,156) rotate(-10) scale(0.72)"><use href="#lavSpike" /></g>
        <g transform="translate(100,152) scale(0.8)"><use href="#lavSpike" /></g>
        <g transform="translate(109,156) rotate(11) scale(0.7)"><use href="#lavSpike" /></g>
      </>
    ),
    4: (
      <>
        <g stroke="var(--lav-leaf)" strokeWidth="1.9" strokeLinecap="round" fill="none">
          <path d="M100 185 L78 158 M100 185 L86 148 M100 185 L93 142 M100 185 L100 140 M100 185 L107 142 M100 185 L114 148 M100 185 L122 158 M100 185 L74 168 M100 185 L126 168" />
        </g>
        <g transform="translate(80,158) rotate(-26) scale(0.8)"><use href="#lavSpike" /></g>
        <g transform="translate(88,148) rotate(-16) scale(0.92)"><use href="#lavSpike" /></g>
        <g transform="translate(94,142) rotate(-7) scale(1.02)"><use href="#lavSpike" /></g>
        <g transform="translate(100,140) scale(1.08)"><use href="#lavSpike" /></g>
        <g transform="translate(106,142) rotate(7) scale(1.0)"><use href="#lavSpike" /></g>
        <g transform="translate(113,148) rotate(17) scale(0.9)"><use href="#lavSpike" /></g>
        <g transform="translate(120,158) rotate(27) scale(0.78)"><use href="#lavSpike" /></g>
      </>
    ),
    withered: (
      <>
        <g stroke="var(--dead-mid)" strokeWidth="1.7" strokeLinecap="round" fill="none">
          <path d="M100 185 L84 160 M100 185 L92 152 M100 185 L101 148 M100 185 L110 154 M100 185 L118 162" />
        </g>
        <g fill="var(--dead-pet)" opacity="0.65">
          <ellipse cx="92" cy="150" rx="2.4" ry="4" transform="rotate(-14 92 150)" />
          <ellipse cx="101" cy="146" rx="2.2" ry="3.8" />
          <ellipse cx="110" cy="152" rx="2" ry="3.4" transform="rotate(12 110 152)" />
        </g>
        <g fill="var(--dead-pet)" opacity="0.45">
          <ellipse cx="84" cy="187" rx="3.4" ry="1.5" />
          <ellipse cx="117" cy="186" rx="3" ry="1.4" />
        </g>
      </>
    ),
  },
};

const STAGE_LABEL: Record<PlantStage, string> = {
  1: "seedling",
  2: "young",
  3: "growing",
  4: "fully grown",
  withered: "withered",
};

/** Plant body, pot and all — for placing inside an existing <svg> scene. */
export function PlantGroup({ type, stage }: { type: PlantType; stage: PlantStage }) {
  return (
    <>
      <use href="#pot" />
      {DESERT.has(type) && <use href="#grit" />}
      {stage === "withered" ? (
        <g>{ART[type].withered}</g>
      ) : (
        <g className="plant-sway">{ART[type][stage]}</g>
      )}
    </>
  );
}

/** Standalone plant on a 200×240 canvas. */
export default function PlantArt({
  type,
  stage,
  className,
}: {
  type: PlantType;
  stage: PlantStage;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label={`${type}, ${STAGE_LABEL[stage]}`}>
      <PlantGroup type={type} stage={stage} />
    </svg>
  );
}
