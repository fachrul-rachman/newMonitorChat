import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ParsedFilters, formatTimestamp, getDateRange, parseFilters } from "../../lib/dateRange";
import {
  DbContext,
  filterContexts,
  getAllContexts,
  queryContext,
} from "../../lib/db";
import {
  SESSION_COOKIE_NAME,
  getAuthEnv,
  verifySessionCookie,
} from "../../lib/auth";

type DashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type ActivitySummary = {
  totalSessions: number;
  totalMessages: number;
};

type RecentSession = {
  id: string;
  sessionId: string;
  office: string;
  bot: string;
  contextLabel: string;
  lastActivity: Date;
  messageCount: number;
  humanCount: number;
  aiCount: number;
};

type PendingSession = {
  id: string;
  sessionId: string;
  office: string;
  bot: string;
  contextLabel: string;
  lastHumanAt: Date;
};

type ResponseTimeStats = {
  medianSeconds: number | null;
  p95Seconds: number | null;
};

type WordFrequency = {
  word: string;
  count: number;
};

const SESSION_PAGE_SIZE = 20;

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const authEnv = getAuthEnv();

  if (authEnv) {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;

    if (!token || !verifySessionCookie(token, authEnv.secret)) {
      redirect("/monitorchat/login?redirectTo=/monitorchat");
    }
  }

  const params = await searchParams;
  const filters: ParsedFilters = parseFilters(params);
  const now = new Date();
  const { start, end } = getDateRange(filters, now);

  const allContexts = getAllContexts();
  const configuredContexts = allContexts.filter((c) => c.url);
  const missingContexts = allContexts.filter((c) => !c.url);

  const activeContexts: DbContext[] = filterContexts(
    filters.office,
    filters.bot,
  );

  const [activity, recentSessions, pendingSessions, responseTimes, topWords] =
    await Promise.all([
      getActivitySummary(activeContexts, start, end),
      getRecentSessions(activeContexts, start, end),
      getPendingSessions(activeContexts, start, end, now),
      getResponseTimeStats(activeContexts, start, end),
      getTopWords(activeContexts, start, end),
    ]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Dashboard
            </h2>
            <p className="text-xs text-zinc-600">
              Ringkasan aktivitas chat AI/human. Semua waktu dalam zona
              Asia/Jakarta (+07).
            </p>
          </div>
          <FilterForm filters={filters} configuredContexts={configuredContexts} />
        </div>
        {missingContexts.length > 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-medium">DB belum terkonfigurasi:</p>
            <ul className="mt-1 list-disc pl-5">
              {missingContexts.map((ctx) => (
                <li key={ctx.contextKey}>
                  {ctx.label} (
                  <code className="text-[11px]">{ctx.envVar}</code> tidak
                  di-set)
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">
            Ringkasan aktivitas
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Jumlah sesi</p>
              <p className="mt-1 text-xl font-semibold text-zinc-900">
                {activity.totalSessions}
              </p>
            </div>
            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Total pesan</p>
              <p className="mt-1 text-xl font-semibold text-zinc-900">
                {activity.totalMessages}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">
            Kecepatan balasan AI
          </h3>
          <p className="text-xs text-zinc-600">
            Perkiraan berapa detik AI membalas chat terakhir dari manusia dalam
            satu percakapan.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Biasanya</p>
              <p className="mt-1 text-xl font-semibold text-zinc-900">
                {responseTimes.medianSeconds != null
                  ? `${Math.round(responseTimes.medianSeconds)} detik`
                  : "-"}
              </p>
            </div>
            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Yang lambat</p>
              <p className="mt-1 text-xl font-semibold text-zinc-900">
                {responseTimes.p95Seconds != null
                  ? `${Math.round(responseTimes.p95Seconds)} detik`
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-900">
            Riwayat sesi terbaru
          </h3>
          <p className="text-xs text-zinc-600">
            20 sesi terbaru dalam rentang tanggal terpilih.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-2 py-1">Last activity</th>
                  <th className="px-2 py-1">Office/Bot</th>
                  <th className="px-2 py-1">Session ID</th>
                  <th className="px-2 py-1 text-right">Msgs</th>
                  <th className="px-2 py-1 text-right">Human</th>
                  <th className="px-2 py-1 text-right">AI</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-2 py-4 text-center text-xs text-zinc-500"
                    >
                      Belum ada sesi untuk filter yang dipilih.
                    </td>
                  </tr>
                )}
                {recentSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-zinc-100 last:border-b-0"
                  >
                    <td className="px-2 py-1 text-xs text-zinc-700">
                      {formatTimestamp(session.lastActivity)}
                    </td>
                    <td className="px-2 py-1 text-xs">
                      <span className="mr-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px]">
                        {session.office}
                      </span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">
                        {session.bot}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-xs font-mono text-zinc-800">
                      {session.sessionId}
                    </td>
                    <td className="px-2 py-1 text-right text-xs">
                      {session.messageCount}
                    </td>
                    <td className="px-2 py-1 text-right text-xs">
                      {session.humanCount}
                    </td>
                    <td className="px-2 py-1 text-right text-xs">
                      {session.aiCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">
            Chat belum dijawab AI
          </h3>
          <p className="text-xs text-zinc-600">
            Daftar chat di mana pesan terakhir dari manusia belum dijawab AI
            lebih dari beberapa menit.
          </p>
          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto text-xs">
            {pendingSessions.length === 0 && (
              <p className="text-xs text-zinc-500">
                Tidak ada sesi pending untuk filter dan threshold saat ini.
              </p>
            )}
            {pendingSessions.map((session) => (
              <div
                key={session.id}
                className="rounded border border-zinc-100 bg-zinc-50 px-2 py-1.5"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">
                    {formatTimestamp(session.lastHumanAt)}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {session.office} / {session.bot}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-zinc-900">
                  {session.sessionId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bagian kata terbanyak dihilangkan sesuai permintaan user */}
    </div>
  );
}

type FilterFormProps = {
  filters: ParsedFilters;
  configuredContexts: DbContext[];
};

function FilterForm({ filters, configuredContexts }: FilterFormProps) {
  const hasAMG = configuredContexts.some((c) => c.office === "AMG");
  const hasLMP = configuredContexts.some((c) => c.office === "LMP");

  const hasSales = configuredContexts.some((c) => c.bot === "sales");
  const hasCustomer = configuredContexts.some((c) => c.bot === "customer");

  return (
    <form method="GET" className="flex flex-wrap items-end gap-2 text-xs">
      <div className="flex flex-col">
        <label className="mb-1 text-[11px] font-medium text-zinc-700">
          Office
        </label>
        <select
          name="office"
          defaultValue={filters.office}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
        >
          <option value="all">All</option>
          {hasAMG && <option value="AMG">AMG</option>}
          {hasLMP && <option value="LMP">LMP</option>}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-[11px] font-medium text-zinc-700">
          Bot
        </label>
        <select
          name="bot"
          defaultValue={filters.bot}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
        >
          <option value="all">All</option>
          {hasSales && <option value="sales">sales</option>}
          {hasCustomer && <option value="customer">customer</option>}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-[11px] font-medium text-zinc-700">
          Date range
        </label>
        <select
          name="range"
          defaultValue={filters.preset}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
        >
          <option value="today">Today</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      {filters.preset === "custom" && (
        <>
          <div className="flex flex-col">
            <label className="mb-1 text-[11px] font-medium text-zinc-700">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-[11px] font-medium text-zinc-700">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
            />
          </div>
        </>
      )}
      <button
        type="submit"
        className="mt-4 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
      >
        Terapkan
      </button>
    </form>
  );
}

async function getActivitySummary(
  contexts: DbContext[],
  start: Date,
  end: Date,
): Promise<ActivitySummary> {
  if (contexts.length === 0) {
    return { totalSessions: 0, totalMessages: 0 };
  }

  const queries = contexts.map((ctx) =>
    queryContext<{ session_count: string; message_count: string }>(
      ctx,
      `
        SELECT
          COUNT(DISTINCT session_id) AS session_count,
          COUNT(*) AS message_count
        FROM n8n_chat_histories
        WHERE created_at >= $1 AND created_at < $2
      `,
      [start, end],
    ),
  );

  const results = await Promise.all(queries);

  let totalSessions = 0;
  let totalMessages = 0;

  for (const rows of results) {
    if (rows[0]) {
      totalSessions += Number(rows[0].session_count ?? 0);
      totalMessages += Number(rows[0].message_count ?? 0);
    }
  }

  return { totalSessions, totalMessages };
}

async function getRecentSessions(
  contexts: DbContext[],
  start: Date,
  end: Date,
): Promise<RecentSession[]> {
  if (contexts.length === 0) {
    return [];
  }

  const perContext = await Promise.all(
    contexts.map((ctx) =>
      queryContext<{
        session_id: string;
        last_activity: Date;
        message_count: string;
        human_count: string;
        ai_count: string;
      }>(
        ctx,
        `
          SELECT
            session_id,
            MAX(created_at) AS last_activity,
            COUNT(*) AS message_count,
            COUNT(*) FILTER (WHERE message->>'type' = 'human') AS human_count,
            COUNT(*) FILTER (WHERE message->>'type' = 'ai') AS ai_count
          FROM n8n_chat_histories
          WHERE created_at >= $1 AND created_at < $2
          GROUP BY session_id
          ORDER BY last_activity DESC
          LIMIT $3
        `,
        [start, end, SESSION_PAGE_SIZE],
      ),
    ),
  );

  const sessions: RecentSession[] = [];
  for (const [index, rows] of perContext.entries()) {
    const ctx = contexts[index];
    for (const row of rows) {
      const lastActivity = new Date(row.last_activity);
      const compositeId = `${ctx.contextKey}:${row.session_id}`;
      sessions.push({
        id: compositeId,
        sessionId: row.session_id,
        office: ctx.office,
        bot: ctx.bot,
        contextLabel: ctx.label,
        lastActivity,
        messageCount: Number(row.message_count),
        humanCount: Number(row.human_count),
        aiCount: Number(row.ai_count),
      });
    }
  }

  sessions.sort(
    (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
  );

  return sessions.slice(0, SESSION_PAGE_SIZE);
}

async function getPendingSessions(
  contexts: DbContext[],
  start: Date,
  end: Date,
  now: Date,
): Promise<PendingSession[]> {
  if (contexts.length === 0) {
    return [];
  }

  const thresholdMinutesRaw = process.env.PENDING_THRESHOLD_MINUTES;
  const thresholdMinutes = thresholdMinutesRaw
    ? Math.max(1, Number(thresholdMinutesRaw))
    : 2;

  const thresholdMillis = thresholdMinutes * 60 * 1000;
  const thresholdDate = new Date(now.getTime() - thresholdMillis);

  const perContext = await Promise.all(
    contexts.map((ctx) =>
      queryContext<{
        session_id: string;
        last_human_at: Date;
      }>(
        ctx,
        `
          WITH ranked AS (
            SELECT
              session_id,
              message->>'type' AS type,
              created_at,
              ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at DESC) AS rn
            FROM n8n_chat_histories
            WHERE created_at >= $1 AND created_at < $2
          )
          SELECT
            session_id,
            created_at AS last_human_at
          FROM ranked
          WHERE rn = 1
            AND type = 'human'
            AND created_at < $3
          ORDER BY last_human_at DESC
          LIMIT $4
        `,
        [start, end, thresholdDate, SESSION_PAGE_SIZE],
      ),
    ),
  );

  const sessions: PendingSession[] = [];
  for (const [index, rows] of perContext.entries()) {
    const ctx = contexts[index];
    for (const row of rows) {
      const compositeId = `${ctx.contextKey}:${row.session_id}`;
      sessions.push({
        id: compositeId,
        sessionId: row.session_id,
        office: ctx.office,
        bot: ctx.bot,
        contextLabel: ctx.label,
        lastHumanAt: new Date(row.last_human_at),
      });
    }
  }

  sessions.sort(
    (a, b) => b.lastHumanAt.getTime() - a.lastHumanAt.getTime(),
  );

  return sessions.slice(0, SESSION_PAGE_SIZE);
}

async function getResponseTimeStats(
  contexts: DbContext[],
  start: Date,
  end: Date,
): Promise<ResponseTimeStats> {
  if (contexts.length === 0) {
    return { medianSeconds: null, p95Seconds: null };
  }

  const perContext = await Promise.all(
    contexts.map((ctx) =>
      queryContext<{
        p50: number | null;
        p95: number | null;
      }>(
        ctx,
        `
          WITH paired AS (
            SELECT
              created_at,
              message->>'type' AS type,
              LAG(created_at) OVER (PARTITION BY session_id ORDER BY created_at) AS prev_created_at,
              LAG(message->>'type') OVER (PARTITION BY session_id ORDER BY created_at) AS prev_type
            FROM n8n_chat_histories
            WHERE created_at >= $1 AND created_at < $2
          ),
          diffs AS (
            SELECT
              EXTRACT(EPOCH FROM (created_at - prev_created_at)) AS diff_seconds
            FROM paired
            WHERE type = 'ai'
              AND prev_type = 'human'
              AND prev_created_at IS NOT NULL
              AND created_at > prev_created_at
          )
          SELECT
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY diff_seconds) AS p50,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY diff_seconds) AS p95
          FROM diffs
        `,
        [start, end],
      ),
    ),
  );

  const medians: number[] = [];
  const p95s: number[] = [];

  for (const rows of perContext) {
    if (rows[0]) {
      if (rows[0].p50 != null) {
        medians.push(Number(rows[0].p50));
      }
      if (rows[0].p95 != null) {
        p95s.push(Number(rows[0].p95));
      }
    }
  }

  if (medians.length === 0 || p95s.length === 0) {
    return { medianSeconds: null, p95Seconds: null };
  }

  const avg = (values: number[]) =>
    values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    medianSeconds: avg(medians),
    p95Seconds: avg(p95s),
  };
}

async function getTopWords(
  contexts: DbContext[],
  start: Date,
  end: Date,
): Promise<WordFrequency[]> {
  if (contexts.length === 0) {
    return [];
  }

  const perContext = await Promise.all(
    contexts.map((ctx) =>
      queryContext<{ content: string | null }>(
        ctx,
        `
          SELECT
            message->>'content' AS content
          FROM n8n_chat_histories
          WHERE created_at >= $1 AND created_at < $2
            AND message->>'type' = 'human'
          LIMIT 5000
        `,
        [start, end],
      ),
    ),
  );

  const freq: Map<string, number> = new Map();

  for (const rows of perContext) {
    for (const row of rows) {
      if (!row.content) continue;
      const tokens = tokenize(row.content);
      for (const token of tokens) {
        const current = freq.get(token) ?? 0;
        freq.set(token, current + 1);
      }
    }
  }

  const entries: WordFrequency[] = Array.from(freq.entries()).map(
    ([word, count]) => ({ word, count }),
  );

  entries.sort((a, b) => b.count - a.count);

  return entries.slice(0, 10);
}

function tokenize(text: string): string[] {
  const stopWords = new Set([
    "dan",
    "atau",
    "yang",
    "untuk",
    "dari",
    "dengan",
    "pada",
    "pada",
    "dalam",
    "ini",
    "itu",
    "saya",
    "aku",
    "kami",
    "kita",
    "kamu",
    "anda",
    "dia",
    "mereka",
    "apa",
    "oke",
    "baik",
    "iya",
    "tidak",
    "nggak",
    "gak",
    "aja",
    "saja",
    "lagi",
    "sudah",
    "belum",
    "jadi",
    "bisa",
    "mau",
  ]);

  return text
    .toLowerCase()
    .split(/[\s.,!?;:()"'`[\]{}\\/]+/)
    .filter(
      (token) => token.length >= 3 && !stopWords.has(token),
    );
}
