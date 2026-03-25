// ============================================================================
// AI Code Assistant - Utility Helper Functions
// Collection of reusable utility functions
// ============================================================================

/**
 * Get color for quality grade
 * @param {string} grade - Quality grade (A-F)
 * @returns {string} Hex color code
 */
export const getGradeColor = (grade) => {
  const colors = {
    'A': '#4caf50',
    'B': '#8bc34a',
    'C': '#ffc107',
    'D': '#ff9800',
    'F': '#f44336'
  };
  return colors[grade?.toUpperCase()] || '#999';
};

/**
 * Get color for quality score
 * @param {number} score - Quality score (0-100)
 * @returns {string} Hex color code
 */
export const getScoreColor = (score) => {
  if (score >= 90) return '#4caf50';
  if (score >= 80) return '#8bc34a';
  if (score >= 70) return '#ffc107';
  if (score >= 60) return '#ff9800';
  return '#f44336';
};

/**
 * Get complexity level and color
 * @param {number} complexity - Cyclomatic complexity
 * @returns {Object} {level, color, label}
 */
export const getComplexityInfo = (complexity) => {
  if (complexity <= 5) {
    return { level: 'low', color: '#4caf50', label: 'Low' };
  }
  if (complexity <= 10) {
    return { level: 'moderate', color: '#8bc34a', label: 'Moderate' };
  }
  if (complexity <= 20) {
    return { level: 'high', color: '#ffc107', label: 'High' };
  }
  return { level: 'very-high', color: '#f44336', label: 'Very High' };
};

// ============================================================================
// Date & Time Formatting
// ============================================================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format date with time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return formatDate(date);
};

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} total - Total value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(decimals) + '%';
};

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength = 50) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-case string
 */
export const kebabCase = (str) => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * Convert string to camelCase
 * @param {string} str - String to convert
 * @returns {string} CamelCase string
 */
export const camelCase = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => 
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/\s+/g, '');
};

// ============================================================================
// File Utilities
// ============================================================================

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array<string>} allowedTypes - Allowed MIME types
 * @returns {boolean} Is valid
 */
export const isValidFileType = (file, allowedTypes = ['.py']) => {
  const fileName = file.name.toLowerCase();
  return allowedTypes.some(type => fileName.endsWith(type));
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} Is valid size
 */
export const isValidFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Get file extension
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Validate GitHub URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid GitHub URL
 */
export const isValidGitHubUrl = (url) => {
  const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+/;
  return githubPattern.test(url);
};

/**
 * Extract repo info from GitHub URL
 * @param {string} url - GitHub URL
 * @returns {Object|null} {owner, repo} or null
 */
export const parseGitHubUrl = (url) => {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2].replace('.git', '')
  };
};

/**
 * Build query string from object
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
export const buildQueryString = (params) => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * Sort array by key
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Get unique values from array
 * @param {Array} array - Array to process
 * @param {string} key - Optional key for objects
 * @returns {Array} Unique values
 */
export const unique = (array, key = null) => {
  if (key) {
    return [...new Map(array.map(item => [item[key], item])).values()];
  }
  return [...new Set(array)];
};

// ============================================================================
// Clipboard Utilities
// ============================================================================

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

// ============================================================================
// Local Storage Utilities
// ============================================================================

/**
 * Save to localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

/**
 * Load from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

/**
 * Remove from localStorage
 * @param {string} key - Storage key
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

// ============================================================================
// Debounce & Throttle
// ============================================================================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ============================================================================
// Export all utilities
// ============================================================================

export default {
  // Colors
  getGradeColor,
  getScoreColor,
  getComplexityInfo,
  
  // Date & Time
  formatDate,
  formatDateTime,
  getRelativeTime,
  
  // Numbers
  formatNumber,
  formatFileSize,
  formatPercentage,
  
  // Strings
  truncate,
  capitalize,
  kebabCase,
  camelCase,
  
  // Files
  isValidFileType,
  isValidFileSize,
  getFileExtension,
  
  // URLs
  isValidGitHubUrl,
  parseGitHubUrl,
  buildQueryString,
  
  // Arrays
  groupBy,
  sortBy,
  unique,
  
  // Clipboard
  copyToClipboard,
  
  // Storage
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  
  // Performance
  debounce,
  throttle,
};
