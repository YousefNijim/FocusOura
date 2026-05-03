import { useState, useEffect, useRef } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Coins, Flame, Sprout, ChevronRight, Leaf, Lock } from "lucide-react";
import plant1 from "@/assets/plant-1.png";
import plant2 from "@/assets/plant-2.png";
import plant3 from "@/assets/plant-3.png";
import petHappy from "@/assets/pet-happy.png";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { getPetById, getPetMoodFromKey } from "@/constants/pets";
import { PetSelectModal } from "@/components/PetSelectModal";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";

const plantImages = [plant1, plant2, plant3];
const PET_UNLOCK_THRESHOLD = 5;
const PET_CELEBRATED_KEY = (userId: string) => `focusoura_pet_unlocked_${userId}`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, subjects, plants, stats, wallet, loading, refreshData } = useUser();
  const [showPetModal, setShowPetModal] = useState(false);
  const { toast } = useToast();
  const celebratedRef = useRef(false);
  const { equipped } = useInventory();
  const petOutfit = equipped.pet_outfit;

  const displayName = user?.displayName || "Student";
  const balance = wallet?.balance ?? 0;
  const streak = stats?.currentStreak ?? 0;
  const todayMinutes = stats?.todayMinutes ?? 0;
  const totalMinutes = stats?.totalFocusMinutes ?? 0;
  const fullyGrownCount = stats?.fullyGrownCount ?? 0;
  const petUnlocked = stats?.petUnlocked ?? false;
  const petMoodKey = stats?.petMood ?? "neutral";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const firstPlant = plants[0];
  const firstSubject = subjects.find((s) => s.id === firstPlant?.subjectId) || subjects[0];

  const selectedPetId  = user?.selectedPetId ?? "mochi";
  const unlockedPetIds = user?.unlockedPetIds ?? ["mochi"];
  const activePet      = getPetById(selectedPetId);
  const petMood        = getPetMoodFromKey(petMoodKey);

  const plantsToUnlock = Math.max(0, PET_UNLOCK_THRESHOLD - fullyGrownCount);
  const userId = user?.id ?? "";

  useEffect(() => {
    if (!petUnlocked || loading || celebratedRef.current || !userId) return;
    const celebratedKey = PET_CELEBRATED_KEY(userId);
    const alreadyCelebrated = localStorage.getItem(celebratedKey) === "true";
    if (!alreadyCelebrated) {
      celebratedRef.current = true;
      localStorage.setItem(celebratedKey, "true");
      toast({
        title: "🎉 Study Pet Unlocked!",
        description: "You've fully grown 5 plants! Your study pet companion is now active.",
        duration: 5000,
      });
    }
  }, [petUnlocked, loading, userId, toast]);

  return (
    <MobileLayout>
      <div className="px-5 pt-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              {greeting} <Leaf size={14} className="text-primary" />
            </p>
            <h1 className="text-2xl font-serif text-foreground">
              {loading ? "Loading..." : `Welcome, ${displayName}`}
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-card rounded-full px-3 py-1.5 border border-border">
            <Coins size={16} className="text-[hsl(var(--coin))]" />
            <span className="text-sm font-semibold text-foreground">
              {balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 text-sm">Current Streak</p>
              <div className="flex items-center gap-2 mt-1">
                <Flame size={24} />
                <span className="text-3xl font-bold">
                  {streak} {streak === 1 ? "Day" : "Days"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-primary-foreground/70 text-sm">Today</p>
              <p className="text-2xl font-bold">{todayMinutes}m</p>
            </div>
          </div>
        </div>

        {/* Start Session CTA */}
        <button
          onClick={() => navigate("/focus")}
          className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:bg-card/80 transition-all active:scale-98 border border-primary/20"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sprout size={24} className="text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-foreground">Start Focus Session</p>
            <p className="text-sm text-muted-foreground">Grow your plants with deep focus</p>
          </div>
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>

        {/* Pet & Plant Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Study Pet Card */}
          {petUnlocked ? (
            <button
              onClick={() => setShowPetModal(true)}
              className="glass rounded-2xl p-4 flex flex-col items-center hover:bg-card/80 transition-all active:scale-98"
            >
              <div className="relative">
                {selectedPetId === "mochi" ? (
                  <img src={petHappy} alt="Study Pet" width={72} height={72} className="animate-float" />
                ) : (
                  <div className="w-[72px] h-[72px] flex items-center justify-center text-5xl animate-float">
                    {activePet.emoji}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 text-lg">{petMood.emoji}</span>
                {petOutfit && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg leading-none">{petOutfit.icon}</span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground mt-3">{activePet.name}</p>
              <p className="text-xs text-muted-foreground">{petMood.label}</p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: petMood.key === "happy" ? "100%" : petMood.key === "neutral" ? "55%" : "20%",
                    backgroundColor: activePet.accentColor,
                  }}
                />
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate("/garden")}
              className="glass rounded-2xl p-4 flex flex-col items-center hover:bg-card/80 transition-all active:scale-98 relative overflow-hidden"
            >
              <div className="relative">
                <div className="w-[72px] h-[72px] rounded-full bg-muted flex items-center justify-center">
                  <Lock size={28} className="text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground mt-3">Study Pet</p>
              <p className="text-xs text-muted-foreground text-center leading-tight">
                Fully grow {plantsToUnlock} more plant{plantsToUnlock !== 1 ? "s" : ""} to unlock
              </p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, (fullyGrownCount / PET_UNLOCK_THRESHOLD) * 100)}%` }}
                />
              </div>
            </button>
          )}

          {firstPlant && firstSubject ? (
            <div
              className="glass rounded-2xl p-4 flex flex-col items-center cursor-pointer hover:bg-card/80 transition-all"
              onClick={() => navigate("/garden")}
            >
              <img
                src={
                  plantImages[Math.min(firstPlant.growthLevel - 1, plantImages.length - 1)] ||
                  plant1
                }
                alt="Plant"
                width={72}
                height={72}
                className="animate-float"
                style={{ animationDelay: "0.5s" }}
              />
              <p className="text-sm font-medium text-foreground mt-3">{firstSubject.name}</p>
              <p className="text-xs text-muted-foreground">Lvl {firstPlant.growthLevel}</p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (firstPlant.growthPoints / firstPlant.maxGrowthPoints) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              className="glass rounded-2xl p-4 flex flex-col items-center cursor-pointer hover:bg-card/80 transition-all"
              onClick={() => navigate("/garden")}
            >
              <div className="w-[72px] h-[72px] rounded-full bg-muted flex items-center justify-center">
                <Sprout size={32} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mt-3">No plants yet</p>
              <p className="text-xs text-muted-foreground">Add a subject</p>
            </div>
          )}
        </div>

        {/* Stats Link */}
        <button
          className="w-full glass rounded-xl p-4 flex items-center justify-between mb-4"
          onClick={() => navigate("/profile")}
        >
          <div className="text-left">
            <p className="font-semibold text-foreground text-sm">My Stats</p>
            <p className="text-xs text-muted-foreground">
              {stats?.completedSessions ?? 0} sessions completed
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </div>

      {petUnlocked && (
        <PetSelectModal
          open={showPetModal}
          onClose={() => setShowPetModal(false)}
          selectedPetId={selectedPetId}
          unlockedPetIds={unlockedPetIds}
          walletBalance={balance}
          totalMinutes={totalMinutes}
          onPetChanged={refreshData}
        />
      )}
    </MobileLayout>
  );
};

export default Dashboard;
