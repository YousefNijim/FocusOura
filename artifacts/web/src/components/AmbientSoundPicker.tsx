import { X, Volume2 } from "lucide-react";
import { type SoundType, SOUND_TYPES } from "@/hooks/useAmbientSound";

type Props = {
  open: boolean;
  onClose: () => void;
  sound: SoundType;
  volume: number;
  onSoundChange: (s: SoundType) => void;
  onVolumeChange: (v: number) => void;
  SOUND_META: Record<SoundType, { label: string; emoji: string; description: string }>;
};

export function AmbientSoundPicker({ open, onClose, sound, volume, onSoundChange, onVolumeChange, SOUND_META }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-3xl p-5 space-y-4 pb-28">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Ambient Sound</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-all">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {SOUND_TYPES.map((s) => {
            const meta    = SOUND_META[s];
            const active  = sound === s;
            return (
              <button
                key={s}
                onClick={() => onSoundChange(s)}
                className={`rounded-2xl p-3 text-center transition-all border-2 space-y-1 ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-transparent glass hover:bg-card/80"
                }`}
              >
                <div className="text-2xl">{meta.emoji}</div>
                <p className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>{meta.label}</p>
              </button>
            );
          })}
        </div>

        {sound !== "off" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Volume</span>
              </div>
              <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-[hsl(var(--primary))]"
            />
          </div>
        )}

        {sound !== "off" && (
          <p className="text-xs text-muted-foreground text-center italic">
            {SOUND_META[sound].description}
          </p>
        )}
      </div>
    </div>
  );
}
