/**
 * Replay Cache for AgentLink Protocol
 *
 * Prevents replay attacks by tracking recently seen message IDs.
 * Uses LRU (Least Recently Used) cache with TTL for automatic expiration.
 *
 * @module security/replay-cache
 */

import { LRUCache } from "lru-cache";

export interface ReplayCacheConfig {
  /** Maximum number of message IDs to cache */
  maxSize?: number;
  /** Time to live in milliseconds (default: 5 minutes) */
  ttl?: number;
}

const DEFAULT_CONFIG: ReplayCacheConfig = {
  maxSize: 10000,
  ttl: 300000, // 5 minutes
};

/**
 * ReplayCache prevents replay attacks by tracking seen message IDs
 */
export class ReplayCache {
  private cache: LRUCache<string, number>;

  constructor(config: ReplayCacheConfig = DEFAULT_CONFIG) {
    this.cache = new LRUCache({
      max: config.maxSize ?? 10000,
      ttl: config.ttl ?? 300000,
      updateAgeOnGet: false,
      ttlAutopurge: false,
    });
  }

  /**
   * Check if message ID has been seen before
   * Returns true if this is a REPLAY (already seen)
   *
   * @param messageId - The message ID to check
   * @returns true if this is a replay
   */
  isReplay(messageId: string): boolean {
    return this.cache.has(messageId);
  }

  /**
   * Mark message as seen
   * Returns true if this was a replay (already seen)
   *
   * @param messageId - The message ID to mark
   * @returns true if this was already seen (replay detected)
   */
  markSeen(messageId: string): boolean {
    if (this.cache.has(messageId)) {
      return true; // This is a replay
    }
    this.cache.set(messageId, Date.now());
    return false; // First time seeing this message
  }

  /**
   * Check and mark in one atomic operation
   * Returns true if this is a REPLAY
   *
   * @param messageId - The message ID to check and mark
   * @returns true if this is a replay (already seen)
   */
  checkAndMark(messageId: string): boolean {
    if (this.cache.has(messageId)) {
      return true; // Replay detected
    }
    this.cache.set(messageId, Date.now());
    return false; // New message
  }

  /**
   * Clear the cache (for testing)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns Object with current size and max size
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
    };
  }
}

// Singleton instance for global use
let globalReplayCache: ReplayCache | null = null;

/**
 * Get or create the global replay cache instance
 *
 * @param config - Optional configuration for the cache
 * @returns The global replay cache instance
 */
export function getGlobalReplayCache(config?: ReplayCacheConfig): ReplayCache {
  if (!globalReplayCache) {
    globalReplayCache = new ReplayCache(config);
  }
  return globalReplayCache;
}

/**
 * Reset the global replay cache (for testing)
 */
export function resetGlobalReplayCache(): void {
  globalReplayCache?.clear();
  globalReplayCache = null;
}
