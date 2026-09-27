const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-08` or `2026-08-14` → `Aug 2026`. Returns '' for empty/invalid. */
export function fmtMonth(v: string | null | undefined): string {
  const m = v?.match(/^(\d{4})-(\d{2})/)
  if (!m) return ''
  const i = Number(m[2]) - 1
  return i >= 0 && i < 12 ? `${MONTHS[i]} ${m[1]}` : m[1]
}

/** "Aug 2026 — Present", "Jan 2024 — Mar 2025", "Aug 2026". */
export function fmtRange(start: string | null | undefined, end: string | null | undefined, current?: boolean): string {
  const a = fmtMonth(start)
  const b = current ? 'Present' : fmtMonth(end)
  if (a && b) return `${a} — ${b}`
  return a || b
}

/** `<input type="month">` wants YYYY-MM; stored values may carry a day. */
export const toMonthInput = (v: string | null | undefined) => v?.slice(0, 7) ?? ''
export const fromMonthInput = (v: string) => (v ? v : null)
