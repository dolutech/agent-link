/**
 * DHT Discovery Module
 *
 * Provides peer discovery via Kademlia DHT.
 *
 * @module node/discovery
 */

import type { Libp2p } from "libp2p";
import type { PeerInfo } from "@libp2p/interface";
import { peerIdFromString } from "@libp2p/peer-id";
import { multiaddr } from "@multiformats/multiaddr";

// ============================================
// DHT Discovery Functions
// ============================================

/**
 * Find a peer's addresses via DHT
 *
 * @param node - libp2p node with DHT enabled
 * @param peerId - The peer ID to find
 * @returns Array of multiaddress strings
 * @throws Error if peer routing is not available
 *
 * @example
 * const addresses = await findPeerViaDHT(node, '12D3KooWABC...');
 */
export async function findPeerViaDHT(
  node: Libp2p,
  peerId: string,
): Promise<string[]> {
  // Check if peer routing is available
  if (!node.peerRouting) {
    throw new Error(
      "Peer routing is not available. Enable DHT in transport configuration.",
    );
  }

  // Convert string to PeerId
  const targetPeerId = peerIdFromString(peerId);

  // Find peer via DHT (peerRouting aggregates all peer routers including DHT)
  const peerInfo: PeerInfo = await node.peerRouting.findPeer(targetPeerId);

  // Return array of multiaddress strings
  return peerInfo.multiaddrs.map((ma) => ma.toString());
}

/**
 * Announce this node on the DHT
 *
 * Makes this node discoverable by other peers on the DHT.
 * This is achieved by ensuring the node is connected to peers
 * in the DHT network, which populates the routing table.
 *
 * @param node - libp2p node with DHT enabled
 *
 * @example
 * await announceOnDHT(node);
 */
export async function announceOnDHT(node: Libp2p): Promise<void> {
  // Check if DHT service is enabled
  // Note: node.services is generic, we check for dht property existence
  const services = node.services as Record<string, unknown>;
  const dht = services.dht;

  // If DHT not enabled, return silently
  if (!dht) {
    return;
  }

  // DHT announce is implicit through routing table population
  // When connected to peers, the DHT automatically adds them to routing table
  // No explicit "announce" operation is needed for peer discovery
  // The node will be discoverable through the DHT routing table
}

/**
 * Find the closest peers to a given key
 *
 * Uses the Kademlia DHT to find peers that are closest
 * to the provided key in the XOR metric space.
 *
 * @param node - libp2p node with DHT enabled
 * @param key - The key to find closest peers for
 * @param count - Maximum number of peers to return (default: 20)
 * @returns Array of peer ID strings
 * @throws Error if peer routing is not available
 *
 * @example
 * const peers = await findClosestPeers(node, new Uint8Array([1, 2, 3]), 10);
 */
export async function findClosestPeers(
  node: Libp2p,
  key: Uint8Array,
  count: number = 20,
): Promise<string[]> {
  // Check if peer routing is available
  if (!node.peerRouting) {
    throw new Error(
      "Peer routing is not available. Enable DHT in transport configuration.",
    );
  }

  // Find closest peers using peerRouting
  // peerRouting.getClosestPeers returns AsyncIterable<PeerInfo>
  const peerIds: string[] = [];

  for await (const peerInfo of node.peerRouting.getClosestPeers(key)) {
    peerIds.push(peerInfo.id.toString());
    if (peerIds.length >= count) {
      break;
    }
  }

  return peerIds;
}

/**
 * Bootstrap DHT with initial peers
 *
 * Connects to bootstrap peers to join the DHT network.
 * These connections help populate the local routing table.
 *
 * @param node - libp2p node with DHT enabled
 * @param bootstrapPeers - Array of multiaddress strings for bootstrap peers
 *
 * @example
 * await bootstrapDHT(node, [
 *   '/ip4/1.2.3.4/tcp/9100/p2p/12D3KooWABC...',
 *   '/dns4/bootstrap.agentlink.io/tcp/9100/p2p/12D3KooWDEF...'
 * ]);
 */
export async function bootstrapDHT(
  node: Libp2p,
  bootstrapPeers: string[],
): Promise<void> {
  // For each bootstrap peer address
  for (const peerAddr of bootstrapPeers) {
    try {
      // Parse the multiaddress
      const ma = multiaddr(peerAddr);

      // Extract peer ID from the multiaddress components
      const components = ma.getComponents();
      const p2pComponent = components.find((c) => c.name === "p2p");

      if (!p2pComponent) {
        console.warn(`Warning: Could not extract peer ID from ${peerAddr}`);
        continue;
      }

      const peerId = p2pComponent.value;

      // Try to dial the peer
      await node.dial(ma);
      console.log(`Connected to bootstrap peer: ${peerId}`);
    } catch (error) {
      // Log warnings on failure
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Warning: Failed to connect to bootstrap peer ${peerAddr}: ${errorMessage}`,
      );
    }
  }
}
