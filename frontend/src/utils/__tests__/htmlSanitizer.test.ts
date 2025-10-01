/**
 * Tests for HTML Sanitizer
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  convertMarkdownBold,
  nl2br,
  renderMarkdownText,
  renderTextWithBreaks,
  renderSafeHtml
} from '../htmlSanitizer';

describe('HTML Sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous tags', () => {
      const dirty = '<script>alert("XSS")</script><p>Safe content</p>';
      const clean = sanitizeHtml(dirty);
      expect(clean).toBe('<p>Safe content</p>');
      expect(clean).not.toContain('<script>');
    });

    it('should remove dangerous attributes', () => {
      const dirty = '<p onclick="alert(\'XSS\')">Click me</p>';
      const clean = sanitizeHtml(dirty);
      expect(clean).toBe('<p>Click me</p>');
      expect(clean).not.toContain('onclick');
    });

    it('should allow safe tags', () => {
      const safe = '<p>Paragraph with <strong>bold</strong> and <em>italic</em></p>';
      const clean = sanitizeHtml(safe);
      expect(clean).toBe(safe);
    });

    it('should allow safe links', () => {
      const safe = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
      const clean = sanitizeHtml(safe);
      expect(clean).toBe(safe);
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });
  });

  describe('convertMarkdownBold', () => {
    it('should convert markdown bold to HTML', () => {
      const markdown = 'This is **bold** text';
      const html = convertMarkdownBold(markdown);
      expect(html).toBe('This is <strong>bold</strong> text');
    });

    it('should handle multiple bold sections', () => {
      const markdown = '**First** and **second** bold';
      const html = convertMarkdownBold(markdown);
      expect(html).toBe('<strong>First</strong> and <strong>second</strong> bold');
    });

    it('should sanitize the output', () => {
      const markdown = '**<script>alert("XSS")</script>**';
      const html = convertMarkdownBold(markdown);
      expect(html).toBe('<strong></strong>');
      expect(html).not.toContain('<script>');
    });
  });

  describe('nl2br', () => {
    it('should convert newlines to br tags', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const html = nl2br(text);
      expect(html).toBe('Line 1<br>Line 2<br>Line 3');
    });

    it('should escape HTML entities', () => {
      const text = '<script>alert("XSS")</script>\n<p>Test</p>';
      const html = nl2br(text);
      expect(html).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;<br>&lt;p&gt;Test&lt;/p&gt;');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<p>');
    });

    it('should handle special characters', () => {
      const text = 'Test & < > " \' characters';
      const html = nl2br(text);
      expect(html).toBe('Test &amp; &lt; &gt; &quot; &#039; characters');
    });
  });

  describe('render functions', () => {
    it('renderMarkdownText should return safe HTML object', () => {
      const text = 'This is **bold** text';
      const result = renderMarkdownText(text);
      expect(result.__html).toBe('This is <strong>bold</strong> text');
    });

    it('renderTextWithBreaks should return safe HTML object', () => {
      const text = 'Line 1\nLine 2';
      const result = renderTextWithBreaks(text);
      expect(result.__html).toBe('Line 1<br>Line 2');
    });

    it('renderSafeHtml should sanitize and return HTML object', () => {
      const html = '<p>Safe</p><script>alert("XSS")</script>';
      const result = renderSafeHtml(html);
      expect(result.__html).toBe('<p>Safe</p>');
      expect(result.__html).not.toContain('<script>');
    });
  });

  describe('XSS attack prevention', () => {
    const xssVectors = [
      '<img src=x onerror="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload="alert(\'XSS\')">',
      '<input type="text" value="x" onclick="alert(\'XSS\')">',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\');">',
      '<table background="javascript:alert(\'XSS\')">',
      '<div style="background-image: url(javascript:alert(\'XSS\'))">',
      '<object type="text/x-scriptlet" data="http://hacker.com/xss.html">',
      '<!--[if gte IE 4]><script>alert(\'XSS\')</script><![endif]-->'
    ];

    xssVectors.forEach((vector, index) => {
      it(`should prevent XSS attack vector ${index + 1}`, () => {
        const clean = sanitizeHtml(vector);
        expect(clean).not.toContain('alert');
        expect(clean).not.toContain('javascript:');
        expect(clean).not.toContain('onerror');
        expect(clean).not.toContain('onload');
        expect(clean).not.toContain('onclick');
      });
    });
  });
});