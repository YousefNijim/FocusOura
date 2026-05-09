import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/utils/api";

export type StoreItem = {
  id: string;
  name: string;
  description: string;
  category: "avatar_frame" | "focus_background" | "pet_outfit";
  price: number;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  colorValue: string | null;
  owned: boolean;
  equipped: boolean;
};

export type InventoryItem = {
  id: string;
  itemId: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  colorValue: string | null;
  equipped: boolean;
};

export type EquippedCosmetics = {
  avatar_frame: InventoryItem | null;
  focus_bg: InventoryItem | null;
  pet_outfit: InventoryItem | null;
};

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equipped, setEquipped] = useState<EquippedCosmetics>({
    avatar_frame: null,
    focus_bg: null,
    pet_outfit: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchApi<InventoryItem[]>("/store/inventory");
      setInventory(data);
      setEquipped({
        avatar_frame: data.find((i) => i.category === "avatar_frame" && i.equipped) ?? null,
        focus_bg: data.find((i) => i.category === "focus_background" && i.equipped) ?? null,
        pet_outfit: data.find((i) => i.category === "pet_outfit" && i.equipped) ?? null,
      });
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { inventory, equipped, loading, refresh };
}
