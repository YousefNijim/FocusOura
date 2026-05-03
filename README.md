# FocusOura — تطبيق الإنتاجية الممتع

> تطبيق إنتاجية مُلعَّب (Gamified Productivity App) يساعد المستخدمين على التركيز في الدراسة والعمل من خلال نباتات افتراضية، حيوانات أليفة، تحديات اجتماعية، وأصوات بيئية محيطة.

---

## المكدس التقني (Tech Stack)

| الطبقة | التقنية |
|---|---|
| الواجهة الأمامية | React 18 + Vite + TypeScript + TailwindCSS |
| الخادم الخلفي | Express.js + TypeScript |
| قاعدة البيانات | PostgreSQL + Drizzle ORM |
| بنية المشروع | pnpm Monorepo |
| الحالة العامة | React Context (Auth, User, Session) |
| المصادقة | Email/Password مع JWT + Session Cookies |
| الذكاء الاصطناعي | Google Gemini API (AI Insights) |

---

## هيكل المشروع

```
/
├── artifacts/
│   ├── web/               # تطبيق React/Vite (الواجهة الأمامية)
│   │   └── src/
│   │       ├── pages/     # الصفحات الرئيسية
│   │       ├── components/# المكونات المشتركة
│   │       ├── context/   # سياقات React
│   │       ├── hooks/     # Hooks مخصصة
│   │       ├── constants/ # بيانات ثابتة (النباتات، الحيوانات)
│   │       └── utils/     # دوال مساعدة
│   └── api-server/        # خادم Express
│       └── src/routes/    # مسارات API
├── lib/db/                # مكتبة قاعدة البيانات (Drizzle Schema)
└── README.md
```

---

## جداول قاعدة البيانات

| الجدول | الوصف |
|---|---|
| `users` | بيانات المستخدمين (اسم، بريد، كلمة مرور، حيوان أليف) |
| `subjects` | المواد/المجالات الدراسية لكل مستخدم |
| `plants` | النباتات الافتراضية وتقدم نموها |
| `sessions` | جلسات التركيز المسجلة |
| `session_events` | أحداث الجلسة (بداية، إيقاف، استئناف) |
| `wallets` | رصيد العملات الافتراضية لكل مستخدم |
| `transactions` | سجل المعاملات المالية (كسب/خصم عملات) |
| `motivation_messages` | رسائل تشجيعية يتبادلها المستخدمون |
| `ai_insights` | تحليلات الذكاء الاصطناعي لجلسات التركيز |
| `friendships` | علاقات الصداقة بين المستخدمين |
| `challenges` | تحديات الدراسة الجماعية |
| `challenge_participants` | المشاركون في كل تحدي |

---

## الميزات والمراحل

### ✅ المرحلة 1 — البنية الأساسية (مكتملة)
- [x] إعداد Monorepo بـ pnpm workspace
- [x] قاعدة بيانات PostgreSQL مع Drizzle ORM وكامل الـ Schema
- [x] نظام مصادقة كامل (تسجيل، دخول، JWT، Session Cookies)
- [x] واجهة تطبيق موبايل بـ Bottom Navigation Bar
- [x] نظام Dark/Light Mode (Night Study Mode)
- [x] React Context لـ Auth, User, Session

---

### ✅ المرحلة 2 — جلسات التركيز والنباتات (مكتملة)
- [x] **صفحة Focus Session** مع:
  - Circular Duration Picker (اختيار المدة بشكل دائري)
  - وضعَين: Countdown ⏱ و Stopwatch ⏲
  - 3 أنواع جلسات: Routine (×1)، Homework (×2)، Deep Focus (×3)
  - قفل Deep Focus مع منع الخروج خلال الجلسة
  - كسب نبتة كل 25 دقيقة تركيز
  - عرض النباتات المكتسبة في Wallet Modal
- [x] **Carousel اختيار النبات** (8 أنواع: fern, succulent, bamboo, rose, cactus, bonsai, orchid, lavender)
- [x] **ربط النباتات بالمواد الدراسية**
- [x] **نظام نقاط النمو** (growthPoints, growthLevel, maxGrowthPoints)
- [x] **API /plants** مع كامل العمليات (GET, POST, PUT)
- [x] SessionContext يحفظ الجلسة النشطة عند التنقل بين الصفحات

---

### ✅ المرحلة 3 — نظام الحيوانات الأليفة الكامل (مكتملة)
- [x] **شرط فتح الحيوان الأليف**: 5 نباتات وصلت لـ growthLevel ≥ 3
- [x] **3 حالات مزاجية للحيوان**:
  - 😊 Happy: دراسة اليوم أو الأمس
  - 😐 Neutral: آخر دراسة منذ يومين
  - 😢 Sad: لم يُدرَّس منذ 3+ أيام
- [x] **واجهة Locked/Unlocked** في صفحتي Home و Garden
- [x] **Toast احتفالي** عند فتح الحيوان (مرة واحدة لكل مستخدم عبر localStorage)
- [x] **API /api/stats** يُعيد: `fullyGrownCount`, `petUnlocked`, `lastSessionDate`, `petMood`
- [x] **كتالوج الحيوانات** في `constants/pets.ts` مع `PetMoodKey` و`getPetMoodFromKey()`
- [x] **PetSelectModal** لاختيار الحيوان الأليف

---

### ✅ المرحلة 4 — الحدائق والمواد الدراسية (مكتملة)
- [x] **صفحة Garden** مع عرض جميع النباتات
- [x] **إنشاء المواد الدراسية** مع اختيار لون وإنشاء نبتة تلقائياً
- [x] **تحرير وحذف المواد**
- [x] **عرض تقدم كل مادة** (وقت التركيز، عدد الجلسات)
- [x] **عرض النبات المرتبط بكل مادة**

---

### ✅ المرحلة 5 — الميزات الاجتماعية (Arena) (مكتملة)
- [x] **إضافة أصدقاء** عبر رابط دعوة أو كود المستخدم
- [x] **قائمة الأصدقاء** مع حالة الدراسة
- [x] **إنشاء تحديات** (اختيار نوع الجلسة، المدة، المبلغ المراهن)
- [x] **الانضمام للتحديات والمشاركة**
- [x] **نظام المحفظة (Wallet)** مع عرض الرصيد والمعاملات
- [x] **كسب العملات** عند إكمال الجلسات (بناءً على المضاعف)

---

### ✅ المرحلة 6 — الذكاء الاصطناعي والتحليلات (مكتملة)
- [x] **صفحة Analytics** مع:
  - إجمالي وقت التركيز، عدد الجلسات، أطول جلسة
  - مخطط نشاط أسبوعي
  - توزيع الجلسات حسب النوع
  - أفضل المواد الدراسية
- [x] **AI Insights** بواسطة Google Gemini:
  - تحليل أنماط الدراسة
  - نصائح شخصية مبنية على بيانات المستخدم
- [x] **رسائل التشجيع** يتبادلها المستخدمون بعد الجلسات

---

### ✅ المرحلة 7 — الأصوات المحيطة (مكتملة)
- [x] **useAmbientSound Hook** بـ Web Audio API (بدون ملفات خارجية):
  - 🌧️ Rain (مطر)
  - 🌊 Ocean (أمواج)
  - ☕ Café (مقهى)
  - 🌲 Forest (غابة)
  - 🌫️ White Noise
  - 🔇 Silent
- [x] **AmbientSoundPicker Component** (Bottom Sheet Modal)
- [x] **تحكم في مستوى الصوت** (Slider)
- [x] **حفظ الاختيار** في localStorage
- [x] **إيقاف الصوت تلقائياً** عند انتهاء الجلسة
- [x] **زر تشغيل/إيقاف** في هيدر FocusSession مع مؤشر نبضي

---

### ✅ المرحلة 8 — Onboarding (مكتملة جزئياً)
- [x] **صفحة Welcome** مع 4 شرائح تعريفية:
  1. 🌱 نظام النباتات
  2. 🐱 الحيوان الأليف
  3. 🏆 التحديات والعملات
  4. 🎵 الأصوات المحيطة
- [x] **Skip / Next / Get Started** buttons
- [x] **رابط إنشاء حساب** في الشريحة الأخيرة
- [x] **حفظ حالة الـ Onboarding** في localStorage (`focusoura_onboarded`)
- [x] **توجيه ذكي**: مستخدمون جدد → /welcome، مستخدمون مسجلون → /login
- [ ] ~~توجيه المستخدم الجديد بعد التسجيل مباشرة إلى الـ Onboarding~~ (Register.tsx يوجه إلى "/" مباشرة — يمكن تحسينه)

---

### ✅ المرحلة 9 — متجر الكوزمتيك (مكتملة)
- [x] جدول `store_items` في قاعدة البيانات مع 15 صنف مُهيأ مسبقاً (إطارات، خلفيات، أزياء)
- [x] جدول `user_inventory` لتخزين الأصناف المشتراة لكل مستخدم
- [x] صفحة `/store` بثلاثة أقسام: Frames، Backgrounds، Pet Outfits
- [x] API `GET /api/store/items` — كل الأصناف مع حالة owned/equipped
- [x] API `POST /api/store/buy` — شراء صنف مع خصم من المحفظة
- [x] API `POST /api/store/equip` — تجهيز/إلغاء تجهيز صنف
- [x] API `GET /api/store/inventory` — مخزون المستخدم
- [x] تطبيق الكوزمتيك: إطار الأفاتار في Profile، خلفية Focus Session، زي الحيوان الأليف في Home
- [x] زر Shop في صفحة Profile للوصول السريع للمتجر
- [x] نادرية الأصناف (common / rare / epic) مع ألوان مختلفة
- [x] Preview Modal لكل صنف قبل الشراء

---

## مسارات API المتاحة

| المسار | الوصف |
|---|---|
| `POST /api/auth/register` | تسجيل مستخدم جديد |
| `POST /api/auth/login` | تسجيل الدخول |
| `POST /api/auth/logout` | تسجيل الخروج |
| `GET /api/auth/me` | بيانات المستخدم الحالي |
| `GET /api/subjects` | قائمة المواد الدراسية |
| `POST /api/subjects` | إنشاء مادة جديدة |
| `PUT /api/subjects/:id` | تعديل مادة |
| `DELETE /api/subjects/:id` | حذف مادة |
| `GET /api/plants` | قائمة النباتات |
| `GET /api/sessions` | سجل الجلسات |
| `POST /api/sessions` | بدء جلسة |
| `PUT /api/sessions/:id` | تحديث/إنهاء جلسة |
| `GET /api/stats` | إحصائيات + حالة الحيوان الأليف |
| `GET /api/wallet` | رصيد المحفظة |
| `GET /api/transactions` | سجل المعاملات |
| `GET /api/friends` | قائمة الأصدقاء |
| `POST /api/friends/invite` | إنشاء رابط دعوة |
| `GET /api/challenges` | قائمة التحديات |
| `POST /api/challenges` | إنشاء تحدي |
| `POST /api/challenges/:id/join` | الانضمام لتحدي |
| `GET /api/analytics` | بيانات التحليلات |
| `GET /api/insights` | تحليلات الذكاء الاصطناعي |
| `GET /api/messages/random` | رسالة تشجيعية عشوائية |
| `POST /api/messages` | إرسال رسالة تشجيعية |
| `GET /api/pets` | كتالوج الحيوانات الأليفة |
| `PUT /api/pets/select` | اختيار حيوان أليف |

---

## الصفحات الرئيسية

| الصفحة | المسار | الوصف |
|---|---|---|
| Welcome | `/welcome` | Onboarding للمستخدمين الجدد (4 شرائح) |
| Login | `/login` | تسجيل الدخول |
| Register | `/register` | إنشاء حساب جديد |
| Home | `/` | الصفحة الرئيسية + الحيوان الأليف + الإحصائيات |
| Focus Session | `/focus` | جلسة التركيز مع المؤقت والنباتات والأصوات |
| Garden | `/garden` | حديقة النباتات والمواد الدراسية |
| Arena | `/arena` | الأصدقاء والتحديات والمحفظة |
| Profile | `/profile` | الملف الشخصي والإعدادات |
| Analytics | `/analytics` | التحليلات والرسوم البيانية |

---

## ملاحظات تقنية مهمة

1. **Deep Focus Lock**: يستخدم `popstate` listener مخصص (وليس `useBlocker`) لأن `BrowserRouter` لا يدعم `useBlocker`.
2. **Bottom Sheet Modals**: تحتاج `pb-28` لتجنب تداخل شريط التنقل السفلي.
3. **قاعدة البيانات**: لا تُغيّر أنواع ID الموجودة (serial ↔ varchar) — يسبب كسر البيانات.
4. **TypeScript**: يجب البقاء عند 0 أخطاء في حزمة web.
5. **Ambient Sound**: يعتمد على Web Audio API (بدون ملفات صوتية خارجية) — لا يحتاج hosting.
6. **Pet Unlock Key**: `focusoura_pet_unlocked_{userId}` في localStorage (لكل مستخدم منفصل).

---

## كيفية تشغيل المشروع

```bash
# تثبيت الحزم
pnpm install

# تشغيل التطبيق (frontend + backend معاً)
PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev
```

---

## ملف نسخ قاعدة البيانات

تم حفظ نسخة احتياطية من قاعدة البيانات في:
```
focusoura_db_backup.sql
```

لاستعادتها:
```bash
psql $DATABASE_URL < focusoura_db_backup.sql
```
