# Handoff — 2026-09-12

Written to survive a folder rename and a new session. Nothing here contains a
secret; credentials are referred to by variable name only.

---

## Stop here first: why the APK build fails

```
Cannot run program ""C:\Users\yosef\Downloads\FocusOura (1)\...\prefab_command.bat""
CreateProcess error=2, The system cannot find the file specified
```

`expo-modules-core` compiles C++ through CMake/NDK, and the NDK toolchain breaks
on paths containing **spaces or parentheses**. The project folder is
`FocusOura (1)` — it has both. This is almost certainly why the project was
wired to EAS in the first place: a local native build was never possible from
this path.

**The fix is to rename the folder**, e.g. `C:\Users\yosef\Downloads\FocusOura`.

Renaming breaks the git worktree this session ran in
(`.claude/worktrees/charming-lovelace-dec71b`). Everything is already pushed to
GitHub, so nothing is lost, but after renaming:

```bash
git worktree prune          # drop the stale worktree registration
git status                  # confirm the main checkout is healthy
```

Then start a new session in the renamed folder and continue from
"Resuming the APK build" below.

---

## Where production stands

| Piece | State |
|---|---|
| Web | Vercel — https://focusoura.vercel.app, deploys from `master` |
| API | Railway — `workspaceapi-server-production-198a.up.railway.app` |
| Database | Railway Postgres 18.6, same project, private network only |
| Repo | `YousefNijim/FocusOura` (was `FocusOura-v3`; the remote may still say the old name) |

**Railway ids** — project `ee63b25f-decd-440f-bc91-b8dbaf2cb299`, environment
`production` `6de0cba7-dec4-49d7-87ee-56158d6b77e4`, services
`@workspace/api-server` `26e1e405-1b1b-44eb-9037-1996492edb64` and `Postgres`
`4a1a27a4-1c24-431d-94c8-e4c8e1239f68`.

The database has 20 tables. Migrations `004_plant_type_check.sql` and
`005_plant_withering.sql` were applied by hand through the Postgres **Console**
tab; there is no migration runner, so future migrations need the same treatment.

---

## Merged today

| PR | What |
|---|---|
| #2 | Pin pnpm and sync the lockfile — first successful deploy since 2026-05-08 |
| #3 | Stop committing `.env`; `--env-file-if-exists` |
| #4 | Document the rebuilt infrastructure (§16 of DESIGN.md) |
| #5 | Eight species as SVG at four stages plus withered; retire 11 MB of PNGs |
| #6 | Calendar PATCH/DELETE error handling; `plant_type` CHECK constraint |
| #7 | Withering on an aborted session |
| #8 | Surface the real reason a blocked action was blocked |
| #9 | Split `GOOGLE_SERVER_API_KEY` from the browser key |
| #10 | Garden redesigned as potting shelves |
| #11 | Reattach withered heads; two pots per shelf |

**#1 was closed, not merged.** Its fixes had been reimplemented on master
independently, and it contained a regression: it replaced
`subjectId === "general" ? null : subjectId` with `subjectId || null`, but the
frontend really does send `"general"` as a sentinel.

Design previews (read-only, for reference):
- All eight species, five stages each — https://claude.ai/code/artifact/888e7f00-95e9-4e71-9c2b-d839b631feca
- The potting shelf — https://claude.ai/code/artifact/8170b3bc-35d9-432a-b73a-eb3daa35c588

---

## Resuming the APK build

EAS is **out of Android build quota until 2026-10-01** on the free plan. The
local route is better anyway — `expo prebuild` generates the same native project
EAS would build, with the same Expo plugins, and consumes no quota.

After renaming the folder:

```bash
cd artifacts/mobile
printf 'sdk.dir=C:/Users/yosef/AppData/Local/Android/Sdk\n' > android/local.properties

EXPO_PUBLIC_WEB_URL="https://focusoura.vercel.app" \
  npx expo prebuild --platform android --no-install

cd android
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" \
EXPO_PUBLIC_WEB_URL="https://focusoura.vercel.app" \
  ./gradlew assembleRelease --no-daemon
```

Output: `artifacts/mobile/android/app/build/outputs/apk/release/app-release.apk`

Notes that cost time to learn:

- **Use the Android Studio JBR (JDK 21), not the system Java.** The machine has
  Java 26; Gradle 8.14 does not support it.
- **`assembleDebug` is not standalone** — it expects a Metro dev server.
  `assembleRelease` bundles the JS. Expo's template signs release with the debug
  keystore, so the APK installs anywhere but Google Play will reject it. A Play
  build needs your own keystore.
- `eas build --local` is not supported on Windows; `expo prebuild` is.
- `artifacts/web/android` is a **separate Capacitor project**. It builds, but the
  app it produces has no `expo-notifications` and uses a raw WebView, which
  Google blocks for OAuth (`403 disallowed_useragent`). Prefer the Expo app.

---

## Traps this session hit — each cost a debugging cycle

**`PGHOST` is set on the Postgres service.** A bare `psql -U postgres` in the
Console connects over TCP and demands a password instead of using the local
socket. A failed password rotation therefore *looks* like it succeeded. Force
the socket:

```bash
psql -h /var/run/postgresql -U postgres -d railway -c "..."
```

**`psql` does not interpolate `:'var'` inside `-c`.** Pipe through stdin instead.

**Rotating the database password takes three steps, in order.**
`POSTGRES_PASSWORD` only applies at `initdb`, and environment variables are
injected when a container starts:

1. set `POSTGRES_PASSWORD` in Railway, wait for Postgres to redeploy
2. in the Console: `echo "ALTER USER postgres WITH PASSWORD :'pw';" | psql -h /var/run/postgresql -U postgres -d railway -v pw="$POSTGRES_PASSWORD"`
3. redeploy `@workspace/api-server` so it re-resolves `DATABASE_URL` — Railway
   does **not** redeploy the dependent service for you

**Use an alphanumeric database password.** `DATABASE_URL` is
`postgresql://user:PASSWORD@host:5432/db`; a `/`, `@`, `:` or `+` breaks URI
parsing and the failure is indistinguishable from a wrong password.
`PGPASSWORD=… psql -h …` succeeding while `psql "$DATABASE_URL"` fails is the
signal that tells them apart.

**An HTTP-referrer restriction on a Google API key blocks server-side calls**,
because a server request carries no referrer at all:
`API_KEY_HTTP_REFERRER_BLOCKED — "Requests from referer <empty> are blocked."`
No list of domains fixes it. That is what `GOOGLE_SERVER_API_KEY` (#9) is for.
The browser key's referrer list must include the Firebase auth handler domain
`https://focusoura-99dae.firebaseapp.com/*`, where the OAuth popup runs.

**Railway deployments show as `SKIPPED`, not failed**, when a commit misses the
service's watch patterns. Those now cover `artifacts/api-server/**`, `lib/**`
and the root manifests. Web-only commits still skip Railway correctly — they
go to Vercel.

**The API typechecks against `@workspace/db`'s built output, not its source.** A
new column reads as a type error until `cd lib/db && pnpm exec tsc --build`.

**`pnpm run build` catches what `tsc --noEmit` does not.** TypeScript does not
verify asset imports; the web build caught a stale `plant-1.png` import that the
typecheck passed.

**Stopping a background task kills the shell, not its children.** A Gradle JVM
outlived its wrapper and held file locks. Find and stop it explicitly:

```powershell
Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
  Select-Object ProcessId, CommandLine
```

---

## Baseline error counts

Compare against these before blaming your change:

| Check | Pre-existing errors |
|---|---|
| `artifacts/web` — `tsc --noEmit` | 9 |
| `artifacts/api-server` — `tsc --noEmit` | 51 |

`pnpm run build` for the API fails locally on any branch: `resend` is in
`package.json` but missing from the local pnpm store. Railway builds it fine.

---

## Open, in rough priority order

1. **Verify the withered rose head** sits on its stem. The #11 fix was reasoned
   about geometrically, never seen. No automated check covers "the drawing is
   wrong".
2. **`Focused Time — 0 min`** showed zero after a session. Unresolved: was the
   session completed or only aborted? `filteredSessions` counts
   `state === "completed"` only, so zero is correct after an abort — and a bug
   if a session really was completed.
3. **`GOOGLE_SERVER_API_KEY` is not set yet.** #9 falls back to `GOOGLE_API_KEY`,
   so sign-in works only while the browser key stays unrestricted. Create the
   second key (API restrictions only, **no** referrer restriction), set it on
   Railway, *then* restrict the browser key.
4. **DESIGN.md is stale again** — §16 describes the infrastructure but the
   garden sections still describe the isometric lawn and the PNG plants.
5. **Pause-timeout auto-abort does not wither.** `POST /sessions/:id/resume`
   aborts a session paused for two hours. Whether that should kill a plant is a
   product decision, deliberately left open.
6. **`OfflineBanner`** exists with no offline sync behind it.
7. **`conversations` and `messages`** are tables with no routes — dead schema.

### Housekeeping

- Remove the `Bash(node:*)` rule from `.claude/settings.local.json`. It was
  added for one diagnostic in this session and is broader than anything needs.
- Delete the diagnostic row:
  `DELETE FROM users WHERE id='demo_claude_diagnostic';`
- Update the git remote if it still points at the old name:
  `git remote set-url origin https://github.com/YousefNijim/FocusOura.git`
