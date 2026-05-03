import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchApi } from "@/utils/api";
import { useAuth } from "@/context/AuthContext";

export type User = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  authProvider: string;
  studyMode: "light" | "night";
  notificationsEnabled: boolean;
  selectedPetId: string;
  unlockedPetIds: string[];
  createdAt: string;
};

export type Subject = {
  id: string;
  name: string;
  accentColor: string;
  totalFocusMinutes: number;
  sessionCount: number;
};

export type Plant = {
  id: string;
  subjectId: string;
  subjectName: string;
  growthLevel: number;
  growthPoints: number;
  maxGrowthPoints: number;
  accentColor: string;
};

export type PetMoodKey = "happy" | "neutral" | "sad";

export type UserStats = {
  totalFocusMinutes: number;
  totalSessions: number;
  completedSessions: number;
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  weekMinutes: number;
  plantCount: number;
  fullyGrownCount: number;
  petUnlocked: boolean;
  lastSessionDate: string | null;
  petMood: PetMoodKey;
};

export type Wallet = {
  balance: number;
};

type UserContextType = {
  userId: string;
  user: User | null;
  subjects: Subject[];
  plants: Plant[];
  stats: UserStats | null;
  wallet: Wallet | null;
  loading: boolean;
  refreshData: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { authUser } = useAuth();
  const userId = authUser?.id ?? "";
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [u, s, p, st, w] = await Promise.all([
        fetchApi<User>("/users/me").catch(() => null),
        fetchApi<Subject[]>("/subjects").catch(() => []),
        fetchApi<Plant[]>("/plants").catch(() => []),
        fetchApi<UserStats>("/stats").catch(() => null),
        fetchApi<Wallet>("/wallet").catch(() => null),
      ]);
      if (u) setUser(u);
      setSubjects(s as Subject[]);
      setPlants(p as Plant[]);
      if (st) setStats(st);
      if (w) setWallet(w);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      refreshData();
    }
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, user, subjects, plants, stats, wallet, loading, refreshData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
