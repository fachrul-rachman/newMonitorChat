"use client";

import { useRouter } from "next/navigation";

export type SessionStatus = "Open" | "Closed" | "Overdue" | "Needs attention";

export type SessionTableRow = {
  id: string;
  sessionId: string;
  office: string;
  bot: string;
  contextLabel: string;
  lastActivityLabel: string;
  messageCount: number;
  humanCount: number;
  aiCount: number;
  status: SessionStatus;
};

type SessionTableProps = {
  rows: SessionTableRow[];
};

export function SessionTable({ rows }: SessionTableProps) {
  const router = useRouter();

  const handleRowActivate = (row: SessionTableRow) => {
    router.push(`/chat?sid=${encodeURIComponent(row.id)}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-[var(--color-border)] bg-[color:var(--color-surface-2)] text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          <tr>
            <th className="px-2 py-1">Last activity</th>
            <th className="px-2 py-1">Office/Bot</th>
            <th className="px-2 py-1">Session ID</th>
            <th className="px-2 py-1 text-right">Msgs</th>
            <th className="px-2 py-1 text-right">Human</th>
            <th className="px-2 py-1 text-right">AI</th>
            <th className="px-2 py-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-2 py-4 text-center text-xs text-[color:var(--color-muted)]"
              >
                Belum ada sesi untuk filter yang dipilih.
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const isOverdue = row.status === "Overdue";
            const statusColor =
              row.status === "Overdue"
                ? "bg-[color:var(--color-danger)]"
                : row.status === "Open"
                  ? "bg-[color:var(--color-warning)]"
                  : row.status === "Needs attention"
                    ? "bg-[color:var(--color-info)]"
                    : "bg-[color:var(--color-success)]";

            return (
              <tr
                key={row.id}
                tabIndex={0}
                className="cursor-pointer border-b border-[var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-surface-2)] focus-visible:outline-none"
                onClick={() => handleRowActivate(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleRowActivate(row);
                  }
                }}
              >
                <td className="px-2 py-1 text-xs text-[color:var(--color-text)]">
                  {row.lastActivityLabel}
                </td>
                <td className="px-2 py-1 text-xs">
                  <span className="mr-1 rounded-full bg-[color:var(--color-surface-2)] px-1.5 py-0.5 text-[10px] text-[color:var(--color-text)]">
                    {row.office}
                  </span>
                  <span className="rounded-full bg-[color:var(--color-primary)] px-1.5 py-0.5 text-[10px] text-[color:var(--color-primary-contrast)]">
                    {row.bot}
                  </span>
                </td>
                <td className="px-2 py-1 font-mono text-xs text-[color:var(--color-text)]">
                  {row.sessionId}
                </td>
                <td className="px-2 py-1 text-right text-xs text-[color:var(--color-text)]">
                  {row.messageCount}
                </td>
                <td className="px-2 py-1 text-right text-xs text-[color:var(--color-text)]">
                  {row.humanCount}
                </td>
                <td className="px-2 py-1 text-right text-xs text-[color:var(--color-text)]">
                  {row.aiCount}
                </td>
                <td className="px-2 py-1 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[color:var(--color-text)]">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor}`}
                    />
                    {row.status}
                    {isOverdue && (
                      <span className="sr-only">
                        , lebih lama dari threshold pending
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

