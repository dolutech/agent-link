/**
 * Connection Rate Limiter Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ConnectionRateLimiter,
  getGlobalRateLimiter,
  resetGlobalRateLimiter,
} from "../../src/security/rate-limiter.js";

describe("ConnectionRateLimiter", () => {
  let limiter: ConnectionRateLimiter;

  beforeEach(() => {
    limiter = new ConnectionRateLimiter({
      maxConnectionsPerMinute: 5,
      maxPendingConnections: 3,
      windowMs: 1000, // 1 second for faster tests
    });
    resetGlobalRateLimiter();
  });

  it("should allow connections under limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.canConnect()).toBe(true);
      limiter.recordConnection();
    }
  });

  it("should block connections over limit", () => {
    for (let i = 0; i < 5; i++) {
      limiter.recordConnection();
    }
    expect(limiter.canConnect()).toBe(false);
  });

  it("should allow connections after window expires", async () => {
    for (let i = 0; i < 5; i++) {
      limiter.recordConnection();
    }
    expect(limiter.canConnect()).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 1100));

    expect(limiter.canConnect()).toBe(true);
  });

  it("should track pending connections", () => {
    expect(limiter.getStats().pendingConnections).toBe(0);

    limiter.incrementPending();
    limiter.incrementPending();

    expect(limiter.getStats().pendingConnections).toBe(2);

    limiter.decrementPending();

    expect(limiter.getStats().pendingConnections).toBe(1);
  });

  it("should block when too many pending", () => {
    limiter.incrementPending();
    limiter.incrementPending();
    limiter.incrementPending();

    expect(limiter.canConnect()).toBe(false);
  });

  it("should reset correctly", () => {
    for (let i = 0; i < 5; i++) {
      limiter.recordConnection();
    }

    limiter.reset();

    expect(limiter.canConnect()).toBe(true);
    expect(limiter.getStats().connectionsPerMinute).toBe(0);
  });

  it("should provide global instance", () => {
    const limiter1 = getGlobalRateLimiter();
    const limiter2 = getGlobalRateLimiter();

    expect(limiter1).toBe(limiter2);

    resetGlobalRateLimiter();
  });

  it("should respect custom config", () => {
    const customLimiter = new ConnectionRateLimiter({
      maxConnectionsPerMinute: 100,
      maxPendingConnections: 50,
      windowMs: 120000,
    });

    const config = customLimiter.getConfig();
    expect(config.maxConnectionsPerMinute).toBe(100);
    expect(config.maxPendingConnections).toBe(50);
    expect(config.windowMs).toBe(120000);
  });
});
