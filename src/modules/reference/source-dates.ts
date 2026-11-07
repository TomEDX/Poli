const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

// The date has no time, so it is read and shown in UTC: no time zone can move it by a day.
export function formatConsultedOn(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}

// Today in Paris, as the date input expects it: the default date of a new source.
export function todayInParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}
