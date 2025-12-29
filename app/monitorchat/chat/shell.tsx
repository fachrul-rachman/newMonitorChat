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
  lastSpeaker: "human" | "ai" | "other";
  lastMessageSnippet: string;
  messageCount: number;
  isOverdue: boolean;
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
    <div className="chat-shell flex flex-col bg-[var(--color-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--color-text)]">
            Chat Viewer
          </h2>
          <p className="text-xs text-[color:var(--color-muted)]">
            Pilih sesi di kiri untuk melihat isi chat.
          </p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        <aside
          className={`w-full min-h-0 flex-shrink-0 flex-col border-b border-[var(--color-border)] bg-[color:var(--color-surface)] md:w-80 md:border-b-0 md:border-r ${
            showMessagesOnMobile ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs">
            <div className="mb-2 flex items-center gap-2">
              <select
                className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
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
                className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
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
                className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
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
                      className="flex-1 rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
                    value={filters.from ?? ""}
                    onChange={(e) =>
                      handleFilterChange({ from: e.target.value })
                    }
                  />
                    <input
                      type="date"
                      className="flex-1 rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
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
                className="w-full rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
                placeholder="Cari session_id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto text-xs">
            {state.loadingSessions && (
              <div className="space-y-2 px-3 py-3">
                <div className="h-4 w-28 rounded bg-[color:var(--color-surface-2)]" />
                <div className="space-y-2">
                  <div className="h-10 rounded bg-[color:var(--color-surface-2)]" />
                  <div className="h-10 rounded bg-[color:var(--color-surface-2)]" />
                  <div className="h-10 rounded bg-[color:var(--color-surface-2)]" />
                </div>
              </div>
            )}
            {!state.loadingSessions &&
              state.sessions.length === 0 &&
              !state.sessionsError && (
                <div className="px-3 py-3 text-[color:var(--color-muted)]">
                  <p className="mb-1 text-xs font-medium">
                    Tidak ada sesi untuk filter saat ini.
                  </p>
                  <p className="text-[11px]">
                    Coba perlebar rentang tanggal (misalnya 30 hari) atau reset
                    filter.
                  </p>
                </div>
              )}
            {!state.loadingSessions && state.sessionsError && (
              <div className="px-3 py-3 text-xs text-[color:var(--color-danger)]">
                <p className="mb-1 font-medium">Gagal memuat daftar sesi.</p>
                <p className="mb-2 text-[11px]">{state.sessionsError}</p>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev)}
                  className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-2)]"
                >
                  Coba lagi
                </button>
              </div>
            )}
            {state.sessions.map((session) => {
              const isActive = state.selectedCompositeId === session.id;
              return (
                <SessionListItemRow
                  key={session.id}
                  session={session}
                  active={isActive}
                  onSelect={() => handleSelectSession(session.id)}
                />
              );
            })}
          </div>
        </aside>

        <section
          className={`flex-1 min-h-0 border-t border-[var(--color-border)] bg-[color:var(--color-surface-2)] md:border-l md:border-t-0 ${
            showMessagesOnMobile ? "flex" : "hidden"
          } md:flex`}
        >
          {!state.selectedCompositeId ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center text-xs text-[color:var(--color-muted)]">
              <p className="mb-2 font-medium text-[color:var(--color-text)]">
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
  const [activeMessage, setActiveMessage] = useState<MessageView | null>(null);

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

  const selectedSessionId = state.selectedCompositeId ?? "";
  const [contextKey, rawSessionId] = selectedSessionId.split(":", 2);
  const headerSessionId = rawSessionId ?? selectedSessionId;

  const computedStatus = (() => {
    if (state.messages.length === 0) return "Tidak ada pesan";
    const last = state.messages[state.messages.length - 1];
    if (last.role === "human") return "Open";
    if (last.role === "ai") return "Closed";
    return "Needs attention";
  })();

  return (
    <div className="flex h-full flex-col text-xs">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent)] text-xs"
      >
        <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[color:var(--color-surface)]/95 px-4 py-2 text-xs backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-1 mr-2 inline-flex items-center rounded-md bg-[color:var(--color-surface-2)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-text)] md:hidden"
                >
                  Kembali
                </button>
              )}
              <div className="text-[11px] uppercase tracking-wide text-[color:var(--color-muted)]">
                Session
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                {contextKey && (
                  <span className="rounded-full bg-[color:var(--color-surface-2)] px-1.5 py-0.5 font-medium text-[color:var(--color-text)]">
                    {contextKey}
                  </span>
                )}
                <span className="font-mono text-sm text-[color:var(--color-text)]">
                  {headerSessionId}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-[11px] text-[color:var(--color-muted)]">
              <div>
                {state.loadingMessages
                  ? "Memuat pesan..."
                  : `Total pesan: ${state.messages.length}`}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[color:var(--color-text)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-info)]" />
                {computedStatus}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2 px-3 py-3">
          {state.messages.length === 0 && !state.loadingMessages && (
            <div className="mt-4 text-center text-xs text-[color:var(--color-muted)]">
              Tidak ada pesan untuk sesi ini.
            </div>
          )}
          {state.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onOpenDetails={() => setActiveMessage(message)}
            />
          ))}
        </div>

        {!stickToBottom && (
          <div className="pointer-events-none fixed bottom-4 right-4 z-20 flex justify-end md:right-8">
            <button
              type="button"
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              }}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--color-text)] shadow-md"
            >
              <span className="inline-block h-3 w-3 rotate-90 border-b border-r border-[color:var(--color-text)]" />
              Jump to latest
            </button>
          </div>
        )}
      </div>

      <MessageDetailsDrawer
        message={activeMessage}
        onClose={() => setActiveMessage(null)}
      />
    </div>
  );
}

function renderContent(text: string): ReactNode {
  const lines = text.split("\n");
  const renderedLines = lines.map((line, lineIndex) => {
    const segments = line.split("**");
    if (segments.length === 1) {
      return <span key={lineIndex}>{line}</span>;
    }

    const parts: ReactNode[] = [];
    segments.forEach((segment, index) => {
      if (segment.length === 0) {
        return;
      }
      if (index % 2 === 1) {
        parts.push(
          <strong key={`${lineIndex}-${parts.length}`} className="font-semibold">
            {segment}
          </strong>,
        );
      } else {
        parts.push(
          <span key={`${lineIndex}-${parts.length}`}>{segment}</span>,
        );
      }
    });

    return <span key={lineIndex}>{parts}</span>;
  });

  return renderedLines.flatMap((node, index) =>
    index === 0 ? [node] : [<br key={`br-${index}`} />, node],
  );
}

type SessionListItemRowProps = {
  session: SessionListItem;
  active: boolean;
  onSelect: () => void;
};

function SessionListItemRow({
  session,
  active,
  onSelect,
}: SessionListItemRowProps) {
  const statusLabel = session.isOverdue ? "Overdue" : "Recent";
  const statusColor = session.isOverdue
    ? "bg-[color:var(--color-danger)]"
    : "bg-[color:var(--color-success)]";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full border-b border-[var(--color-border)] px-3 py-2 text-left text-xs transition-colors ${
        active
          ? "bg-[color:var(--color-surface-2)]"
          : "hover:bg-[color:var(--color-surface-2)]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-[color:var(--color-text)]">
          {session.sessionId}
        </span>
        <span className="text-[10px] text-[color:var(--color-muted)]">
          {session.lastActivity}
        </span>
      </div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-[color:var(--color-muted)]">
          <span className="rounded-full bg-[color:var(--color-surface-2)] px-1.5 py-0.5">
            {session.office}
          </span>
          <span className="rounded-full bg-[color:var(--color-primary)] px-1.5 py-0.5 text-[color:var(--color-primary-contrast)]">
            {session.bot}
          </span>
          <span className="rounded-full bg-[color:var(--color-surface-2)] px-1.5 py-0.5">
            {session.lastSpeaker === "human" ? "Human" : "AI"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--color-muted)]">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor}`}
          />
          {statusLabel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-[color:var(--color-muted)]">
        <span className="line-clamp-1 flex-1">
          {session.lastMessageSnippet || "—"}
        </span>
        <span>{session.messageCount} pesan</span>
      </div>
    </button>
  );
}

type ChatMessageProps = {
  message: MessageView;
  onOpenDetails: () => void;
};

function ChatMessage({ message, onOpenDetails }: ChatMessageProps) {
  const isHuman = message.role === "human";
  const isAi = message.role === "ai";

  const alignment = isHuman
    ? "justify-start"
    : isAi
      ? "justify-end"
      : "justify-center";

  return (
    <div className={`flex w-full ${alignment}`}>
      <div className="max-w-full rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-xs shadow-sm md:max-w-[72%]">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 font-medium text-[color:var(--color-text)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-info)]" />
            {isHuman ? "Human" : isAi ? "AI" : "Other"}
          </span>
          <span className="text-[10px] text-[color:var(--color-muted)]">
            {message.createdAt}
          </span>
        </div>
        <div className="chat-message-body text-xs text-[color:var(--color-text)]">
          {renderContent(message.content)}
        </div>
        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-[color:var(--color-muted)]">
          <MessageActionsMenu message={message} onOpenDetails={onOpenDetails} />
        </div>
      </div>

      <MessageDetailsDrawer
        message={activeMessage}
        onClose={() => setActiveMessage(null)}
      />
    </div>
  );
}

type MessageActionsMenuProps = {
  message: MessageView;
  onOpenDetails: () => void;
};

function MessageActionsMenu({
  message,
  onOpenDetails,
}: MessageActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // ignore
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(message.raw ?? {}, null, 2),
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-surface-2)] text-[color:var(--color-text)]"
        aria-label="Buka menu aksi pesan"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] text-[11px] shadow-md">
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-[color:var(--color-surface-2)]"
            onClick={() => {
              copyText();
              close();
            }}
          >
            Copy text
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-[color:var(--color-surface-2)]"
            onClick={() => {
              copyJson();
              close();
            }}
          >
            Copy JSON
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-[color:var(--color-surface-2)]"
            onClick={() => {
              onOpenDetails();
              close();
            }}
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
}

type MessageDetailsDrawerProps = {
  message: MessageView | null;
  onClose: () => void;
};

function MessageDetailsDrawer({
  message,
  onClose,
}: MessageDetailsDrawerProps) {
  if (!message) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[color:var(--color-surface)] text-xs shadow-md">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--color-text)]">
            Message details
          </h3>
          <p className="text-[11px] text-[color:var(--color-muted)]">
            Raw JSON dan metadata untuk pesan ini.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-[color:var(--color-surface-2)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-text)]"
        >
          Tutup
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-[color:var(--color-muted)]">
            Ringkasan
          </div>
          <div className="space-y-1 rounded-md bg-[color:var(--color-surface-2)] px-3 py-2 text-[11px] text-[color:var(--color-text)]">
            <div>
              <span className="font-medium">Role: </span>
              {message.role}
            </div>
            <div>
              <span className="font-medium">Timestamp: </span>
              {message.createdAt}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-[color:var(--color-muted)]">
            Raw JSON
          </div>
          <pre className="max-h-80 overflow-auto rounded-md bg-[color:var(--color-surface-2)] p-2 text-[10px] text-[color:var(--color-text)]">
            {JSON.stringify(message.raw ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

type SessionListItemRowProps = {
  session: SessionListItem;
  active: boolean;
  onSelect: () => void;
};

function SessionListItemRow({
  session,
  active,
  onSelect,
}: SessionListItemRowProps) {
  const statusLabel = session.isOverdue ? "Overdue" : "Recent";
  const statusColor = session.isOverdue
    ? "bg-[color:var(--color-danger)]"
    : "bg-[color:var(--color-success)]";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full border-b border-[var(--color-border)] px-3 py-2 text-left text-xs transition-colors ${
        active
          ? "bg-[color:var(--color-surface-2)]"
          : "hover:bg-[color:var(--color-surface-2)]"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-[color:var(--color-text)]">
          {session.sessionId}
        </span>
        <span className="text-[10px] text-[color:var(--color-muted)]">
          {session.lastActivity}
        </span>
      </div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-[color:var(--color-muted)]">
          <span className="rounded-full bg-[color:var(--color-surface-2)] px-1.5 py-0.5">
            {session.office}
          </span>
          <span className="rounded-full bg-[color:var(--color-primary)] px-1.5 py-0.5 text-[color:var(--color-primary-contrast)]">
            {session.bot}
          </span>
          <span className="rounded-full bg-[color:var(--color-surface-2)] px-1.5 py-0.5">
            {session.lastSpeaker === "human" ? "Human" : "AI"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--color-muted)]">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor}`}
          />
          {statusLabel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-[color:var(--color-muted)]">
        <span className="line-clamp-1 flex-1">
          {session.lastMessageSnippet || "—"}
        </span>
        <span>{session.messageCount} pesan</span>
      </div>
    </button>
  );
}

type ChatMessageProps = {
  message: MessageView;
  onOpenDetails: () => void;
};

function ChatMessage({ message, onOpenDetails }: ChatMessageProps) {
  const isHuman = message.role === "human";
  const isAi = message.role === "ai";

  const alignment = isHuman
    ? "justify-start"
    : isAi
      ? "justify-end"
      : "justify-center";

  return (
    <div className={`flex w-full ${alignment}`}>
      <div className="max-w-full rounded-lg bg-[color:var(--color-surface)] px-3 py-2 text-xs shadow-sm md:max-w-[72%]">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 font-medium text-[color:var(--color-text)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-info)]" />
            {isHuman ? "Human" : isAi ? "AI" : "Other"}
          </span>
          <span className="text-[10px] text-[color:var(--color-muted)]">
            {message.createdAt}
          </span>
        </div>
        <div className="chat-message-body text-xs text-[color:var(--color-text)]">
          {renderContent(message.content)}
        </div>
        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-[color:var(--color-muted)]">
          <MessageActionsMenu message={message} onOpenDetails={onOpenDetails} />
        </div>
      </div>
    </div>
  );
}

type MessageActionsMenuProps = {
  message: MessageView;
  onOpenDetails: () => void;
};

function MessageActionsMenu({
  message,
  onOpenDetails,
}: MessageActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      // ignore
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(message.raw ?? {}, null, 2),
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-surface-2)] text-[color:var(--color-text)]"
        aria-label="Buka menu aksi pesan"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] text-[11px] shadow-md">
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-[color:var(--color-surface-2)]"
            onClick={() => {
              copyText();
              close();
            }}
          >
            Copy text
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-[color:var(--color-surface-2)]"
            onClick={() => {
              copyJson();
              close();
            }}
          >
            Copy JSON
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left hover:bg-[color:var(--color-surface-2)]"
            onClick={() => {
              onOpenDetails();
              close();
            }}
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
}

type MessageDetailsDrawerProps = {
  message: MessageView | null;
  onClose: () => void;
};

function MessageDetailsDrawer({
  message,
  onClose,
}: MessageDetailsDrawerProps) {
  if (!message) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[color:var(--color-surface)] text-xs shadow-md">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--color-text)]">
            Message details
          </h3>
          <p className="text-[11px] text-[color:var(--color-muted)]">
            Raw JSON dan metadata untuk pesan ini.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-[color:var(--color-surface-2)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-text)]"
        >
          Tutup
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <div>
          <div className="mb-1 text-[11px] font-medium text-[color:var(--color-muted)]">
            Ringkasan
          </div>
          <div className="space-y-1 rounded-md bg-[color:var(--color-surface-2)] px-3 py-2 text-[11px] text-[color:var(--color-text)]">
            <div>
              <span className="font-medium">Role: </span>
              {message.role}
            </div>
            <div>
              <span className="font-medium">Timestamp: </span>
              {message.createdAt}
            </div>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-[color:var(--color-muted)]">
            Raw JSON
          </div>
          <pre className="max-h-80 overflow-auto rounded-md bg-[color:var(--color-surface-2)] p-2 text-[10px] text-[color:var(--color-text)]">
            {JSON.stringify(message.raw ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
