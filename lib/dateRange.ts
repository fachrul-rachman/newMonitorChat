export const TIME_ZONE = "Asia/Jakarta";

export type OfficeFilter = "AMG" | "LMP" | "all";
export type BotFilter = "sales" | "customer" | "all";
export type DateRangePreset = "today" | "7d" | "30d" | "custom";

export type ParsedFilters = {
  office: OfficeFilter;
  bot: BotFilter;
  preset: DateRangePreset;
  from?: string;
  to?: string;
  search?: string;
  page: number;
};

export function parseFilters(
  searchParams: { [key: string]: string | string[] | undefined } | undefined,
): ParsedFilters {
  const sp = searchParams ?? {};

  const officeParam = getSingle(sp.office);
  const botParam = getSingle(sp.bot);
  const rangeParam = getSingle(sp.range);
  const fromParam = getSingle(sp.from);
  const toParam = getSingle(sp.to);
  const searchParam = getSingle(sp.q);
  const pageParam = getSingle(sp.page);

  const office: OfficeFilter =
    officeParam === "AMG" || officeParam === "LMP" || officeParam === "all"
      ? officeParam
      : "all";
  const bot: BotFilter =
    botParam === "sales" || botParam === "customer" || botParam === "all"
      ? botParam
      : "all";
  const preset: DateRangePreset =
    rangeParam === "today" ||
    rangeParam === "7d" ||
    rangeParam === "30d" ||
    rangeParam === "custom"
      ? rangeParam
      : "7d";

  const pageNumber = Number(pageParam ?? "1");
  const page = Number.isFinite(pageNumber) && pageNumber > 0
    ? Math.floor(pageNumber)
    : 1;

  return {
    office,
    bot,
    preset,
    from: preset === "custom" ? fromParam ?? undefined : undefined,
    to: preset === "custom" ? toParam ?? undefined : undefined,
    search: searchParam ?? undefined,
    page,
  };
}

function getSingle(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

type DateRange = {
  start: Date;
  end: Date;
};

export function getDateRange(filters: ParsedFilters, now: Date): DateRange {
  if (filters.preset === "custom" && filters.from && filters.to) {
    const start = startOfDayInTimeZone(filters.from);
    const end = addDays(startOfDayInTimeZone(filters.to), 1);
    return { start, end };
  }

  const effectiveNow = now;
  const startOfToday = startOfDay(effectiveNow);

  const defaultDays = getDefaultDateRangeDays();

  if (filters.preset === "today") {
    const start = startOfToday;
    const end = addDays(start, 1);
    return { start, end };
  }

  if (filters.preset === "30d") {
    const end = addDays(startOfToday, 1);
    const start = addDays(end, -30);
    return { start, end };
  }

  const end = addDays(startOfToday, 1);
  const days = Number.isFinite(defaultDays) && defaultDays > 0 ? defaultDays : 7;
  const start = addDays(end, -days);
  return { start, end };
}

function getDefaultDateRangeDays(): number {
  const raw = process.env.DEFAULT_DATE_RANGE_DAYS;
  if (!raw) return 7;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.floor(parsed);
}

function startOfDay(date: Date): Date {
  const parts = formatInTimeZone(date);
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);
  return new Date(utc);
}

function startOfDayInTimeZone(dateString: string): Date {
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return startOfDay(new Date());
  }
  const utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(utc);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatInTimeZone(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
  };
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleString("id-ID", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

