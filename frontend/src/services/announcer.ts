/**
 * Announcer Service
 * 
 * A service for making screen reader announcements for dynamic content updates.
 * Uses aria-live regions to announce changes to screen readers.
 */

type AnnouncementPoliteness = 'assertive' | 'polite' | 'off';

interface Announcement {
  message: string;
  politeness: AnnouncementPoliteness;
  timeout?: number;
}

class AnnouncerService {
  private politeContainer: HTMLElement | null = null;
  private assertiveContainer: HTMLElement | null = null;
  private queue: Announcement[] = [];
  private isProcessing = false;
  private DEFAULT_TIMEOUT = 500; // ms to wait before removing announcement

  constructor() {
    if (typeof document !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize the announcer service by creating aria-live regions in the DOM
   */
  private initialize(): void {
    // Create polite announcer
    this.politeContainer = document.createElement('div');
    this.politeContainer.setAttribute('aria-live', 'polite');
    this.politeContainer.setAttribute('aria-atomic', 'true');
    this.politeContainer.setAttribute('role', 'status');
    this.politeContainer.className = 'sr-only announcer-polite';
    // Hide visually but keep available to screen readers
    this.setVisuallyHiddenStyles(this.politeContainer);
    
    // Create assertive announcer
    this.assertiveContainer = document.createElement('div');
    this.assertiveContainer.setAttribute('aria-live', 'assertive');
    this.assertiveContainer.setAttribute('aria-atomic', 'true');
    this.assertiveContainer.setAttribute('role', 'alert');
    this.assertiveContainer.className = 'sr-only announcer-assertive';
    this.setVisuallyHiddenStyles(this.assertiveContainer);
    
    // Add containers to DOM
    document.body.appendChild(this.politeContainer);
    document.body.appendChild(this.assertiveContainer);
  }

  /**
   * Apply visually hidden styles to element (visible to screen readers only)
   */
  private setVisuallyHiddenStyles(element: HTMLElement): void {
    const styles = {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    };
    
    Object.assign(element.style, styles);
  }

  /**
   * Announce a message to screen readers
   * @param message The message to announce
   * @param politeness The priority level ('polite' or 'assertive')
   * @param timeout Time in ms to wait before removing announcement
   */
  announce(message: string, politeness: AnnouncementPoliteness = 'polite', timeout?: number): void {
    if (!message || politeness === 'off') return;
    
    // Add announcement to queue
    this.queue.push({
      message,
      politeness,
      timeout: timeout || this.DEFAULT_TIMEOUT
    });
    
    // Start processing queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the announcement queue
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    const announcement = this.queue.shift();
    
    if (!announcement) {
      this.isProcessing = false;
      return;
    }
    
    const container = announcement.politeness === 'assertive'
      ? this.assertiveContainer
      : this.politeContainer;
    
    if (!container) {
      this.processQueue();
      return;
    }
    
    // Clear any existing content
    container.textContent = '';
    
    // Force a DOM reflow by accessing offsetHeight
    // This helps ensure screen readers register the change
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    container.offsetHeight;
    
    // Set new announcement
    container.textContent = announcement.message;
    
    // Clear after timeout to prevent duplicate readings
    setTimeout(() => {
      if (container) {
        container.textContent = '';
      }
      
      // Process next announcement
      window.setTimeout(() => {
        this.processQueue();
      }, 50);
    }, announcement.timeout);
  }

  /**
   * Announce a status message (polite priority)
   * @param message The message to announce
   */
  announceStatus(message: string): void {
    this.announce(message, 'polite');
  }

  /**
   * Announce an important message (assertive priority)
   * @param message The message to announce
   */
  announceImportant(message: string): void {
    this.announce(message, 'assertive');
  }

  /**
   * Announce navigation or page changes
   * @param message The message to announce
   */
  announceNavigation(message: string): void {
    this.announce(message, 'assertive');
  }

  /**
   * Announce a loading state change
   * @param isLoading Whether something is loading
   * @param context Context of what is loading
   */
  announceLoading(isLoading: boolean, context?: string): void {
    const contextStr = context ? ` ${context}` : '';
    
    if (isLoading) {
      this.announce(`Loading${contextStr}...`, 'polite');
    } else {
      this.announce(`Loading${contextStr} complete.`, 'polite');
    }
  }

  /**
   * Announce a successful operation
   * @param message The success message
   */
  announceSuccess(message: string): void {
    this.announce(`Success: ${message}`, 'polite');
  }

  /**
   * Announce an error to users
   * @param message The error message
   */
  announceError(message: string): void {
    this.announce(`Error: ${message}`, 'assertive');
  }

  /**
   * Clean up announcer DOM elements
   */
  cleanup(): void {
    if (this.politeContainer && this.politeContainer.parentNode) {
      this.politeContainer.parentNode.removeChild(this.politeContainer);
    }
    
    if (this.assertiveContainer && this.assertiveContainer.parentNode) {
      this.assertiveContainer.parentNode.removeChild(this.assertiveContainer);
    }
    
    this.politeContainer = null;
    this.assertiveContainer = null;
    this.queue = [];
    this.isProcessing = false;
  }
}

// Create a singleton instance
const announcer = new AnnouncerService();

export default announcer;