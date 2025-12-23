export default function MonitorChatLoading() {
  return (
    <div className="space-y-4">
      <section className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color:var(--color-surface)]/95 px-4 py-3 text-xs backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2">
          <div className="h-3 w-24 rounded bg-[color:var(--color-surface-2)]" />
          <div className="flex flex-wrap gap-2">
            <div className="h-7 w-32 rounded bg-[color:var(--color-surface-2)]" />
            <div className="h-7 w-28 rounded bg-[color:var(--color-surface-2)]" />
            <div className="h-7 w-28 rounded bg-[color:var(--color-surface-2)]" />
            <div className="h-7 flex-1 rounded bg-[color:var(--color-surface-2)]" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-4 md:grid-cols-2">
        <div className="card h-32" />
        <div className="card h-32" />
      </section>

      <section className="grid gap-4 px-4 pb-4 md:grid-cols-3">
        <div className="card h-56 md:col-span-2" />
        <div className="card h-56" />
      </section>
    </div>
  );
}

