import { telemetry } from './telemetry';

interface StateSnapshot {
  timestamp: string;
  version: number;
  route: string;
  data: any;
  metadata?: Record<string, any>;
}

interface RestorationOptions {
  maxAge?: number; // Maximum age in hours
  version?: number; // Expected version
  onRestore?: (data: any) => void;
  onError?: (error: Error) => void;
}

class StateRestorationService {
  private readonly storagePrefix = 'dexter_state_';
  private readonly maxSnapshots = 10;
  
  /**
   * Save a state snapshot
   */
  saveSnapshot(key: string, data: any, metadata?: Record<string, any>): void {
    try {
      const snapshot: StateSnapshot = {
        timestamp: new Date().toISOString(),
        version: 1,
        route: window.location.pathname,
        data,
        metadata
      };
      
      const storageKey = `${this.storagePrefix}${key}`;
      
      // Get existing snapshots
      const existing = this.getSnapshots(key);
      existing.unshift(snapshot);
      
      // Keep only the most recent snapshots
      const trimmed = existing.slice(0, this.maxSnapshots);
      
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
      
      telemetry.trackEvent('state_snapshot_saved', {
        key,
        route: snapshot.route,
        dataSize: JSON.stringify(data).length
      });
    } catch (error) {
      console.error('Failed to save state snapshot:', error);
      
      // If localStorage is full, try to clear old snapshots
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearOldSnapshots();
        
        // Try again with just this snapshot
        try {
          const storageKey = `${this.storagePrefix}${key}`;
          const snapshot: StateSnapshot = {
            timestamp: new Date().toISOString(),
            version: 1,
            route: window.location.pathname,
            data,
            metadata
          };
          localStorage.setItem(storageKey, JSON.stringify([snapshot]));
        } catch {
          // Still failed, give up
        }
      }
    }
  }
  
  /**
   * Restore the most recent valid snapshot
   */
  restoreSnapshot(key: string, options: RestorationOptions = {}): any | null {
    const {
      maxAge = 24, // 24 hours default
      version = 1,
      onRestore,
      onError
    } = options;
    
    try {
      const snapshots = this.getSnapshots(key);
      if (snapshots.length === 0) return null;
      
      // Find the most recent valid snapshot
      for (const snapshot of snapshots) {
        // Check age
        const age = (Date.now() - new Date(snapshot.timestamp).getTime()) / (1000 * 60 * 60);
        if (age > maxAge) continue;
        
        // Check version
        if (snapshot.version !== version) continue;
        
        // Valid snapshot found
        telemetry.trackEvent('state_snapshot_restored', {
          key,
          route: snapshot.route,
          ageHours: age.toFixed(1)
        });
        
        if (onRestore) {
          onRestore(snapshot.data);
        }
        
        return snapshot.data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to restore state snapshot:', error);
      
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }
      
      return null;
    }
  }
  
  /**
   * Get all snapshots for a key
   */
  getSnapshots(key: string): StateSnapshot[] {
    try {
      const storageKey = `${this.storagePrefix}${key}`;
      const data = localStorage.getItem(storageKey);
      
      if (!data) return [];
      
      const snapshots = JSON.parse(data);
      return Array.isArray(snapshots) ? snapshots : [];
    } catch {
      return [];
    }
  }
  
  /**
   * Clear snapshots for a specific key
   */
  clearSnapshots(key: string): void {
    const storageKey = `${this.storagePrefix}${key}`;
    localStorage.removeItem(storageKey);
    
    telemetry.trackEvent('state_snapshots_cleared', { key });
  }
  
  /**
   * Clear all old snapshots across all keys
   */
  clearOldSnapshots(maxAgeHours: number = 48): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(this.storagePrefix)) continue;
      
      try {
        const snapshots = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(snapshots) || snapshots.length === 0) {
          keysToRemove.push(key);
          continue;
        }
        
        // Filter out old snapshots
        const filtered = snapshots.filter((snapshot: StateSnapshot) => {
          const age = (Date.now() - new Date(snapshot.timestamp).getTime()) / (1000 * 60 * 60);
          return age <= maxAgeHours;
        });
        
        if (filtered.length === 0) {
          keysToRemove.push(key);
        } else if (filtered.length < snapshots.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch {
        keysToRemove.push(key);
      }
    }
    
    // Remove empty keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      telemetry.trackEvent('old_snapshots_cleared', {
        count: keysToRemove.length
      });
    }
  }
  
  /**
   * Create a recovery checkpoint (more comprehensive than a snapshot)
   */
  createRecoveryCheckpoint(data: Record<string, any>): string {
    const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const checkpoint = {
      id: checkpointId,
      timestamp: new Date().toISOString(),
      route: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      data,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    try {
      localStorage.setItem(`${this.storagePrefix}${checkpointId}`, JSON.stringify(checkpoint));
      
      telemetry.trackEvent('recovery_checkpoint_created', {
        checkpointId,
        dataKeys: Object.keys(data)
      });
      
      return checkpointId;
    } catch (error) {
      console.error('Failed to create recovery checkpoint:', error);
      throw error;
    }
  }
  
  /**
   * Restore from a recovery checkpoint
   */
  restoreFromCheckpoint(checkpointId: string): any | null {
    try {
      const data = localStorage.getItem(`${this.storagePrefix}${checkpointId}`);
      if (!data) return null;
      
      const checkpoint = JSON.parse(data);
      
      telemetry.trackEvent('recovery_checkpoint_restored', {
        checkpointId,
        age: (Date.now() - new Date(checkpoint.timestamp).getTime()) / (1000 * 60)
      });
      
      return checkpoint;
    } catch (error) {
      console.error('Failed to restore from checkpoint:', error);
      return null;
    }
  }
  
  /**
   * List all recovery checkpoints
   */
  listCheckpoints(): Array<{ id: string; timestamp: string; route: string }> {
    const checkpoints: Array<{ id: string; timestamp: string; route: string }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${this.storagePrefix}checkpoint_`)) continue;
      
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;
        
        const checkpoint = JSON.parse(data);
        checkpoints.push({
          id: checkpoint.id,
          timestamp: checkpoint.timestamp,
          route: checkpoint.route
        });
      } catch {
        // Skip invalid checkpoints
      }
    }
    
    // Sort by timestamp, newest first
    return checkpoints.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

// Export singleton instance
export const stateRestoration = new StateRestorationService();

// Export types
export type { StateSnapshot, RestorationOptions };