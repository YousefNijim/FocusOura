import { useState, useRef, useCallback, useEffect } from "react";

export type SoundType = "off" | "rain" | "ocean" | "cafe" | "forest" | "white";

const SOUND_META: Record<SoundType, { label: string; emoji: string; description: string }> = {
  off:    { label: "Silent",   emoji: "🔇", description: "No background sound"    },
  rain:   { label: "Rain",     emoji: "🌧️", description: "Soft rain on a window"   },
  ocean:  { label: "Ocean",    emoji: "🌊", description: "Gentle waves on a shore" },
  cafe:   { label: "Café",     emoji: "☕", description: "Warm café ambiance"       },
  forest: { label: "Forest",   emoji: "🌲", description: "Rustling leaves & birds" },
  white:  { label: "White",    emoji: "🌫️", description: "Clean white noise"        },
};

export const SOUND_TYPES = Object.keys(SOUND_META) as SoundType[];

function generateBuffer(ctx: AudioContext, type: SoundType): AudioBuffer {
  const rate       = ctx.sampleRate;
  const bufferSize = rate * 3;
  const buffer     = ctx.createBuffer(1, bufferSize, rate);
  const data       = buffer.getChannelData(0);

  if (type === "rain") {
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 4;
    }
  } else if (type === "ocean") {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0555179;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      data[i] = (b0 + b1 + b2 + w * 0.1848) / 5;
    }
  } else if (type === "cafe") {
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
  } else if (type === "forest") {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
  } else {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buffer;
}

function makeFilter(ctx: AudioContext, type: SoundType): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  if (type === "rain") {
    filter.type = "lowpass";
    filter.frequency.value = 500;
  } else if (type === "ocean") {
    filter.type = "lowpass";
    filter.frequency.value = 800;
  } else if (type === "cafe") {
    filter.type = "bandpass";
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;
  } else if (type === "forest") {
    filter.type = "bandpass";
    filter.frequency.value = 2500;
    filter.Q.value = 1.5;
  } else {
    filter.type = "allpass";
  }
  return filter;
}

type Engine = {
  ctx: AudioContext;
  gain: GainNode;
  source: AudioBufferSourceNode;
};

const STORAGE_KEY = "focusoura_ambient_sound";
const VOLUME_KEY  = "focusoura_ambient_volume";

export function useAmbientSound() {
  const [sound, setSoundState] = useState<SoundType>(() => {
    return (localStorage.getItem(STORAGE_KEY) as SoundType) ?? "off";
  });
  const [volume, setVolumeState] = useState<number>(() => {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "0.3");
    return isNaN(v) ? 0.3 : v;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const engineRef = useRef<Engine | null>(null);

  const stopEngine = useCallback(() => {
    if (engineRef.current) {
      try { engineRef.current.source.stop(); } catch {}
      try { engineRef.current.ctx.close(); } catch {}
      engineRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startEngine = useCallback((type: SoundType, vol: number) => {
    stopEngine();
    if (type === "off") return;
    try {
      const ctx    = new AudioContext();
      const buf    = generateBuffer(ctx, type);
      const filter = makeFilter(ctx, type);
      const gain   = ctx.createGain();
      gain.gain.value = vol;

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop   = true;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      engineRef.current = { ctx, gain, source };
      setIsPlaying(true);
    } catch (e) {
      console.warn("Ambient sound error:", e);
    }
  }, [stopEngine]);

  const setSound = useCallback((type: SoundType) => {
    localStorage.setItem(STORAGE_KEY, type);
    setSoundState(type);
    if (type === "off") {
      stopEngine();
    } else {
      startEngine(type, volume);
    }
  }, [volume, startEngine, stopEngine]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    localStorage.setItem(VOLUME_KEY, String(clamped));
    setVolumeState(clamped);
    if (engineRef.current) {
      engineRef.current.gain.gain.value = clamped;
    }
  }, []);

  const toggle = useCallback(() => {
    if (sound === "off") {
      const prev = (localStorage.getItem("focusoura_last_ambient") as SoundType) ?? "rain";
      setSound(prev);
    } else {
      localStorage.setItem("focusoura_last_ambient", sound);
      setSound("off");
    }
  }, [sound, setSound]);

  useEffect(() => {
    return () => { stopEngine(); };
  }, [stopEngine]);

  return { sound, volume, isPlaying, setSound, setVolume, toggle, SOUND_META };
}
