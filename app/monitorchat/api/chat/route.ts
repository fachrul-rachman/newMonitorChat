import { NextResponse } from "next/server";
import { formatTimestamp } from "../../../../lib/dateRange";
import { ChatRow, DbContext, filterContexts, queryContext } from "../../../../lib/db";

type MessageView = {
  id: number;
  role: "human" | "ai" | "other";
  content: string;
  createdAt: string;
  raw: unknown;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sid = url.searchParams.get("sid");
  if (!sid) {
    return NextResponse.json(
      { error: "sid is required" },
      { status: 400 },
    );
  }

  const result = await getMessagesForSession(sid);
  if (!result) {
    return NextResponse.json({ messages: [] });
  }

  return NextResponse.json({ messages: result.rows });
}

async function getMessagesForSession(
  compositeId: string,
): Promise<{ context: DbContext; rows: MessageView[] } | null> {
  const parts = parseCompositeSessionId(compositeId);
  if (!parts) {
    return null;
  }

  const contexts = filterContexts(parts.office, parts.bot);
  const context = contexts.find(
    (ctx) => ctx.contextKey === `${parts.office}:${parts.bot}`,
  );
  if (!context) {
    return null;
  }

  const rows = await queryContext<ChatRow>(
    context,
    `
      SELECT id, session_id, role, content, created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC, seq ASC
      LIMIT 1000
    `,
    [parts.sessionId],
  );

  const messages: MessageView[] = rows.map((row) => {
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      raw: {
        role: row.role,
        content: row.content,
      },
      createdAt: formatTimestamp(new Date(row.created_at)),
    };
  });

  return {
    context,
    rows: messages,
  };
}

function parseCompositeSessionId(
  compositeId: string,
): { office: "AMG" | "LMP"; bot: "sales" | "customer"; sessionId: string } | null {
  const parts = compositeId.split(":");
  if (parts.length < 3) {
    return null;
  }
  const [office, bot, ...rest] = parts;
  if ((office !== "AMG" && office !== "LMP") || (bot !== "sales" && bot !== "customer")) {
    return null;
  }
  const sessionId = rest.join(":");
  return { office, bot, sessionId };
}
