import { useState } from "react";
import { X, Lock, Check, Coins, Timer } from "lucide-react";
import { PET_CATALOG, getPetById, getUnlockLabel, type PetDefinition } from "@/constants/pets";
import { fetchApi } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import PetArt from "@/components/pet/PetArt";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedPetId: string;
  unlockedPetIds: string[];
  walletBalance: number;
  totalMinutes: number;
  onPetChanged: () => void;
};

export function PetSelectModal({
  open, onClose, selectedPetId, unlockedPetIds, walletBalance, totalMinutes, onPetChanged,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  const canUnlock = (pet: PetDefinition): boolean => {
    if (pet.unlock.type === "free") return true;
    if (pet.unlock.type === "minutes") return totalMinutes >= pet.unlock.value;
    if (pet.unlock.type === "coins") return walletBalance >= pet.unlock.value;
    return false;
  };

  const handleSelect = async (petId: string) => {
    if (petId === selectedPetId) { onClose(); return; }
    setLoading(petId);
    try {
      await fetchApi("/pets/select", { method: "POST", body: JSON.stringify({ petId }) });
      toast({ title: `${getPetById(petId).name} is now your buddy!`, description: "Your pet has been updated" });
      await onPetChanged();
      onClose();
    } catch {
      toast({ title: "Couldn't select pet", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleUnlock = async (pet: PetDefinition) => {
    setLoading(pet.id);
    try {
      await fetchApi("/pets/unlock", { method: "POST", body: JSON.stringify({ petId: pet.id }) });
      toast({ title: `${pet.name} unlocked!`, description: "Tap to select them" });
      await onPetChanged();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Try again";
      toast({ title: "Couldn't unlock", description: message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-3xl p-5 space-y-4 pb-28">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Choose Your Buddy</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-all">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {PET_CATALOG.map((pet) => {
            const isUnlocked = unlockedPetIds.includes(pet.id);
            const isSelected = selectedPetId === pet.id;
            const isLoading  = loading === pet.id;
            const eligible   = canUnlock(pet);

            return (
              <div
                key={pet.id}
                className={`relative glass rounded-2xl p-4 flex items-center gap-4 transition-all border-2 ${
                  isSelected ? "border-primary" : "border-transparent"
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${pet.bgGradient} flex-shrink-0 ${!isUnlocked ? "opacity-40 grayscale" : ""}`}>
                  <PetArt
                    petId={pet.id}
                    state={isSelected ? "happy" : "neutral"}
                    accentColor={pet.accentColor}
                    className="w-[52px] h-[52px]"
                    label={pet.name}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-sm">{pet.name}</p>
                    {isSelected && (
                      <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{pet.description}</p>
                  {!isUnlocked && (
                    <div className="flex items-center gap-1 mt-1">
                      {pet.unlock.type === "coins" ? (
                        <Coins size={11} className="text-[hsl(var(--coin))]" />
                      ) : (
                        <Timer size={11} className="text-muted-foreground" />
                      )}
                      <span className="text-[10px] text-muted-foreground">{getUnlockLabel(pet.unlock)}</span>
                    </div>
                  )}
                </div>

                {isUnlocked ? (
                  <button
                    onClick={() => handleSelect(pet.id)}
                    disabled={isLoading || isSelected}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    {isLoading ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnlock(pet)}
                    disabled={isLoading || !eligible}
                    className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-40 flex-shrink-0"
                  >
                    {isLoading ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Lock size={11} />
                    )}
                    {eligible ? "Unlock" : "Locked"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
