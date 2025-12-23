import { NextResponse } from "next/server";
import {
  formatTimestamp,
  getDateRange,
  parseFilters,
} from "../../../../lib/dateRange";
import { DbContext, filterContexts, queryContext } from "../../../../lib/db";

type SessionListItem = {
  id: string;
  sessionId: string;
  office: string;
  bot: string;
  lastActivity: string;
  lastSpeaker: "human" | "ai" | "other";
  lastMessageSnippet: string;
  messageCount: number;
  isOverdue: boolean;
};

const SESSION_PAGE_SIZE = 50;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    const filters = parseFilters(searchParams);
    const now = new Date();
    const { start, end } = getDateRange(filters, now);

    const contexts: DbContext[] = filterContexts(filters.office, filters.bot);

    const thresholdMinutesRaw = process.env.PENDING_THRESHOLD_MINUTES;
    const thresholdMinutes = thresholdMinutesRaw
      ? Math.max(1, Number(thresholdMinutesRaw))
      : 2;
    const thresholdMillis = thresholdMinutes * 60 * 1000;

    const pageNumber = Number(searchParams.page ?? "1");
    const page =
      Number.isFinite(pageNumber) && pageNumber > 0
        ? Math.floor(pageNumber)
        : 1;
    const offset = (page - 1) * SESSION_PAGE_SIZE;

    const sessions = await getSessionList(
      contexts,
      start,
      end,
      searchParams.q ?? "",
      offset,
      SESSION_PAGE_SIZE,
      now,
      thresholdMillis,
    );

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error loading sessions", error);
    return NextResponse.json(
      { sessions: [], error: "Gagal memuat daftar sesi. Cek log server." },
      { status: 500 },
    );
  }
}

async function getSessionList(
  contexts: DbContext[],
  start: Date,
  end: Date,
  searchQuery: string,
  offset: number,
  limit: number,
  now: Date,
  thresholdMillis: number,
): Promise<SessionListItem[]> {
  if (contexts.length === 0) {
    return [];
  }

  const perContext = await Promise.all(
    contexts.map((ctx) =>
      queryContext<{
        session_id: string;
        last_activity: Date;
        message_count: string;
        last_type: string | null;
        last_content: string | null;
      }>(
        ctx,
        `
          WITH base AS (
            SELECT
              session_id,
              message->>'type' AS type,
              message->>'content' AS content,
              created_at,
              ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at DESC) AS rn
            FROM n8n_chat_histories
            WHERE created_at >= $1 AND created_at < $2
          ),
          aggregated AS (
            SELECT
              session_id,
              MAX(created_at) AS last_activity,
              COUNT(*) AS message_count
            FROM base
            GROUP BY session_id
          )
          SELECT
            aggregated.session_id,
            aggregated.last_activity,
            aggregated.message_count,
            base.type AS last_type,
            base.content AS last_content
          FROM aggregated
          JOIN base ON base.session_id = aggregated.session_id AND base.rn = 1
          ORDER BY aggregated.last_activity DESC
          LIMIT $3 OFFSET $4
        `,
        [start, end, limit, offset],
      ),
    ),
  );

  const sessions: SessionListItem[] = [];

  for (const [index, rows] of perContext.entries()) {
    const ctx = contexts[index];
    for (const row of rows) {
      const compositeId = `${ctx.contextKey}:${row.session_id}`;
      const lastActivityDate = new Date(row.last_activity);
      const lastType =
        row.last_type === "human" || row.last_type === "ai"
          ? row.last_type
          : "other";
      const lastSpeaker = lastType;
      const rawContent = row.last_content ?? "";
      const snippet =
        rawContent.length > 80 ? `${rawContent.slice(0, 77)}…` : rawContent;

      const thresholdDate = new Date(now.getTime() - thresholdMillis);
      const isOverdue =
        lastSpeaker === "human" && lastActivityDate < thresholdDate;

      sessions.push({
        id: compositeId,
        sessionId: row.session_id,
        office: ctx.office,
        bot: ctx.bot,
        lastActivity: formatTimestamp(lastActivityDate),
        lastSpeaker,
        lastMessageSnippet: snippet,
        messageCount: Number(row.message_count),
        isOverdue,
      });
    }
  }

  sessions.sort((a, b) => {
    const aTime = new Date(a.lastActivity).getTime();
    const bTime = new Date(b.lastActivity).getTime();
    return bTime - aTime;
  });

  if (!searchQuery) {
    return sessions.slice(0, limit);
  }

  const lowered = searchQuery.toLowerCase();
  const filtered = sessions.filter((session) =>
    session.sessionId.toLowerCase().includes(lowered),
  );

  return filtered.slice(0, limit);
}

