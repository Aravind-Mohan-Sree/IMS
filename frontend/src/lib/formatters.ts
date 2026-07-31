/**
 * Formats a date/timestamp into regional 12-hour format (e.g., "27 Jul 2026, 11:24 PM")
 * using the user's local browser region settings.
 */
export function formatDateTime(dateVal?: any, createdAtVal?: any): string {
  if (!dateVal && !createdAtVal) return 'N/A';
  
  let d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    d = new Date(createdAtVal);
  }

  if (isNaN(d.getTime())) {
    return String(dateVal || createdAtVal);
  }

  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Returns local YYYY-MM-DD date string in user's browser timezone.
 */
export function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
