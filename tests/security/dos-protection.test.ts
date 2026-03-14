/**
 * DoS Protection Tests
 */

import { describe, it, expect } from "vitest";
import {
  MAX_MESSAGES_PER_CONNECTION,
  MAX_MESSAGES_PER_MINUTE,
} from "../../src/messages/protocol.js";

describe("DoS Protection", () => {
  it("should have reasonable message limits", () => {
    expect(MAX_MESSAGES_PER_CONNECTION).toBeGreaterThan(0);
    expect(MAX_MESSAGES_PER_CONNECTION).toBeLessThanOrEqual(10000);

    expect(MAX_MESSAGES_PER_MINUTE).toBeGreaterThan(0);
    expect(MAX_MESSAGES_PER_MINUTE).toBeLessThanOrEqual(1000);
  });

  it("should have MAX_MESSAGES_PER_CONNECTION > MAX_MESSAGES_PER_MINUTE", () => {
    expect(MAX_MESSAGES_PER_CONNECTION).toBeGreaterThan(
      MAX_MESSAGES_PER_MINUTE,
    );
  });
});
