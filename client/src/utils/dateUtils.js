// dateUtils.js

/**
 * Format date and time for display (e.g. "Mar 1, 2025, 12:00 PM").
 */
export function formatTime(dateStr) {
  if (!dateStr) return 'N/A';
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateStr).toTimeString([], options).split(' ')[0];
}
export function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateStr).toLocaleString([], options);
  }
  
  /**
   * Format date as `MM/DD/YYYY` for building Expedia URLs.
   */
  export function formatDateForExpedia(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  }
  
  /**
   * Compute layover duration in h/m from two date strings.
   */
  export function computeLayover(arrivalTime, nextDepartureTime) {
    if (!arrivalTime || !nextDepartureTime) return 'N/A';
    const diffMs = new Date(nextDepartureTime) - new Date(arrivalTime);
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
  }
  