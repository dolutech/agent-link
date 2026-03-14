/**
 * Transport Helper Tests
 */

import { describe, it, expect } from "vitest";
import { isPrivateIP } from "../../src/node/transport.js";

describe("isPrivateIP", () => {
  it("should identify 10.x.x.x as private", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true);
    expect(isPrivateIP("10.255.255.255")).toBe(true);
  });

  it("should identify 192.168.x.x as private", () => {
    expect(isPrivateIP("192.168.0.1")).toBe(true);
    expect(isPrivateIP("192.168.255.255")).toBe(true);
  });

  it("should identify 127.x.x.x as private", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true);
    expect(isPrivateIP("127.255.255.255")).toBe(true);
  });

  it("should identify full 172.16-31.x.x range as private", () => {
    expect(isPrivateIP("172.16.0.1")).toBe(true);
    expect(isPrivateIP("172.20.0.1")).toBe(true); // Was failing before fix
    expect(isPrivateIP("172.31.255.255")).toBe(true);
    expect(isPrivateIP("172.15.0.1")).toBe(false); // Outside range
    expect(isPrivateIP("172.32.0.1")).toBe(false); // Outside range
  });

  it("should identify 169.254.x.x as private", () => {
    expect(isPrivateIP("169.254.0.1")).toBe(true);
  });

  it("should identify 0.0.0.0 as private", () => {
    expect(isPrivateIP("0.0.0.0")).toBe(true);
  });

  it("should identify public IPs", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false);
    expect(isPrivateIP("1.1.1.1")).toBe(false);
    expect(isPrivateIP("203.0.113.1")).toBe(false);
  });

  it("should handle null node gracefully in checkNATStatus", async () => {
    const { checkNATStatus } = await import("../../src/node/transport.js");
    const result = await checkNATStatus(null);

    expect(result).toBeDefined();
    expect(result.behindNAT).toBe(true);
    expect(result.publicAddress).toBe(null);
    expect(result.observedAddresses).toEqual([]);
  });
});
