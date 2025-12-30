/**
 * Time utility functions for formatting and converting time values
 */

/**
 * Converts military time (24-hour format) to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "20:00", "14:30")
 * @returns Time in 12-hour format (e.g., "8:00 PM", "2:30 PM")
 */
export function formatTime12Hour(time24: string | null | undefined): string {
  if (!time24) return '';
  
  try {
    // Handle various formats
    const timePart = time24.split('T').pop()?.split(':') || time24.split(':');
    if (timePart.length < 2) return time24;
    
    let hours = parseInt(timePart[0], 10);
    const minutes = timePart[1].padStart(2, '0');
    
    if (isNaN(hours)) return time24;
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12 for midnight
    
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return time24;
  }
}

/**
 * Formats a date string for HTML date input (YYYY-MM-DD)
 * @param dateString - Date string from database (could be ISO format or just date)
 * @returns Date in YYYY-MM-DD format for HTML date input
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Parse the date and format it using UTC to avoid timezone shifts
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    // Use UTC methods to prevent timezone offset issues
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
}

/**
 * Formats a date for display (e.g., "December 26, 2025")
 * @param dateString - Date string from database
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    // Use UTC to prevent timezone offset causing dates to shift by 1 day
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats time range for display
 * @param startTime - Start time in 24-hour format
 * @param endTime - End time in 24-hour format
 * @returns Formatted time range string
 */
export function formatTimeRange(startTime: string | null | undefined, endTime: string | null | undefined): string {
  const start = formatTime12Hour(startTime);
  const end = formatTime12Hour(endTime);
  
  if (start && end) {
    return `${start} - ${end}`;
  } else if (start) {
    return start;
  } else if (end) {
    return `Until ${end}`;
  }
  
  return 'TBD';
}
