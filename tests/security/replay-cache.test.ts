/**
 * Replay Cache Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ReplayCache,
  getGlobalReplayCache,
  resetGlobalReplayCache,
} from "../../src/security/replay-cache.js";

describe("ReplayCache", () => {
  let cache: ReplayCache;

  beforeEach(() => {
    cache = new ReplayCache({ maxSize: 100, ttl: 1000 });
    resetGlobalReplayCache();
  });

  it("should detect replayed message", () => {
    const messageId = "msg-123";

    expect(cache.checkAndMark(messageId)).toBe(false); // First time
    expect(cache.checkAndMark(messageId)).toBe(true); // Replay
    expect(cache.checkAndMark(messageId)).toBe(true); // Still replay
  });

  it("should allow different messages", () => {
    expect(cache.checkAndMark("msg-1")).toBe(false);
    expect(cache.checkAndMark("msg-2")).toBe(false);
    expect(cache.checkAndMark("msg-3")).toBe(false);
  });

  it("should respect max size", () => {
    const smallCache = new ReplayCache({ maxSize: 3, ttl: 60000 });

    smallCache.checkAndMark("msg-1");
    smallCache.checkAndMark("msg-2");
    smallCache.checkAndMark("msg-3");
    smallCache.checkAndMark("msg-4"); // Should evict msg-1

    expect(smallCache.checkAndMark("msg-1")).toBe(false); // Evicted, so not a replay
    expect(smallCache.checkAndMark("msg-4")).toBe(true); // Still in cache
  });

  it("should respect TTL", async () => {
    const shortTtlCache = new ReplayCache({ maxSize: 100, ttl: 100 });

    expect(shortTtlCache.checkAndMark("msg-1")).toBe(false);
    expect(shortTtlCache.checkAndMark("msg-1")).toBe(true); // Replay

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 150));

    expect(shortTtlCache.checkAndMark("msg-1")).toBe(false); // Expired, not a replay
  });

  it("should clear cache", () => {
    cache.checkAndMark("msg-1");
    cache.checkAndMark("msg-2");

    expect(cache.getStats().size).toBe(2);

    cache.clear();

    expect(cache.getStats().size).toBe(0);
  });

  it("should provide global cache instance", () => {
    const cache1 = getGlobalReplayCache();
    const cache2 = getGlobalReplayCache();

    expect(cache1).toBe(cache2); // Same instance

    cache1.checkAndMark("msg-1");
    expect(cache2.checkAndMark("msg-1")).toBe(true); // Shared state

    resetGlobalReplayCache();
  });
});
