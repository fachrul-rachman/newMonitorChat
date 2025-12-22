
# agent.md — Monitoring Chat (Internal) — Next.js + Postgres

## 0) Goal (What to build)
Build an **internal** web app for monitoring AI↔human chat logs stored in **Postgres**.

The app has **2 main screens**:
1) **Dashboard** (ringkas)
2) **Chat Viewer** (tampilan seperti WhatsApp)

The app must be **responsive** (laptop + mobile).

The app is **not public**; only team internal uses it. Still, implement **login** with username/password.

## 1) Mandatory routing / URL structure
All routes MUST be under:

- `/monitorchat/...`

Examples:
- Login: `/monitorchat/login`
- Dashboard: `/monitorchat` (or `/monitorchat/dashboard`, but default landing after login should be dashboard)
- Chat viewer: `/monitorchat/chat`

Do NOT create routes outside `/monitorchat` (except Next internals).

Use lowercase path `/monitorchat` consistently.

## 2) Existing data source (Postgres)
Chat logs are stored in Postgres table(s) with rows like:

Columns:
- `id` (int / serial / bigint)
- `session_id` (text)
- `message` (JSON / JSONB)
- `created_at` (timestamp with timezone)

`message` JSON example:
```json
{
  "type": "human",
  "content": "bisa bantu hitung komisi untuk BDD?",
  "additional_kwargs": {},
  "response_metadata": {}
}

and AI:

```json
{
  "type": "ai",
  "content": "....",
  "tool_calls": [],
  "additional_kwargs": {},
  "response_metadata": {},
  "invalid_tool_calls": []
}
```
### Timezone / semantics for `created_at` (important)
`created_at` values are recorded in local business time (e.g. `2025-12-22 08:22:29.297424+07`) and must be treated as the real local time, not UTC.
All date-range filters (Today/7d/30d/custom) and all timestamps shown in the UI MUST follow the same timezone as the data (Asia/Jakarta, +07) to avoid day-boundary errors.
Implementation must not implicitly convert day boundaries to UTC.


### What the app must do with this data

* Group rows by `session_id`.
* Sort messages by `created_at` ascending.
* Dashboard metrics must be computed only from these columns (no sentiment / no “error judgement”).
* Chat viewer shows messages in a WhatsApp-like UI (human on left, AI on right).

## 3) Multi-office + multi-bot context

There are 2 offices: **AMG** and **LMP**.
Each office has 2 bots: **sales** and **customer**.

We need a global filter:

* Office: `AMG | LMP | All`
* Bot type: `sales | customer | All`
* Date range: preset `Today | 7d | 30d` and custom range

Date range semantics: "Today" and custom ranges are evaluated in Asia/Jakarta (+07), consistent with `created_at`, not UTC.


### Data connectivity requirement

There must be **ENV config** to provide **Postgres connection URL for each DB**.
Assume (and implement) 4 separate Postgres URLs (one per office+bot) unless configured otherwise:

* AMG Sales DB
* AMG Customer DB
* LMP Sales DB
* LMP Customer DB

The UI filter selects which DB(s) to query:

* If Office=AMG and Bot=sales → query only AMG Sales DB
* If Office=All and Bot=sales → query AMG Sales + LMP Sales and merge results
* If Office=All and Bot=All → query all 4 and merge results

Merging rules:

* Session identity must include context to avoid collisions.

  * Internally create a composite key: `contextKey = office + ":" + botType`
  * Session unique id for UI list: `contextKey + ":" + session_id`
* In the chat viewer header, always display Office + Bot + session_id so user never loses context.

## 4) Pages & features

### 4.1 Login page — `/monitorchat/login`

* Simple login form: username + password.
* Username/password are read from ENV.
* On success: set secure httpOnly session cookie and redirect to `/monitorchat`.
* On failure: show error message (do not reveal which field is wrong).

Protect all `/monitorchat/*` routes except `/monitorchat/login`.

### 4.2 Dashboard — `/monitorchat`

Keep it small (team kecil). One screen with 6 components max:

1. **Aktivitas** (cards)

   * Sessions count (within date range)
   * Total messages count (within date range)

2. **Recent sessions list** (20 terbaru)
   Columns:

   * last activity time
   * office + bot badges
   * session_id
   * total message count
   * human count, ai count

3. **Response time (observational)**
   Compute:

* median response time
* p95 response time
  Definition:
  For each AI message, find the immediately preceding human message in the same session.
  Response time = `ai.created_at - human.created_at`.
  Exclude negative/invalid deltas.

4. **Sessions without AI reply (observational)**
   Definition:
   Sessions where the **last message type is human** and there is no subsequent AI message.
   Threshold: consider it “pending” if last human message is older than `PENDING_THRESHOLD_MINUTES` (ENV, default 2).
   Show count + list (top 20).

5. **Global filters**
   Office / Bot / Date range.
   Filters apply to all dashboard widgets.

6. Optional (only if very easy and safe):
   Top 10 most frequent words/phrases from HUMAN `content` (simple tokenization, no NLP packages).

### 4.3 Chat viewer — `/monitorchat/chat`

Layout (responsive):

* Desktop:

  * Left sidebar: session list with search + filters
  * Right: WhatsApp-like chat messages
* Mobile:

  * Default shows session list
  * Tap session opens messages view
  * Back button returns to list

Features:

* Session list uses same filter controls (Office/Bot/Date).
* Search box: filter sessions by `session_id` substring.
* Clicking a session navigates to:

  * `/monitorchat/chat?sid=<encoded-composite-session-id>`
    or
  * `/monitorchat/chat/<encoded-composite-session-id>`
    Either is acceptable; pick one and keep consistent.

Chat message UI:

* human bubbles left
* ai bubbles right
* timestamp visible (small)
* include a toggle “Raw JSON” (collapsed by default) per message for dev use.

## 5) Tech constraints (must follow)

### 5.1 Use Next.js already installed

Assume project is already a Next.js app. Do not re-scaffold.

Prefer minimal dependencies.

### 5.2 Database access

Use a safe, maintained Postgres client:

* Allowed: `pg` (node-postgres)

Do NOT use ORMs unless absolutely needed (keep it light).

### 5.3 Security / “no malware trigger” constraints (very important)

Never introduce code or dependencies that could increase malware risk or reintroduce known RCE patterns.

Hard rules:

* Do NOT add `react-server-dom-*` packages directly.
* Do NOT use `eval`, `Function()`, dynamic code execution, or unsafe template compilation.
* Do NOT use `child_process` to run shell commands from the app runtime.
* Do NOT fetch and execute remote scripts.
* Do NOT add unknown/unmaintained packages.
* Keep dependencies minimal and run `npm audit` after adding any package.
* Do not generate code that disables security checks.

Additionally:

* Use parameterized SQL queries only. Never build SQL by concatenating user input.
* Sanitize all query params used for pagination/search.
* Escape and render message content as plain text (do NOT dangerouslySetInnerHTML).

### 5.4 Authentication/session

Implement simple session auth:

* ENV contains login username/password.
* Store session in an httpOnly cookie.
* Use a server-side secret from ENV to sign/verify the session (HMAC/JWT-style is fine).
* Add middleware (or server guard) to redirect unauthenticated users to `/monitorchat/login`.

Security basics:

* Cookies: httpOnly, secure (in production), sameSite=Lax.

## 6) ENV variables (must implement)

Create `.env.example` with all variables and comments.

Required:

* `AUTH_USERNAME=...`
* `AUTH_PASSWORD=...`  (plain or hashed; if implementing hashed, also document format)
* `AUTH_SESSION_SECRET=...` (random long string)

Postgres URLs:

* `DB_URL_AMG_SALES=postgres://...`
* `DB_URL_AMG_CUSTOMER=postgres://...`
* `DB_URL_LMP_SALES=postgres://...`
* `DB_URL_LMP_CUSTOMER=postgres://...`

Optional:

* `PENDING_THRESHOLD_MINUTES=2`
* `DEFAULT_DATE_RANGE_DAYS=7`

If any DB URL is missing, the app should:

* still run
* but hide that context from filter options and show a clear admin-facing note (e.g., “LMP Sales DB not configured”).

## 7) Performance requirements (light but necessary)

* Use pagination for session list (default page size 20 or 50).
* Avoid loading all messages across all sessions at once.
* For chat viewer, only load one session’s messages when selected.
* Add DB indexes recommendation in README (do not auto-migrate):

  * index on `(created_at)`
  * index on `(session_id, created_at)`

## 8) Output artifacts (what to deliver in repo)

* Implement routes under `/monitorchat/*`.
* A small README section:

  * how to set env
  * how to run locally
  * what tables/columns are expected
* `.env.example`
* No unnecessary files.
* `tutorial.md`:
  * langkah penggunaan untuk Windows dan Linux (setup env, install dependencies, menjalankan app, dan troubleshooting dasar).
  * `tutorial.md` wajib mencakup skenario 1–4 DB URL terkonfigurasi dan menjelaskan perilaku ketika sebagian DB URL tidak di-set.


## 9) Acceptance checklist (must pass)

* [ ] Visiting `/monitorchat` redirects to `/monitorchat/login` if not logged in
* [ ] After login, can access dashboard and chat viewer
* [ ] Filters work (Office/Bot/Date) and apply consistently
* [ ] Dashboard shows: sessions count, messages count, recent sessions, response-time (median+p95), sessions pending
* [ ] Chat viewer shows WhatsApp-like bubbles, responsive on mobile
* [ ] Queries are parameterized; no unsafe HTML rendering
* [ ] No new risky dependencies; no dynamic code execution patterns
* [ ] App works with 1–4 configured DB URLs

