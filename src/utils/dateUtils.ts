export function getYear(date: Date): string {
  return date.getFullYear().toString();
}

export function getMonth(date: Date): string {
  return (date.getMonth() + 1).toString().padStart(2, '0');
}

export function getDay(date: Date): string {
  return date.getDate().toString().padStart(2, '0');
}

export function formatDate(date: Date): string {
  return `${getYear(date)}-${getMonth(date)}-${getDay(date)}`;
}