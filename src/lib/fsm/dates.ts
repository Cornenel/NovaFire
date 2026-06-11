export function todayInSA(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Johannesburg",
  });
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
