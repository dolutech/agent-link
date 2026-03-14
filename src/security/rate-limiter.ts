/**
 * Connection Rate Limiter for AgentLink Protocol
 *
 * Prevents DoS attacks by limiting connection attempts per time window.
 * Uses sliding window algorithm for accurate rate limiting.
 *
 * @module security/rate-limiter
 */

export interface RateLimiterConfig {
  /** Maximum connections per window */
  maxConnectionsPerMinute?: number;
  /** Maximum pending connections */
  maxPendingConnections?: number;
  /** Window size in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxConnectionsPerMinute: 30,
  maxPendingConnections: 10,
  windowMs: 60000, // 1 minute
};

/**
 * ConnectionRateLimiter prevents DoS via connection flooding
 */
export class ConnectionRateLimiter {
  private config: Required<RateLimiterConfig>;
  private connectionTimestamps: number[] = [];
  private pendingConnections = 0;

  constructor(config: RateLimiterConfig = DEFAULT_CONFIG) {
    this.config = {
      maxConnectionsPerMinute: config.maxConnectionsPerMinute ?? 30,
      maxPendingConnections: config.maxPendingConnections ?? 10,
      windowMs: config.windowMs ?? 60000,
    };
  }

  /**
   * Check if a new connection is allowed
   *
   * @returns true if connection is allowed
   */
  canConnect(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old timestamps outside the window
    this.connectionTimestamps = this.connectionTimestamps.filter(
      (ts) => ts > windowStart,
    );

    // Check rate limit (connections per minute)
    if (
      this.connectionTimestamps.length >= this.config.maxConnectionsPerMinute
    ) {
      return false;
    }

    // Check pending connections limit
    if (this.pendingConnections >= this.config.maxPendingConnections) {
      return false;
    }

    return true;
  }

  /**
   * Record a new connection attempt
   */
  recordConnection(): void {
    if (this.canConnect()) {
      this.connectionTimestamps.push(Date.now());
    }
  }

  /**
   * Increment pending connections counter
   */
  incrementPending(): void {
    this.pendingConnections++;
  }

  /**
   * Decrement pending connections counter
   */
  decrementPending(): void {
    this.pendingConnections = Math.max(0, this.pendingConnections - 1);
  }

  /**
   * Get current rate limiter statistics
   *
   * @returns Object with current connection stats
   */
  getStats(): {
    connectionsPerMinute: number;
    pendingConnections: number;
    maxConnectionsPerMinute: number;
    maxPendingConnections: number;
  } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const recentConnections = this.connectionTimestamps.filter(
      (ts) => ts > windowStart,
    );

    return {
      connectionsPerMinute: recentConnections.length,
      pendingConnections: this.pendingConnections,
      maxConnectionsPerMinute: this.config.maxConnectionsPerMinute,
      maxPendingConnections: this.config.maxPendingConnections,
    };
  }

  /**
   * Reset the rate limiter (for testing)
   */
  reset(): void {
    this.connectionTimestamps = [];
    this.pendingConnections = 0;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<RateLimiterConfig> {
    return { ...this.config };
  }
}

// Singleton instance for global use
let globalRateLimiter: ConnectionRateLimiter | null = null;

/**
 * Get or create the global rate limiter instance
 *
 * @param config - Optional configuration
 * @returns The global rate limiter
 */
export function getGlobalRateLimiter(
  config?: RateLimiterConfig,
): ConnectionRateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new ConnectionRateLimiter(config);
  }
  return globalRateLimiter;
}

/**
 * Reset the global rate limiter (for testing)
 */
export function resetGlobalRateLimiter(): void {
  globalRateLimiter?.reset();
  globalRateLimiter = null;
}
