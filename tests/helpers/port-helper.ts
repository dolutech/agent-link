/**
 * Test Helper: Dynamic Port Allocation
 *
 * Provides utilities for getting free ports in tests to avoid conflicts.
 */

import { createServer } from "net";

/**
 * Get a free port that can be used for testing
 *
 * @returns Promise resolving to a free port number
 *
 * @example
 * const port = await getFreePort();
 * const node = new AgentLinkNode({ listenPort: port });
 */
export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.on("error", (error) => {
      reject(error);
    });

    server.listen(0, () => {
      const address = server.address();

      if (typeof address === "object" && address && address.port) {
        server.close(() => {
          resolve(address.port);
        });
      } else {
        reject(new Error("Failed to get free port"));
      }
    });
  });
}

/**
 * Get multiple free ports
 *
 * @param count - Number of ports to get
 * @returns Promise resolving to array of port numbers
 */
export async function getFreePorts(count: number): Promise<number[]> {
  const ports: number[] = [];
  for (let i = 0; i < count; i++) {
    ports.push(await getFreePort());
  }
  return ports;
}
