import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { ShoppingBag, Coins, Check, Sparkles, Frame, Palette, Shirt, X, Lock } from "lucide-react";
import { fetchApi, describeApiError } from "@/utils/api";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useInventory, type StoreItem } from "@/hooks/useInventory";

type Category = "avatar_frame" | "focus_background" | "pet_outfit";

const CATEGORY_LABELS: Record<Category, string> = {
  avatar_frame: "Avatar Frames",
  focus_background: "Focus Backgrounds",
  pet_outfit: "Pet Outfits",
};

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  avatar_frame: <Frame size={16} />,
  focus_background: <Palette size={16} />,
  pet_outfit: <Shirt size={16} />,
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-foreground bg-muted",
  rare: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",
  epic: "text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400",
  legendary: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400",
};

export default function Store() {
  const { wallet, refreshData } = useUser();
  const { toast } = useToast();
  const { equipped, refresh: refreshInventory } = useInventory();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeError, setStoreError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("avatar_frame");
  const [buying, setBuying] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);

  const balance = wallet?.balance ?? 0;

  const fetchItems = async () => {
    setStoreError(false);
    try {
      const data = await fetchApi<StoreItem[]>("/store/items");
      setItems(data);
    } catch {
      setStoreError(true);
      toast({ title: "Failed to load store", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleBuy = async (item: StoreItem) => {
    if (buying) return;
    setBuying(item.id);
    try {
      const result = await fetchApi<{ success: boolean; newBalance: number }>("/store/buy", {
        method: "POST",
        body: JSON.stringify({ itemId: item.id }),
      });
      toast({ title: `🎉 Purchased ${item.name}!`, description: `New balance: ${result.newBalance} coins` });
      await Promise.all([fetchItems(), refreshData(), refreshInventory()]);
    } catch (err: unknown) {
      toast({ ...describeApiError(err, "Purchase failed"), variant: "destructive" });
    } finally {
      setBuying(null);
    }
  };

  const handleEquip = async (item: StoreItem) => {
    if (equipping) return;
    setEquipping(item.id);
    try {
      await fetchApi("/store/equip", {
        method: "POST",
        body: JSON.stringify({ itemId: item.id, equipped: !item.equipped }),
      });
      toast({ title: item.equipped ? `Unequipped ${item.name}` : `✅ Equipped ${item.name}!` });
      await Promise.all([fetchItems(), refreshInventory()]);
    } catch {
      toast({ title: "Failed to equip item", variant: "destructive" });
    } finally {
      setEquipping(null);
    }
  };

  const categoryItems = items.filter((i) => i.category === activeCategory);
  const categories: Category[] = ["avatar_frame", "focus_background", "pet_outfit"];

  return (
    <MobileLayout>
      <div className="px-5 pt-6 space-y-5 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
              <ShoppingBag size={22} className="text-primary" /> Shop
            </h1>
            <p className="text-sm text-muted-foreground">Customize your experience</p>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5">
            <Coins size={15} className="text-[hsl(var(--coin))]" />
            <span className="text-sm font-bold text-foreground">{balance.toLocaleString()}</span>
          </div>
        </div>

        {/* Equipped Banner */}
        {(equipped.avatar_frame || equipped.focus_bg || equipped.pet_outfit) && (
          <div className="glass rounded-2xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Currently Equipped</p>
            <div className="flex gap-2 flex-wrap">
              {equipped.avatar_frame && (
                <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {equipped.avatar_frame.icon} {equipped.avatar_frame.name}
                </span>
              )}
              {equipped.focus_bg && (
                <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {equipped.focus_bg.icon} {equipped.focus_bg.name}
                </span>
              )}
              {equipped.pet_outfit && (
                <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {equipped.pet_outfit.icon} {equipped.pet_outfit.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              <span className="leading-none text-[10px]">
                {cat === "avatar_frame" ? "Frames" : cat === "focus_background" ? "Backgrounds" : "Pet Outfits"}
              </span>
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : storeError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">📡</div>
            <div>
              <p className="font-semibold text-foreground">Store unavailable</p>
              <p className="text-sm text-muted-foreground mt-1">Could not connect to the server.</p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchItems(); }}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : categoryItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No items available</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className={`glass rounded-2xl p-4 flex flex-col gap-3 cursor-pointer active:scale-95 transition-all relative overflow-hidden ${
                  item.equipped ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* Rarity badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${RARITY_COLORS[item.rarity]}`}>
                    {item.rarity}
                  </span>
                  {item.owned && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.equipped ? "bg-primary text-primary-foreground" : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"}`}>
                      {item.equipped ? "Equipped" : "Owned"}
                    </span>
                  )}
                </div>

                {/* Icon preview */}
                <div
                  className="w-full h-20 rounded-xl flex items-center justify-center text-4xl relative overflow-hidden"
                  style={{
                    background: item.category === "avatar_frame" && item.colorValue
                      ? item.colorValue.includes("gradient") ? item.colorValue : `${item.colorValue}33`
                      : item.category === "focus_background" && item.colorValue
                      ? item.colorValue
                      : "var(--color-muted)",
                  }}
                >
                  {item.category === "avatar_frame" ? (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                      style={{
                        background: item.colorValue?.includes("gradient") ? item.colorValue : undefined,
                        border: !item.colorValue?.includes("gradient") ? `3px solid ${item.colorValue}` : undefined,
                        backgroundColor: !item.colorValue?.includes("gradient") ? "var(--color-muted)" : undefined,
                      }}
                    >
                      A
                    </div>
                  ) : (
                    <span>{item.icon}</span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{item.description}</p>
                </div>

                {/* Price / Action */}
                {!item.owned ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                    disabled={!!buying || balance < item.price}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      balance < item.price
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground active:scale-95"
                    }`}
                  >
                    {buying === item.id ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : balance < item.price ? (
                      <>
                        <Lock size={11} />
                        <span>{item.price}</span>
                        <Coins size={11} />
                      </>
                    ) : (
                      <>
                        <Coins size={11} />
                        <span>{item.price}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEquip(item); }}
                    disabled={!!equipping}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      item.equipped
                        ? "bg-muted text-foreground active:scale-95"
                        : "bg-primary/10 text-primary active:scale-95"
                    }`}
                  >
                    {equipping === item.id ? (
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : item.equipped ? (
                      <><X size={11} /><span>Unequip</span></>
                    ) : (
                      <><Check size={11} /><span>Equip</span></>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewItem(null)} />
          <div className="relative w-full max-w-md bg-background rounded-t-3xl p-6 pb-28 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{previewItem.name}</h2>
              <button onClick={() => setPreviewItem(null)} className="p-2 rounded-xl hover:bg-muted transition">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Big preview */}
            <div
              className="w-full h-36 rounded-2xl flex items-center justify-center text-6xl"
              style={{
                background: previewItem.category === "avatar_frame" && previewItem.colorValue
                  ? previewItem.colorValue.includes("gradient") ? previewItem.colorValue : `${previewItem.colorValue}33`
                  : previewItem.category === "focus_background" && previewItem.colorValue
                  ? previewItem.colorValue
                  : "var(--color-muted)",
              }}
            >
              {previewItem.category === "avatar_frame" ? (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                  style={{
                    background: previewItem.colorValue?.includes("gradient") ? previewItem.colorValue : undefined,
                    border: !previewItem.colorValue?.includes("gradient") ? `4px solid ${previewItem.colorValue}` : undefined,
                  }}
                >
                  A
                </div>
              ) : (
                <span>{previewItem.icon}</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${RARITY_COLORS[previewItem.rarity]}`}>
                  <Sparkles size={10} className="inline mr-1" />{previewItem.rarity}
                </span>
                <span className="text-xs text-muted-foreground capitalize">{CATEGORY_LABELS[previewItem.category as Category]}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{previewItem.description}</p>
            </div>

            {!previewItem.owned ? (
              <button
                onClick={() => { handleBuy(previewItem); setPreviewItem(null); }}
                disabled={!!buying || balance < previewItem.price}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all ${
                  balance < previewItem.price
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground active:scale-95"
                }`}
              >
                {balance < previewItem.price ? (
                  <><Lock size={16} /><span>Need {previewItem.price} coins</span></>
                ) : (
                  <><Coins size={16} /><span>Buy for {previewItem.price} coins</span></>
                )}
              </button>
            ) : (
              <button
                onClick={() => { handleEquip(previewItem); setPreviewItem(null); }}
                disabled={!!equipping}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all ${
                  previewItem.equipped
                    ? "bg-muted text-foreground active:scale-95"
                    : "bg-primary text-primary-foreground active:scale-95"
                }`}
              >
                {previewItem.equipped
                  ? <><X size={16} /><span>Unequip</span></>
                  : <><Check size={16} /><span>Equip</span></>
                }
              </button>
            )}
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
