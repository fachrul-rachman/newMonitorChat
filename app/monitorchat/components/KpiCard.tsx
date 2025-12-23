type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  tooltip?: string;
};

export function KpiCard({
  title,
  value,
  subtitle,
  tone = "neutral",
  tooltip,
}: KpiCardProps) {
  const toneColor =
    tone === "success"
      ? "bg-[color:var(--color-success)]"
      : tone === "warning"
        ? "bg-[color:var(--color-warning)]"
        : tone === "danger"
          ? "bg-[color:var(--color-danger)]"
          : tone === "info"
            ? "bg-[color:var(--color-info)]"
            : "bg-[color:var(--color-primary)]";

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted)]">
        <span>{title}</span>
        {tooltip && (
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--color-border)] bg-[color:var(--color-surface-2)] text-[10px] font-semibold text-[color:var(--color-muted)]"
            aria-label={tooltip}
            title={tooltip}
          >
            ?
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-semibold leading-tight text-[color:var(--color-text)]">
          {value}
        </div>
        {tone !== "neutral" && (
          <span
            className={`inline-flex h-1.5 w-1.5 rounded-full ${toneColor}`}
            aria-hidden="true"
          />
        )}
      </div>
      {subtitle && (
        <p className="mt-2 text-xs text-[color:var(--color-muted)]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

