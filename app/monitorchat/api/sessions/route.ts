import { NextResponse } from "next/server";
import { formatTimestamp, getDateRange, parseFilters } from "../../../../lib/dateRange";
import { DbContext, filterContexts, queryContext } from "../../../../lib/db";

type SessionListItem = {
  id: string;
  sessionId: string;
  office: string;
  bot: string;
  lastActivity: string;
  messageCount: number;
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
      }>(
        ctx,
        `
          SELECT
            session_id,
            MAX(created_at) AS last_activity,
            COUNT(*) AS message_count
          FROM n8n_chat_histories
          WHERE created_at >= $1 AND created_at < $2
          GROUP BY session_id
          ORDER BY last_activity DESC
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
      sessions.push({
        id: compositeId,
        sessionId: row.session_id,
        office: ctx.office,
        bot: ctx.bot,
        lastActivity: formatTimestamp(new Date(row.last_activity)),
        messageCount: Number(row.message_count),
      });
    }
  }

  sessions.sort(
    (a, b) =>
      new Date(b.lastActivity).getTime() -
      new Date(a.lastActivity).getTime(),
  );

  if (!searchQuery) {
    return sessions.slice(0, limit);
  }

  const lowered = searchQuery.toLowerCase();
  const filtered = sessions.filter((session) =>
    session.sessionId.toLowerCase().includes(lowered),
  );

  return filtered.slice(0, limit);
}
