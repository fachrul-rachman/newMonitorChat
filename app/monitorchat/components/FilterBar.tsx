import type { ParsedFilters } from "../../../lib/dateRange";
import type { DbContext } from "../../../lib/db";

type FilterBarProps = {
  filters: ParsedFilters;
  configuredContexts: DbContext[];
};

export function FilterBar({ filters, configuredContexts }: FilterBarProps) {
  const hasAMG = configuredContexts.some((c) => c.office === "AMG");
  const hasLMP = configuredContexts.some((c) => c.office === "LMP");

  const hasSales = configuredContexts.some((c) => c.bot === "sales");
  const hasCustomer = configuredContexts.some((c) => c.bot === "customer");

  const hasActiveFilters =
    filters.office !== "all" ||
    filters.bot !== "all" ||
    filters.preset !== "7d" ||
    !!filters.search;

  const chips: string[] = [];
  if (filters.office !== "all") chips.push(`Office: ${filters.office}`);
  if (filters.bot !== "all") chips.push(`Bot: ${filters.bot}`);
  if (filters.preset === "custom") {
    chips.push(
      `Range: custom ${filters.from ?? "?"} → ${filters.to ?? "?"}`,
    );
  } else if (filters.preset !== "7d") {
    chips.push(`Range: ${filters.preset}`);
  }
  if (filters.search) chips.push(`Search: ${filters.search}`);

  return (
    <section className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color:var(--color-surface)]/95 px-4 py-3 text-xs shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
              Filters
            </p>
            <p className="text-[11px] text-[color:var(--color-muted)]">
              Office, bot, tanggal, dan pencarian sesi.
            </p>
          </div>
          <div className="hidden text-[11px] text-[color:var(--color-muted)] md:block">
            Semua waktu dalam zona Asia/Jakarta (+07).
          </div>
        </div>

        <form
          method="GET"
          className="mt-1 flex flex-wrap items-end gap-2 text-[11px]"
        >
          <div className="flex flex-col">
            <label className="mb-1 font-medium text-[color:var(--color-muted)]">
              Office
            </label>
            <select
              name="office"
              defaultValue={filters.office}
              className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
            >
              <option value="all">All</option>
              {hasAMG && <option value="AMG">AMG</option>}
              {hasLMP && <option value="LMP">LMP</option>}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 font-medium text-[color:var(--color-muted)]">
              Bot
            </label>
            <select
              name="bot"
              defaultValue={filters.bot}
              className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
            >
              <option value="all">All</option>
              {hasSales && <option value="sales">sales</option>}
              {hasCustomer && <option value="customer">customer</option>}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 font-medium text-[color:var(--color-muted)]">
              Date range
            </label>
            <select
              name="range"
              defaultValue={filters.preset}
              className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
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
                <label className="mb-1 font-medium text-[color:var(--color-muted)]">
                  From
                </label>
                <input
                  type="date"
                  name="from"
                  defaultValue={filters.from}
                  className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
                />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 font-medium text-[color:var(--color-muted)]">
                  To
                </label>
                <input
                  type="date"
                  name="to"
                  defaultValue={filters.to}
                  className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
                />
              </div>
            </>
          )}

          <div className="flex min-w-[180px] flex-1 flex-col">
            <label className="mb-1 font-medium text-[color:var(--color-muted)]">
              Search session_id
            </label>
            <input
              type="search"
              name="q"
              defaultValue={filters.search}
              placeholder="Cari session_id..."
              className="w-full rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[11px]"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-[color:var(--color-primary)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--color-primary-contrast)] shadow-sm hover:bg-[color:var(--color-primary)]/90 focus-visible:outline-none"
            >
              Apply
            </button>
            <a
              href="/"
              className="rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-2)] focus-visible:outline-none"
            >
              Reset
            </a>
          </div>
        </form>

        {hasActiveFilters && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[color:var(--color-muted)]"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)]" />
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

