import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ParsedFilters,
  formatTimestamp,
  getDateRange,
  parseFilters,
} from "../../lib/dateRange";
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
import { FilterBar } from "./components/FilterBar";
import { KpiCard } from "./components/KpiCard";
import {
  SessionStatus,
  SessionTable,
  type SessionTableRow,
} from "./components/SessionTable";

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
      redirect("/login?redirectTo=/");
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

  const pendingIds = new Set(pendingSessions.map((s) => s.id));

  const tableRows: SessionTableRow[] = recentSessions.map((session) => {
    const isOverdue = pendingIds.has(session.id);

    let status: SessionStatus = "Closed";
    if (isOverdue) {
      status = "Overdue";
    } else if (session.aiCount === 0 && session.humanCount > 0) {
      status = "Open";
    } else if (
      session.messageCount > 20 ||
      (session.humanCount > 0 && session.aiCount > 0)
    ) {
      status = "Needs attention";
    }

    return {
      id: session.id,
      sessionId: session.sessionId,
      office: session.office,
      bot: session.bot,
      contextLabel: session.contextLabel,
      lastActivityLabel: formatTimestamp(session.lastActivity),
      messageCount: session.messageCount,
      humanCount: session.humanCount,
      aiCount: session.aiCount,
      status,
    };
  });

  const hasResponseSamples =
    responseTimes.medianSeconds != null && responseTimes.medianSeconds > 0 &&
    responseTimes.p95Seconds != null && responseTimes.p95Seconds > 0;

  const formatSeconds = (value: number | null): string => {
    if (value == null || value <= 0) return "—";
    if (value < 1) return "< 1 detik";
    return `${Math.round(value)} detik`;
  };

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} configuredContexts={configuredContexts} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-3 p-4">
          <h2 className="text-sm font-semibold text-[color:var(--color-text)]">
            Aktivitas
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <KpiCard
              title="Jumlah sesi"
              value={activity.totalSessions.toLocaleString("id-ID")}
              subtitle="Dalam rentang tanggal terpilih."
            />
            <KpiCard
              title="Total pesan"
              value={activity.totalMessages.toLocaleString("id-ID")}
              subtitle="Human + AI."
            />
          </div>
        </div>

        <div className="card space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-text)]">
            Kecepatan balasan AI
          </h2>
          <p className="text-xs text-[color:var(--color-muted)]">
            Waktu dari pesan terakhir manusia ke balasan AI berikutnya dalam
            sesi yang sama.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <KpiCard
              title="Biasanya (median)"
              value={formatSeconds(responseTimes.medianSeconds)}
              subtitle={
                hasResponseSamples
                  ? undefined
                  : "Belum ada sampel yang valid di rentang ini."
              }
              tone="info"
              tooltip="Median waktu (detik) antara pesan terakhir manusia dan balasan AI berikutnya, hanya dari pasangan pesan valid."
            />
            <KpiCard
              title="Yang lambat (p95)"
              value={formatSeconds(responseTimes.p95Seconds)}
              subtitle={
                hasResponseSamples
                  ? undefined
                  : "Belum ada sampel yang valid di rentang ini."
              }
              tone="warning"
              tooltip="Perkiraan 5% balasan AI paling lambat (persentil 95)."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card space-y-3 p-4 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--color-text)]">
                Riwayat sesi terbaru
              </h3>
              <p className="text-xs text-[color:var(--color-muted)]">
                20 sesi terbaru, urut dari{" "}
                <span className="font-medium">Last activity desc</span>.
              </p>
            </div>
          </div>
          <SessionTable rows={tableRows} />
        </div>

        <div className="card space-y-3 p-4">
          <h3 className="text-sm font-semibold text-[color:var(--color-text)]">
            Chat belum dijawab AI
          </h3>
          <p className="text-xs text-[color:var(--color-muted)]">
            Sesi di mana pesan terakhir adalah manusia dan belum dijawab AI
            setelah threshold menit konfigurasi.
          </p>
          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto text-xs">
            {pendingSessions.length === 0 && (
              <p className="text-xs text-[color:var(--color-muted)]">
                Tidak ada sesi pending untuk filter dan threshold saat ini.
              </p>
            )}
            {pendingSessions.map((session) => (
              <div
                key={session.id}
                className="surface-muted border border-[var(--color-border)] px-2 py-1.5"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] text-[color:var(--color-muted)]">
                    {formatTimestamp(session.lastHumanAt)}
                  </span>
                  <span className="text-[10px] text-[color:var(--color-muted)]">
                    {session.office} / {session.bot}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[color:var(--color-text)]">
                  {session.sessionId}
                </div>
              </div>
            ))}
          </div>
        </div>

        {missingContexts.length > 0 && (
          <div className="md:col-span-3">
            <div className="card border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/5 p-3 text-xs text-[color:var(--color-text)]">
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
          </div>
        )}
      </section>

      {/* Bagian kata terbanyak tetap dihilangkan sesuai permintaan sebelumnya */}
    </div>
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
