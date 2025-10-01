/**
 * HTML Sanitizer Utility
 * Provides secure HTML sanitization to prevent XSS attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Default configuration for DOMPurify
 * Only allows safe HTML tags and attributes
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'div', 'ul', 'ol', 'li', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @param config - Optional DOMPurify configuration
 * @returns The sanitized HTML string
 */
export function sanitizeHtml(dirty: string, config = {}): string {
  if (!dirty) return '';
  
  // Merge with default config
  const purifyConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Sanitize the HTML
  const clean = DOMPurify.sanitize(dirty, purifyConfig);
  
  return clean;
}

/**
 * Convert markdown-style bold text to HTML
 * @param text - Text with markdown bold syntax
 * @returns HTML string with <strong> tags
 */
export function convertMarkdownBold(text: string): string {
  if (!text) return '';
  
  // Convert **text** to <strong>text</strong>
  const boldPattern = /\*\*([^*]+)\*\*/g;
  const html = text.replace(boldPattern, '<strong>$1</strong>');
  
  // Sanitize the result
  return sanitizeHtml(html, {
    ALLOWED_TAGS: ['strong', 'b'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Convert newlines to <br> tags safely
 * @param text - Text with newlines
 * @returns HTML string with <br> tags
 */
export function nl2br(text: string): string {
  if (!text) return '';
  
  // Escape the text first to prevent XSS
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Then add <br> tags
  return escaped.replace(/\n/g, '<br>');
}

/**
 * Render text with basic markdown support (bold only)
 * @param text - Text with markdown
 * @returns Object with __html property for React dangerouslySetInnerHTML
 */
export function renderMarkdownText(text: string): { __html: string } {
  const html = convertMarkdownBold(text);
  return { __html: html };
}

/**
 * Render text with newline to <br> conversion
 * @param text - Text with newlines
 * @returns Object with __html property for React dangerouslySetInnerHTML
 */
export function renderTextWithBreaks(text: string): { __html: string } {
  const html = nl2br(text);
  return { __html: html };
}

/**
 * Sanitize and render arbitrary HTML
 * @param html - HTML string to sanitize
 * @param config - Optional DOMPurify configuration
 * @returns Object with __html property for React dangerouslySetInnerHTML
 */
export function renderSafeHtml(html: string, config = {}): { __html: string } {
  const clean = sanitizeHtml(html, config);
  return { __html: clean };
}