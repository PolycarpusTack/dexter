/**
 * Format large numbers with abbreviations for better readability
 * 
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatLargeNumber(num: number): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
}

/**
 * Format percentage values consistently
 * 
 * @param value - Percentage value to format
 * @param decimalPlaces - Number of decimal places to include
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimalPlaces: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  
  // Handle small values to avoid showing 0% for small but non-zero values
  if (value > 0 && value < 0.1) {
    return '< 0.1%';
  }
  
  return value.toFixed(decimalPlaces).replace(/\.0$/, '') + '%';
}

/**
 * Format file size in bytes to human-readable format
 * 
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human-readable format
 * 
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1).replace(/\.0$/, '')}s`;
  } else if (milliseconds < 3600000) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}

export default {
  formatLargeNumber,
  formatPercentage,
  formatFileSize,
  formatDuration,
};