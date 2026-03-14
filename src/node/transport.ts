/**
 * Transport Module
 *
 * Creates and manages libp2p P2P networking for AgentLink.
 *
 * Phase 1: Basic P2P connectivity (TCP, mDNS, Noise, Yamux)
 * Phase 2: Internet connectivity (QUIC, AutoNAT, Circuit Relay, DHT, DCUtR)
 *
 * @module node/transport
 */

import { createLibp2p, Libp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";
import { noise } from "@libp2p/noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { mdns } from "@libp2p/mdns";
import { identify } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { quic } from "@chainsafe/libp2p-quic";
import { autoNAT } from "@libp2p/autonat";
import {
  circuitRelayTransport,
  circuitRelayServer,
} from "@libp2p/circuit-relay-v2";
import { kadDHT } from "@libp2p/kad-dht";
import { dcutr } from "@libp2p/dcutr";
import type { PrivateKey } from "@libp2p/interface";
import { multiaddr } from "@multiformats/multiaddr";

// ============================================
// Configuration
// ============================================

/**
 * Transport configuration options
 */
export interface TransportConfig {
  /** Port to listen on */
  listenPort?: number;

  /** Enable mDNS discovery on local network */
  enableMdns?: boolean;

  /** Enable ping protocol */
  enablePing?: boolean;

  /** External addresses to advertise */
  announceAddresses?: string[];

  // Phase 2 options
  /** Enable QUIC transport (UDP-based, faster) */
  enableQUIC?: boolean;
  /** Enable AutoNAT for NAT detection */
  enableAutoNAT?: boolean;
  /** Enable DHT peer discovery */
  enableDHT?: boolean;
  /** Enable Circuit Relay client (for NAT fallback) */
  enableRelay?: boolean;
  /** Act as a relay server (for public nodes) */
  actAsRelay?: boolean;
  /** Enable DCUtR hole punching */
  enableDcutr?: boolean;
  /** Bootstrap peers for DHT */
  bootstrapPeers?: string[];
}

const DEFAULT_CONFIG: Required<
  Omit<TransportConfig, "announceAddresses" | "bootstrapPeers">
> & {
  bootstrapPeers: string[];
} = {
  listenPort: 9100,
  enableMdns: true,
  enablePing: true,
  enableQUIC: true,
  enableAutoNAT: true,
  enableDHT: true,
  enableRelay: true,
  actAsRelay: false,
  enableDcutr: true,
  bootstrapPeers: [],
};

// ============================================
// Transport Node Creation
// ============================================

/**
 * Creates a libp2p node with AgentLink configuration
 *
 * @param privateKey - The peer's private key (from identity module)
 * @param config - Transport configuration options
 * @returns Running libp2p node
 *
 * @example
 * const node = await createTransportNode(privateKey, {
 *   listenPort: 9100,
 *   enableMdns: true,
 *   enableQUIC: true,
 *   enableDHT: true
 * });
 *
 * console.log('Listening on:', node.getMultiaddrs());
 */
export async function createTransportNode(
  privateKey: PrivateKey,
  config: TransportConfig = {},
): Promise<Libp2p> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Build transports array
  const transports: any[] = [tcp()];

  // Add QUIC transport first (preferred for performance)
  if (cfg.enableQUIC) {
    transports.push(quic());
  }

  // Add Circuit Relay transport for NAT traversal
  if (cfg.enableRelay) {
    transports.push(circuitRelayTransport());
  }

  // Build listen addresses
  const listenAddresses: string[] = [`/ip4/0.0.0.0/tcp/${cfg.listenPort}`];

  // Add QUIC listen address
  if (cfg.enableQUIC) {
    listenAddresses.push(`/ip4/0.0.0.0/udp/${cfg.listenPort}/quic-v1`);
  }

  // Build services
  const services: Record<string, any> = {
    identify: identify(),
    ...(cfg.enablePing ? { ping: ping() } : {}),
  };

  // Add AutoNAT service for NAT detection
  if (cfg.enableAutoNAT) {
    services.autoNAT = autoNAT();
  }

  // Add DHT service for peer discovery
  if (cfg.enableDHT) {
    services.dht = kadDHT({
      clientMode: true,
      validators: {
        // Custom validators can be added here
      },
      selectors: {
        // Custom selectors can be added here
      },
    });
  }

  // Add Circuit Relay server if this node should act as a relay
  if (cfg.actAsRelay) {
    services.relayServer = circuitRelayServer();
  }

  // Add DCUtR for direct connection upgrade after relay
  if (cfg.enableDcutr) {
    services.dcutr = dcutr();
  }

  // Build libp2p configuration
  const node = await createLibp2p({
    privateKey,

    // Transports
    transports,

    // Connection encryption - using any for compatibility
    connectionEncrypters: [noise()] as any,

    // Stream multiplexers
    streamMuxers: [yamux()],

    // Services
    services,

    // Peer discovery
    ...(cfg.enableMdns
      ? {
          peerDiscovery: [
            mdns({
              interval: 10000, // 10 seconds
              serviceTag: "agentlink",
            }),
          ],
        }
      : {}),

    // Addresses
    addresses: {
      listen: listenAddresses,
      announce: cfg.announceAddresses || [],
    },
  });

  return node;
}

// ============================================
// NAT Status
// ============================================

/**
 * NAT detection status
 */
export interface NATStatus {
  /** Whether the node is behind NAT */
  behindNAT: boolean;
  /** The detected public address (if available) */
  publicAddress: string | null;
  /** Addresses observed by other peers */
  observedAddresses: string[];
}

/**
 * Check NAT status of the node
 *
 * Uses the identify service to determine if the node is behind NAT
 * by comparing observed addresses with listen addresses.
 *
 * @param node - libp2p node
 * @returns NAT status information
 *
 * @example
 * const natStatus = await checkNATStatus(node);
 * if (natStatus.behindNAT) {
 *   console.log('Node is behind NAT');
 *   console.log('Public address:', natStatus.publicAddress);
 * }
 */
export async function checkNATStatus(node: Libp2p | null): Promise<NATStatus> {
  // Handle null node gracefully
  if (!node) {
    return {
      behindNAT: true,
      publicAddress: null,
      observedAddresses: [],
    };
  }

  const listenAddrs = node.getMultiaddrs();
  const observedAddrs: string[] = [];

  // Get observed addresses from identify service
  const identifyService = node.services.identify as any;
  if (
    identifyService &&
    typeof identifyService.getObservedAddrs === "function"
  ) {
    try {
      // Get the observed addresses from the identify service
      const observed = await identifyService.getObservedAddrs();
      if (observed) {
        for (const addr of observed) {
          observedAddrs.push(addr.toString());
        }
      }
    } catch {
      // If identify service fails, continue with empty observed addresses
    }
  }

  // Determine if behind NAT
  // A node is behind NAT if its listen addresses don't match observed addresses
  const listenSet = new Set(
    listenAddrs
      .map((ma) => {
        // Extract IP:port for comparison
        const parts = ma.toString().split("/");
        const ipIndex = parts.indexOf("ip4");
        const tcpIndex = parts.indexOf("tcp");
        if (ipIndex !== -1 && tcpIndex !== -1) {
          const ip = parts[ipIndex + 1];
          const port = parts[tcpIndex + 1];
          return `${ip}:${port}`;
        }
        return null;
      })
      .filter(Boolean),
  );

  // Check if any observed address is a public IP that doesn't match our listen address
  let publicAddress: string | null = null;
  let behindNAT = true;

  for (const obsAddr of observedAddrs) {
    const parts = obsAddr.split("/");
    const ipIndex = parts.indexOf("ip4");

    if (ipIndex !== -1) {
      const ip = parts[ipIndex + 1];

      // Skip if ip is undefined
      if (!ip) continue;

      // Check if it's a public IP using helper function
      if (!isPrivateIP(ip)) {
        publicAddress = obsAddr;

        // If we're listening on the public IP, we're not behind NAT
        const tcpIndex = parts.indexOf("tcp");
        if (tcpIndex !== -1) {
          const port = parts[tcpIndex + 1];
          if (port && listenSet.has(`${ip}:${port}`)) {
            behindNAT = false;
            break;
          }
        }
      }
    }
  }

  // If no observed addresses, can't determine NAT status
  if (observedAddrs.length === 0) {
    behindNAT = false; // Assume not behind NAT if we can't determine
  }

  return {
    behindNAT,
    publicAddress,
    observedAddresses: observedAddrs,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an IP address is private (not routable on public internet)
 *
 * @param ip - IPv4 address to check
 * @returns true if IP is private
 */
export function isPrivateIP(ip: string): boolean {
  // 10.0.0.0/8
  if (ip.startsWith("10.")) return true;

  // 192.168.0.0/16
  if (ip.startsWith("192.168.")) return true;

  // 127.0.0.0/8 (localhost)
  if (ip.startsWith("127.")) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    if (parts.length >= 2 && parts[1]) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }
  }

  // 0.0.0.0
  if (ip === "0.0.0.0") return true;

  // 169.254.0.0/16 (link-local)
  if (ip.startsWith("169.254.")) return true;

  return false;
}

/**
 * Get all multiaddresses for a node
 *
 * @param node - libp2p node
 * @returns Array of multiaddress strings
 */
export function getMultiaddrs(node: Libp2p): string[] {
  return node.getMultiaddrs().map((ma) => ma.toString());
}

/**
 * Get the primary multiaddress for a node
 * (First non-loopback address)
 *
 * @param node - libp2p node
 * @returns Primary multiaddress or null
 */
export function getPrimaryMultiaddr(node: Libp2p): string | null {
  const addrs = getMultiaddrs(node);

  // Prefer non-loopback addresses
  const nonLoopback = addrs.find(
    (addr) => !addr.includes("/ip4/127.0.0.1/") && !addr.includes("/ip6/::1/"),
  );

  return nonLoopback || addrs[0] || null;
}

/**
 * Parse a multiaddress string to extract useful info
 *
 * @param multiaddr - Multiaddress string
 * @returns Parsed components
 */
export function parseMultiaddr(multiaddr: string): {
  ip: string | null;
  port: number | null;
  peerId: string | null;
} {
  const parts = multiaddr.split("/");
  let ip: string | null = null;
  let port: number | null = null;
  let peerId: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "ip4" || parts[i] === "ip6") {
      ip = parts[i + 1] ?? null;
    }
    if (parts[i] === "tcp") {
      port = parseInt(parts[i + 1] ?? "0", 10);
    }
    if (parts[i] === "p2p") {
      peerId = parts[i + 1] ?? null;
    }
  }

  return { ip, port, peerId };
}

/**
 * Connect to a bootstrap peer
 *
 * @param node - libp2p node
 * @param peerAddr - Multiaddress of the peer to connect to
 * @returns True if connection successful
 */
export async function connectToBootstrapPeer(
  node: Libp2p,
  peerAddr: string,
): Promise<boolean> {
  try {
    const addr = multiaddr(peerAddr);
    await node.dial(addr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Connect to all bootstrap peers
 *
 * @param node - libp2p node
 * @param bootstrapPeers - Array of peer multiaddresses
 * @returns Number of successful connections
 */
export async function connectToBootstrapPeers(
  node: Libp2p,
  bootstrapPeers: string[],
): Promise<number> {
  let connected = 0;

  for (const peerAddr of bootstrapPeers) {
    const success = await connectToBootstrapPeer(node, peerAddr);
    if (success) {
      connected++;
    }
  }

  return connected;
}

// ============================================
// Event Types
// ============================================

export interface PeerInfo {
  peerId: string;
  multiaddrs: string[];
  discoveredAt: Date;
}

export type PeerDiscoveryCallback = (peer: PeerInfo) => void;
export type ConnectionCallback = (peerId: string, connected: boolean) => void;

/**
 * Sets up event handlers for the transport node
 *
 * @param node - libp2p node
 * @param callbacks - Event callbacks
 */
export function setupEventHandlers(
  node: Libp2p,
  callbacks: {
    onPeerDiscovery?: PeerDiscoveryCallback;
    onConnection?: ConnectionCallback;
  },
): void {
  // Peer discovery events
  node.addEventListener("peer:discovery", (event) => {
    if (callbacks.onPeerDiscovery) {
      const peer = event.detail;
      callbacks.onPeerDiscovery({
        peerId: peer.id.toString(),
        multiaddrs: peer.multiaddrs.map((ma) => ma.toString()),
        discoveredAt: new Date(),
      });
    }
  });

  // Connection events
  node.addEventListener("connection:open", (event) => {
    if (callbacks.onConnection) {
      const connection = event.detail;
      callbacks.onConnection(connection.remotePeer.toString(), true);
    }
  });

  node.addEventListener("connection:close", (event) => {
    if (callbacks.onConnection) {
      const connection = event.detail;
      callbacks.onConnection(connection.remotePeer.toString(), false);
    }
  });
}
