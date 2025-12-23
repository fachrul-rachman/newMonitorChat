import { Pool } from "pg";

export type Office = "AMG" | "LMP";
export type BotType = "sales" | "customer";
export type ContextKey = `${Office}:${BotType}`;

export type DbContext = {
  office: Office;
  bot: BotType;
  contextKey: ContextKey;
  label: string;
  envVar: string;
  url?: string;
};

const CONTEXTS: DbContext[] = [
  {
    office: "AMG",
    bot: "sales",
    contextKey: "AMG:sales",
    label: "AMG Sales",
    envVar: "DB_URL_AMG_SALES",
  },
  {
    office: "AMG",
    bot: "customer",
    contextKey: "AMG:customer",
    label: "AMG Customer",
    envVar: "DB_URL_AMG_CUSTOMER",
  },
  {
    office: "LMP",
    bot: "sales",
    contextKey: "LMP:sales",
    label: "LMP Sales",
    envVar: "DB_URL_LMP_SALES",
  },
  {
    office: "LMP",
    bot: "customer",
    contextKey: "LMP:customer",
    label: "LMP Customer",
    envVar: "DB_URL_LMP_CUSTOMER",
  },
];

const pools: Map<ContextKey, Pool> = new Map();

function resolveUrl(envVar: string): string | undefined {
  const value = process.env[envVar];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

export function getAllContexts(): DbContext[] {
  return CONTEXTS.map((ctx) => ({
    ...ctx,
    url: resolveUrl(ctx.envVar),
  }));
}

export function getConfiguredContexts(): DbContext[] {
  return getAllContexts().filter((ctx) => ctx.url);
}

export function filterContexts(
  office: "AMG" | "LMP" | "all",
  bot: "sales" | "customer" | "all",
): DbContext[] {
  const contexts = getConfiguredContexts();
  return contexts.filter((ctx) => {
    const officeOk = office === "all" || ctx.office === office;
    const botOk = bot === "all" || ctx.bot === bot;
    return officeOk && botOk;
  });
}

function getPool(contextKey: ContextKey): Pool | null {
  const existing = pools.get(contextKey);
  if (existing) {
    return existing;
  }

  const ctx = getAllContexts().find((c) => c.contextKey === contextKey);
  if (!ctx || !ctx.url) {
    return null;
  }

  const pool = new Pool({
    connectionString: ctx.url,
    max: 5,
  });
  pools.set(contextKey, pool);
  return pool;
}

export async function queryContext<T = unknown>(
  context: DbContext,
  text: string,
  values: unknown[],
): Promise<T[]> {
  const pool = getPool(context.contextKey);
  if (!pool) {
    return [];
  }
  const result = await pool.query(text, values);
  return result.rows as T[];
}

export type ChatRow = {
  id: number;
  session_id: string;
  role: "human" | "ai";
  content: string;
  created_at: Date;
};
