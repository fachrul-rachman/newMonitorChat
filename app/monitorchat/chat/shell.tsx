"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type OfficeFilter = "AMG" | "LMP" | "all";
type BotFilter = "sales" | "customer" | "all";
type DateRangePreset = "today" | "7d" | "30d" | "custom";

type Filters = {
  office: OfficeFilter;
  bot: BotFilter;
  preset: DateRangePreset;
  from?: string;
  to?: string;
};

type SessionListItem = {
  id: string;
  sessionId: string;
  office: string;
  bot: string;
  lastActivity: string;
  messageCount: number;
};

type MessageView = {
  id: number;
  role: "human" | "ai" | "other";
  content: string;
  createdAt: string;
  raw: unknown;
};

type ChatState = {
  sessions: SessionListItem[];
  loadingSessions: boolean;
  sessionsError?: string;
  selectedCompositeId?: string;
  messages: MessageView[];
  loadingMessages: boolean;
};

const DEFAULT_FILTERS: Filters = {
  office: "all",
  bot: "all",
  preset: "7d",
};

const SESSION_POLL_MS = 10000;
const MESSAGE_POLL_MS = 3000;

export default function ChatShell() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ChatState>({
    sessions: [],
    loadingSessions: true,
    sessionsError: undefined,
    selectedCompositeId: undefined,
    messages: [],
    loadingMessages: false,
  });
  const [showMessagesOnMobile, setShowMessagesOnMobile] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("office", filters.office);
    params.set("bot", filters.bot);
    params.set("range", filters.preset);
    if (filters.preset === "custom") {
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
    }
    if (search) params.set("q", search);
    params.set("page", String(page));
    return params.toString();
  }, [filters, search, page]);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionsOnce() {
      setState((prev) => ({ ...prev, loadingSessions: true }));
      try {
        const res = await fetch(`/api/sessions?${queryString}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const errorData = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          const message =
            errorData?.error ?? "Gagal memuat daftar sesi dari server.";
          throw new Error(message);
        }
        const data = (await res.json()) as {
          sessions: SessionListItem[];
          error?: string;
        };
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          sessions: data.sessions,
          loadingSessions: false,
          sessionsError: data.error,
        }));
      } catch (error) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          sessions: [],
          loadingSessions: false,
          sessionsError:
            error instanceof Error
              ? error.message
              : "Gagal memuat daftar sesi. Cek log server.",
        }));
      }
    }

    loadSessionsOnce();

    const interval = setInterval(loadSessionsOnce, SESSION_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [queryString]);

  useEffect(() => {
    if (!state.selectedCompositeId) {
      setState((prev) => ({ ...prev, messages: [] }));
      return;
    }

    const compositeId = state.selectedCompositeId;
    let cancelled = false;

    async function loadMessagesOnce() {
      setState((prev) => ({
        ...prev,
        loadingMessages: true,
      }));
      try {
        const res = await fetch(
          `/api/chat?sid=${encodeURIComponent(compositeId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error("Failed to load messages");
        }
        const data = (await res.json()) as {
          messages: MessageView[];
        };
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          messages: data.messages,
          loadingMessages: false,
        }));
      } catch {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          messages: [],
          loadingMessages: false,
        }));
      }
    }

    loadMessagesOnce();
    const interval = setInterval(loadMessagesOnce, MESSAGE_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state.selectedCompositeId]);

  const handleFilterChange = (patch: Partial<Filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      preset:
        patch.preset !== undefined
          ? patch.preset
          : patch.from || patch.to
            ? "custom"
            : prev.preset,
    }));
    setPage(1);
  };

  const handleSelectSession = (sessionId: string) => {
    setState((prev) => ({
      ...prev,
      selectedCompositeId: sessionId,
    }));

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setShowMessagesOnMobile(true);
    }
  };

  return (
    <div className="chat-shell flex flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Chat Viewer</h2>
          <p className="text-xs text-zinc-600">
            Pilih sesi di kiri untuk melihat isi chat.
          </p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <aside
          className={`w-full min-h-0 flex-shrink-0 flex-col border-b border-zinc-200 md:w-80 md:border-b-0 md:border-r ${
            showMessagesOnMobile ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-zinc-200 px-3 py-2 text-xs">
            <div className="mb-2 flex items-center gap-2">
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
                value={filters.office}
                onChange={(e) =>
                  handleFilterChange({ office: e.target.value as OfficeFilter })
                }
              >
                <option value="all">Office: All</option>
                <option value="AMG">AMG</option>
                <option value="LMP">LMP</option>
              </select>
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
                value={filters.bot}
                onChange={(e) =>
                  handleFilterChange({ bot: e.target.value as BotFilter })
                }
              >
                <option value="all">Bot: All</option>
                <option value="sales">sales</option>
                <option value="customer">customer</option>
              </select>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
                value={filters.preset}
                onChange={(e) =>
                  handleFilterChange({
                    preset: e.target.value as DateRangePreset,
                  })
                }
              >
                <option value="today">Today</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
                <option value="custom">Custom</option>
              </select>
              {filters.preset === "custom" && (
                <>
                  <input
                    type="date"
                    className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
                    value={filters.from ?? ""}
                    onChange={(e) =>
                      handleFilterChange({ from: e.target.value })
                    }
                  />
                  <input
                    type="date"
                    className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
                    value={filters.to ?? ""}
                    onChange={(e) =>
                      handleFilterChange({ to: e.target.value })
                    }
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded border border-zinc-300 px-2 py-1 text-[11px]"
                placeholder="Cari session_id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto text-xs">
            {state.loadingSessions && (
              <div className="px-3 py-3 text-zinc-500">Memuat sesi...</div>
            )}
            {!state.loadingSessions &&
              state.sessions.length === 0 &&
              !state.sessionsError && (
                <div className="px-3 py-3 text-zinc-500">
                  Tidak ada sesi untuk filter saat ini. Coba ubah rentang tanggal
                  menjadi 30 hari atau pastikan data di tabel{" "}
                  <code>n8n_chat_histories</code> berada dalam rentang tersebut.
                </div>
              )}
            {!state.loadingSessions && state.sessionsError && (
              <div className="px-3 py-3 text-xs text-red-600">
                {state.sessionsError}
              </div>
            )}
            {state.sessions.map((session) => {
              const isActive = state.selectedCompositeId === session.id;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleSelectSession(session.id)}
                  className={`block w-full border-b border-zinc-100 px-3 py-2 text-left text-xs ${
                    isActive ? "bg-zinc-100" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-zinc-900">
                      {session.sessionId}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {session.lastActivity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-zinc-600">
                      <span className="mr-1 rounded bg-zinc-100 px-1.5 py-0.5">
                        {session.office}
                      </span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-white">
                        {session.bot}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {session.messageCount} pesan
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section
          className={`flex-1 min-h-0 border-t border-zinc-200 bg-zinc-50 md:border-l md:border-t-0 ${
            showMessagesOnMobile ? "flex" : "hidden"
          } md:flex`}
        >
          {!state.selectedCompositeId ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center text-xs text-zinc-500">
              <p className="mb-2 font-medium text-zinc-700">
                Pilih sesi dari daftar kiri untuk melihat detail chat.
              </p>
              <p>
                Gunakan filter Office/Bot/Date dan pencarian{" "}
                <code>session_id</code> untuk mempersempit.
              </p>
            </div>
          ) : (
            <ChatMessages
              state={state}
              onBack={() => setShowMessagesOnMobile(false)}
            />
          )}
        </section>
      </div>
    </div>
  );
}

type ChatMessagesProps = {
  state: ChatState;
  onBack?: () => void;
};

function ChatMessages({ state, onBack }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    if (!stickToBottom) {
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state.messages.length, stickToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < 80);
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-50 to-zinc-100 text-xs"
      >
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 py-2 text-xs backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-1 mr-2 rounded bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white md:hidden"
                >
                  Kembali
                </button>
              )}
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                Session
              </div>
              <div className="font-mono text-sm text-zinc-900">
                {state.selectedCompositeId}
              </div>
            </div>
            <div className="text-[11px] text-zinc-500">
              {state.loadingMessages
                ? "Memuat pesan..."
                : `Total pesan: ${state.messages.length}`}
            </div>
          </div>
        </div>
        <div className="space-y-2 px-3 py-3">
        {state.messages.length === 0 && !state.loadingMessages && (
          <div className="mt-4 text-center text-xs text-zinc-500">
            Tidak ada pesan untuk sesi ini.
          </div>
        )}
        {state.messages.map((message) => (
          <div
            key={message.id}
            className={`flex w-full ${
              message.role === "human"
                ? "justify-start"
                : message.role === "ai"
                  ? "justify-end"
                  : "justify-center"
            }`}
          >
            <div
              className={`w-full max-w-full rounded-lg px-3 py-2 shadow-sm md:w-auto md:max-w-[75%] ${
                message.role === "human"
                  ? "bg-white text-zinc-900"
                  : message.role === "ai"
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-200 text-zinc-800"
              }`}
            >
              <div className="mb-1 text-[11px] font-medium">
                {message.role === "human"
                  ? "Human"
                  : message.role === "ai"
                    ? "AI"
                    : "Other"}
              </div>
              <div className="chat-message-body whitespace-pre-wrap break-words text-xs">
                {renderContent(message.content)}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] opacity-80">
                <span>{message.createdAt}</span>
                <details className="ml-2">
                  <summary className="cursor-pointer select-none">
                    Raw JSON
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-black/80 p-2 text-[9px] text-zinc-100">
                    {JSON.stringify(message.raw, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

function renderContent(text: string): ReactNode {
  const segments = text.split("**");
  if (segments.length === 1) {
    return text;
  }

  const parts: ReactNode[] = [];
  segments.forEach((segment, index) => {
    if (segment.length === 0) {
      return;
    }
    if (index % 2 === 1) {
      parts.push(
        <strong key={parts.length} className="font-semibold">
          {segment}
        </strong>,
      );
    } else {
      parts.push(segment);
    }
  });

  return parts;
}
