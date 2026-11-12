export const ADMIN_PAGE_SIZE = 25;

export type AdminListParams = {
  q: string;
  page: number;
  pageSize: number;
  offset: number;
  from: number;
  to: number;
};

/** Strip PostgREST filter metacharacters from free-text search. */
export function sanitizeSearchTerm(raw: string | undefined | null): string {
  return (raw ?? "")
    .replace(/[%_,()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Quoted ilike pattern safe for `.or()` / `.filter()` values with spaces. */
export function ilikePattern(term: string): string {
  return `"%${sanitizeSearchTerm(term)}%"`;
}

export function parseAdminListParams(
  searchParams: { q?: string; page?: string; pageSize?: string },
  defaults?: { pageSize?: number }
): AdminListParams {
  const pageSize = Math.min(
    Math.max(
      Number(searchParams.pageSize) || defaults?.pageSize || ADMIN_PAGE_SIZE,
      1
    ),
    100
  );
  const page = Math.max(Number(searchParams.page) || 1, 1);
  const q = sanitizeSearchTerm(searchParams.q);
  const offset = (page - 1) * pageSize;
  return {
    q,
    page,
    pageSize,
    offset,
    from: offset,
    to: offset + pageSize - 1,
  };
}

export function buildAdminListHref(
  pathname: string,
  params: Record<string, string | undefined | null>,
  overrides?: Record<string, string | number | undefined | null>
): string {
  const sp = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "" || value === "all") {
      continue;
    }
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function totalPages(totalCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(totalCount, 0) / pageSize));
}
