import { MobileLayout } from "@/components/MobileLayout";
import {
  User,
  Flame,
  Clock,
  BookOpen,
  Coins,
  Trophy,
  Leaf,
  LogOut,
  Camera,
  Settings,
  Shield,
  Mail,
  ChevronRight,
  X,
  Moon,
  Sun,
  Bell,
  BellOff,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/utils/api";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useInventory } from "@/hooks/useInventory";

type Modal = "settings" | "privacy" | "contact" | null;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 300;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function Profile() {
  const { user, stats, wallet, subjects, refreshData } = useUser();
  const { logout, authUser, updateAuthUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const { equipped } = useInventory();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const equippedFrame = equipped.avatar_frame;
  const frameStyle = equippedFrame?.colorValue
    ? equippedFrame.colorValue.includes("gradient")
      ? { background: equippedFrame.colorValue, padding: "3px" }
      : { border: `3px solid ${equippedFrame.colorValue}`, padding: "2px" }
    : {};

  const totalMinutes = stats?.totalFocusMinutes ?? 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const updated = await fetchApi<{ displayName: string }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: newName.trim() }),
      });
      await refreshData();
      updateAuthUser({ displayName: updated.displayName });
      toast({ title: "Name updated!" });
      setEditing(false);
    } catch {
      toast({ title: "Error", description: "Could not update name", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImage(file);
      await fetchApi("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      updateAuthUser({ avatarUrl: dataUrl });
      toast({ title: "Photo updated!" });
    } catch {
      toast({ title: "Error", description: "Could not upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      await fetchApi("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: null }),
      });
      updateAuthUser({ avatarUrl: null });
      toast({ title: "Photo removed" });
    } catch {
      toast({ title: "Error", description: "Could not remove photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleSetting = async (key: "studyMode" | "notificationsEnabled", value: unknown) => {
    setSettingsSaving(true);
    try {
      const updated = await fetchApi<Record<string, unknown>>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
      updateAuthUser({ [key]: updated[key] });
      await refreshData();
    } catch {
      toast({ title: "Error", description: "Could not save setting", variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const avatarUrl = authUser?.avatarUrl;
  const isNight = authUser?.studyMode === "night";
  const notifEnabled = authUser?.notificationsEnabled ?? true;

  return (
    <MobileLayout>
      <div className="px-5 pt-6 space-y-5 pb-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
            <Leaf size={22} className="text-primary" /> Profile
          </h1>
          <p className="text-sm text-muted-foreground">Your study journey</p>
        </div>

        {/* Profile Card */}
        <div className="glass rounded-2xl p-5 flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
              style={equippedFrame ? { ...frameStyle, backgroundColor: "var(--color-primary-10, hsl(var(--primary) / 0.1))", borderRadius: "9999px" } : { backgroundColor: "hsl(var(--primary) / 0.1)" }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User size={32} className="text-primary" />
              )}
            </div>
            {equippedFrame && (
              <span className="absolute -top-1 -left-1 text-xs">{equippedFrame.icon}</span>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow disabled:opacity-50"
              title="Change photo"
            >
              {uploadingPhoto ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={12} className="text-white" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Name & Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  maxLength={30}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-2 py-1.5 border border-border rounded-lg text-sm text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-foreground truncate">
                  {user?.displayName || "Student"}
                </p>
                <button
                  onClick={() => { setNewName(user?.displayName || ""); setEditing(true); }}
                  className="text-muted-foreground hover:text-foreground transition flex-shrink-0"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {authUser?.userCode && (
                <span className="text-xs font-mono text-muted-foreground">
                  #{authUser.userCode}
                </span>
              )}
              <div className="flex items-center gap-1">
                <Coins size={13} className="text-[hsl(var(--coin))]" />
                <span className="text-sm text-muted-foreground">
                  {(wallet?.balance ?? 0).toLocaleString()} coins
                </span>
                <button
                  onClick={() => navigate("/wallet/transactions")}
                  className="text-[10px] text-primary underline ml-1"
                >
                  History
                </button>
              </div>
              {authUser?.role && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                  {authUser.role}
                </span>
              )}
            </div>
            {avatarUrl && (
              <button
                onClick={handleRemovePhoto}
                disabled={uploadingPhoto}
                className="mt-1 text-xs text-muted-foreground underline disabled:opacity-50"
              >
                Remove photo
              </button>
            )}
          </div>

          <button
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
            className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
            title="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Flame size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="text-lg font-bold text-foreground">{stats?.currentStreak ?? 0}</p>
            </div>
          </div>
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Study</p>
              <p className="text-lg font-bold text-foreground">
                {totalHours}h {remMinutes}m
              </p>
            </div>
          </div>
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-lg font-bold text-foreground">{stats?.completedSessions ?? 0}</p>
            </div>
          </div>
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subjects</p>
              <p className="text-lg font-bold text-foreground">{subjects.length}</p>
            </div>
          </div>
        </div>

        {/* Subjects Breakdown */}
        {subjects.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground text-sm">Subject Breakdown</h2>
            <div className="space-y-2">
              {subjects.map((s) => {
                const percent = totalMinutes > 0 ? Math.round((s.totalFocusMinutes / totalMinutes) * 100) : 0;
                return (
                  <div key={s.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.accentColor }} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{s.totalFocusMinutes}m</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: s.accentColor }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(stats?.longestStreak ?? 0) > 0 && (
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <Trophy size={20} className="text-[hsl(var(--coin))]" />
            <div>
              <p className="text-xs text-muted-foreground">Longest streak</p>
              <p className="text-sm font-semibold text-foreground">{stats?.longestStreak} days</p>
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="glass rounded-2xl overflow-hidden divide-y divide-border">
          <button
            onClick={() => navigate("/store")}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <ShoppingBag size={18} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Shop</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/analytics")}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy size={18} className="text-primary" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Analytics</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setModal("settings")}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings size={18} className="text-primary" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Settings</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setModal("privacy")}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield size={18} className="text-blue-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Privacy Policy</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setModal("contact")}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <Mail size={18} className="text-green-600" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Contact Us</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          {authUser?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-yellow-50 transition text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Shield size={18} className="text-yellow-600" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">Admin Panel</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 transition text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <LogOut size={18} className="text-red-500" />
            </div>
            <span className="flex-1 text-sm font-medium text-red-500">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {modal === "settings" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md bg-background rounded-t-3xl p-6 pb-28 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-muted transition">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Study Mode */}
            <div className="glass rounded-2xl p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appearance</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isNight ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Study Mode</p>
                    <p className="text-xs text-muted-foreground">{isNight ? "Night mode" : "Light mode"}</p>
                  </div>
                </div>
                <button
                  disabled={settingsSaving}
                  onClick={() => handleToggleSetting("studyMode", isNight ? "light" : "night")}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isNight ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isNight ? "left-7" : "left-1"}`} />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="glass rounded-2xl p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notifications</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {notifEnabled ? <Bell size={18} className="text-primary" /> : <BellOff size={18} className="text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">{notifEnabled ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
                <button
                  disabled={settingsSaving}
                  onClick={() => handleToggleSetting("notificationsEnabled", !notifEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notifEnabled ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifEnabled ? "left-7" : "left-1"}`} />
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="glass rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground font-medium truncate max-w-[60%] text-right">{authUser?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sign-in method</span>
                <span className="text-foreground font-medium capitalize">{authUser?.authProvider}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User code</span>
                <span className="text-foreground font-mono">#{authUser?.userCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {modal === "privacy" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md bg-background rounded-t-3xl p-6 pb-28 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Privacy Policy</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-muted transition">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p className="text-xs text-muted-foreground">Last updated: March 2026</p>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Data We Collect</h3>
                <p>We collect your name, email, and study activity data (sessions, subjects, streaks) to power your personalized experience.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">How We Use Your Data</h3>
                <p>Your data is used solely to provide FocusOura's features — tracking focus sessions, growing your plants, and competing with friends. We do not sell your data to third parties.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Profile Photos</h3>
                <p>If you upload a profile photo, it is stored securely and used only to display your avatar within the app.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Google Sign-In</h3>
                <p>If you sign in with Google, we receive your name, email, and profile photo from Google. We do not access any other Google account data.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Data Retention</h3>
                <p>You can request deletion of your account and all associated data at any time by contacting us.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Contact</h3>
                <p>For privacy-related questions, reach us at <span className="text-primary">privacy@focusoura.app</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {modal === "contact" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md bg-background rounded-t-3xl p-6 pb-28 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-muted transition">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We'd love to hear from you! Reach out for support, feedback, or any questions.
              </p>
              <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
                <a
                  href="mailto:support@focusoura.app"
                  className="flex items-center gap-3 px-4 py-4 hover:bg-muted/40 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                    <Mail size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email Support</p>
                    <p className="text-xs text-muted-foreground">support@focusoura.app</p>
                  </div>
                </a>
                <a
                  href="mailto:feedback@focusoura.app"
                  className="flex items-center gap-3 px-4 py-4 hover:bg-muted/40 transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Leaf size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Send Feedback</p>
                    <p className="text-xs text-muted-foreground">feedback@focusoura.app</p>
                  </div>
                </a>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                We typically respond within 24 hours.
              </p>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
