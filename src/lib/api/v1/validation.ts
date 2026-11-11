export function normalizeTextForMatch(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizePhoneForMatch(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0027")) return `0${digits.slice(4)}`;
  if (digits.startsWith("27")) return `0${digits.slice(2)}`;
  return digits;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidSouthAfricanPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^(\+?27|0027|0)[0-9\s().-]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/\D/g, "");
  return (
    (digits.length === 10 && digits.startsWith("0")) ||
    (digits.length === 11 && digits.startsWith("27")) ||
    (digits.length === 13 && digits.startsWith("0027"))
  );
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function pickDefined<T extends Record<string, unknown>>(
  input: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}
