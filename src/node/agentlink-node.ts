/**
 * AgentLink Node - Main P2P Node
 *
 * Integrates all modules into a cohesive P2P agent node.
 *
 * @module node/agentlink-node
 */

import { Libp2p } from "libp2p";
import type { Connection, Stream } from "@libp2p/interface";
import { IdentityKeyPair, getOrCreateIdentity } from "./identity.js";
import {
  createTransportNode,
  getMultiaddrs,
  setupEventHandlers,
} from "./transport.js";
import { AgentCard, createAgentCard, Endpoints } from "../agent-card/card.js";
import { ContactBook } from "../contacts/contact-book.js";
import { TrustLevel } from "../contacts/trust.js";
import {
  MESSAGE_PROTOCOL,
  registerMessageProtocol,
  sendMessageOverStream,
  MessageHandler,
} from "../messages/protocol.js";
import { createEnvelope } from "../messages/envelope.js";
import { Envelope } from "../messages/types.js";
import { multiaddr } from "@multiformats/multiaddr";
import { peerIdFromString } from "@libp2p/peer-id";

// ============================================
// Configuration
// ============================================

export interface AgentLinkConfig {
  /** Port to listen on */
  listenPort?: number;
  /** Enable mDNS discovery */
  enableMdns?: boolean;
  /** Agent name */
  name: string;
  /** Agent description */
  description?: string;
  /** Capabilities this agent supports */
  capabilities?: string[];
  /** Default trust level for unknown contacts */
  defaultTrust?: TrustLevel;
  /** Directory for storing identity and data (default: .agentlink in cwd) */
  dataDir?: string;
  // Phase 2 options
  /** Enable QUIC transport */
  enableQUIC?: boolean;
  /** Enable AutoNAT */
  enableAutoNAT?: boolean;
  /** Enable DHT discovery */
  enableDHT?: boolean;
  /** Enable Circuit Relay */
  enableRelay?: boolean;
  /** Act as relay server */
  actAsRelay?: boolean;
  /** Enable DCUtR hole punching */
  enableDcutr?: boolean;
  /** Bootstrap peers for DHT */
  bootstrapPeers?: string[];
}

// ============================================
// AgentLink Node
// ============================================

/**
 * AgentLink Node - Main P2P agent node
 *
 * @example
 * ```typescript
 * const agent = new AgentLinkNode({
 *   name: 'My Agent',
 *   capabilities: ['messaging', 'scheduling']
 * });
 *
 * await agent.start();
 *
 * // Send a message
 * await agent.sendMessage('did:key:z6Mk...', 'greeting', 'Hello!');
 *
 * // Handle incoming messages
 * agent.onMessage((envelope, stream, connection) => {
 *   console.log('Message from:', envelope.from);
 * });
 * ```
 */
export class AgentLinkNode {
  private identity: IdentityKeyPair | null = null;
  private node: Libp2p | null = null;
  private agentCard: AgentCard | null = null;
  private contactBook: ContactBook;
  private config: AgentLinkConfig;
  private messageHandlers: Set<MessageHandler> = new Set();
  private pendingConnections: Map<string, Promise<Connection>> = new Map();

  constructor(config: AgentLinkConfig) {
    this.config = {
      listenPort: 9100,
      enableMdns: true,
      capabilities: ["messaging", "handshake"],
      defaultTrust: "ask",
      ...config,
    };
    this.contactBook = new ContactBook();
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Start the AgentLink node
   */
  async start(): Promise<void> {
    // 1. Get or create identity
    this.identity = await getOrCreateIdentity(this.config.dataDir);

    // 2. Create transport node with Phase 2 options
    this.node = await createTransportNode(this.identity.libp2pPrivateKey, {
      listenPort: this.config.listenPort,
      enableMdns: this.config.enableMdns,
      enableQUIC: this.config.enableQUIC,
      enableAutoNAT: this.config.enableAutoNAT,
      enableDHT: this.config.enableDHT,
      enableRelay: this.config.enableRelay,
      actAsRelay: this.config.actAsRelay,
      enableDcutr: this.config.enableDcutr,
      bootstrapPeers: this.config.bootstrapPeers,
    });

    // 3. Create agent card
    const endpoints: Endpoints = {
      agentlink: this.getPrimaryEndpoint() || "",
    };

    this.agentCard = createAgentCard({
      did: this.identity.did,
      name: this.config.name,
      description: this.config.description,
      capabilities: this.config.capabilities || ["messaging", "handshake"],
      endpoints,
    });

    // 4. Setup event handlers
    setupEventHandlers(this.node, {
      onPeerDiscovery: (peer) => {
        console.log(`Peer discovered: ${peer.peerId}`);
      },
      onConnection: (peerId, connected) => {
        console.log(
          `Peer ${connected ? "connected" : "disconnected"}: ${peerId}`,
        );
      },
    });

    // 5. Register message protocol
    registerMessageProtocol(this.node, this.handleIncomingMessage.bind(this));

    console.log(`AgentLink node started`);
    console.log(`DID: ${this.identity.did}`);
    console.log(`Listening on: ${this.getPrimaryEndpoint()}`);
  }

  /**
   * Stop the AgentLink node
   */
  async stop(): Promise<void> {
    if (this.node) {
      await this.node.stop();
      this.node = null;
    }
    this.pendingConnections.clear();
    console.log("AgentLink node stopped");
  }

  // ============================================
  // Getters
  // ============================================

  /**
   * Get the node's identity
   */
  getIdentity(): IdentityKeyPair | null {
    return this.identity;
  }

  /**
   * Get the node's Agent Card
   */
  getAgentCard(): AgentCard | null {
    return this.agentCard;
  }

  /**
   * Get the contact book
   */
  getContactBook(): ContactBook {
    return this.contactBook;
  }

  /**
   * Get the libp2p node
   */
  getLibp2p(): Libp2p | null {
    return this.node;
  }

  /**
   * Get primary endpoint address
   */
  getPrimaryEndpoint(): string | null {
    if (!this.node) return null;
    const addrs = getMultiaddrs(this.node);
    const nonLocal = addrs.find((a) => !a.includes("127.0.0.1"));
    return nonLocal || addrs[0] || null;
  }

  // ============================================
  // Message Handling
  // ============================================

  /**
   * Register a message handler
   *
   * @param handler - Function to call for each incoming message
   *
   * @example
   * ```typescript
   * agent.onMessage((envelope, stream, connection) => {
   *   console.log('Message:', envelope.body);
   * });
   * ```
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.add(handler);
  }

  /**
   * Remove a message handler
   */
  offMessage(handler: MessageHandler): void {
    this.messageHandlers.delete(handler);
  }

  /**
   * Handle incoming messages - internal method
   */
  private async handleIncomingMessage(
    envelope: Envelope,
    stream: Stream,
    connection: Connection,
  ): Promise<void> {
    // Notify all registered handlers
    for (const handler of this.messageHandlers) {
      try {
        await handler(envelope, stream, connection);
      } catch (error) {
        console.error("Message handler error:", error);
      }
    }
  }

  // ============================================
  // Messaging
  // ============================================

  /**
   * Send a message to another agent
   *
   * @param to - Recipient DID or contact name
   * @param intent - Intent/action to request (e.g., 'greeting', 'query')
   * @param content - Message content
   * @param structured - Optional structured data
   * @returns Result of send operation
   *
   * @example
   * ```typescript
   * const result = await agent.sendMessage(
   *   'did:key:z6Mk...',
   *   'greeting',
   *   'Hello from Alice!'
   * );
   *
   * if (result.success) {
   *   console.log('Message sent!');
   * } else {
   *   console.error('Failed:', result.error);
   * }
   * ```
   */
  async sendMessage(
    to: string,
    intent: string,
    content: string,
    structured?: Record<string, unknown>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.node || !this.identity) {
      return { success: false, error: "Node not started" };
    }

    try {
      // 1. Resolve recipient (could be DID or name)
      let recipientDid = to;
      let multiaddrs: string[] = [];

      if (!to.startsWith("did:key:")) {
        // Try to find by name
        const contact = this.contactBook
          .list()
          .find((c) => c.name.toLowerCase() === to.toLowerCase());

        if (!contact) {
          return { success: false, error: `Contact not found: "${to}"` };
        }

        recipientDid = contact.did;
        multiaddrs = contact.multiaddrs;
      } else {
        // Get contact by DID
        const contact = this.contactBook.getByDid(to);
        if (contact) {
          multiaddrs = contact.multiaddrs;
        }
      }

      // 2. Check trust level
      const trustLevel = this.contactBook.getTrustLevel(recipientDid);
      if (trustLevel === "blocked") {
        return { success: false, error: "Contact is blocked" };
      }

      // 3. Get or create connection
      const connection = await this.getOrCreateConnection(
        recipientDid,
        multiaddrs,
      );

      if (!connection) {
        return {
          success: false,
          error: "Failed to establish connection to peer",
        };
      }

      // 4. Create message envelope
      const envelope = await createEnvelope(
        {
          from: this.identity.did,
          to: recipientDid,
          type: "request",
          body: {
            intent,
            content,
            structured,
          },
        },
        this.identity.privateKey,
      );

      // 5. Open stream and send message
      const stream = await connection.newStream(MESSAGE_PROTOCOL);
      await sendMessageOverStream(stream, envelope);
      await stream.close();

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get or create a connection to a peer
   */
  private async getOrCreateConnection(
    did: string,
    multiaddrs: string[],
  ): Promise<Connection | null> {
    if (!this.node) return null;

    // Check for pending connection
    const pending = this.pendingConnections.get(did);
    if (pending) {
      return pending;
    }

    // Check for existing connections
    const existingConns = this.node.getConnections();
    for (const conn of existingConns) {
      // Check if this connection is to the target peer
      if (
        conn.remotePeer.toString() === did ||
        conn.remoteAddr?.toString().includes(did)
      ) {
        return conn;
      }
    }

    // Try to connect using known addresses
    const connectPromise = this.connectToPeer(did, multiaddrs);
    this.pendingConnections.set(did, connectPromise as Promise<Connection>);

    try {
      const connection = await connectPromise;
      return connection;
    } finally {
      this.pendingConnections.delete(did);
    }
  }

  /**
   * Connect to a peer using known addresses
   */
  private async connectToPeer(
    did: string,
    multiaddrs: string[],
  ): Promise<Connection | null> {
    if (!this.node) return null;

    // Try each address
    for (const addr of multiaddrs) {
      try {
        // Add peer ID if not present
        let fullAddr = addr;
        if (!addr.includes("/p2p/")) {
          fullAddr = `${addr}/p2p/${did}`;
        }

        const ma = multiaddr(fullAddr);
        const connection = await this.node.dial(ma);
        return connection;
      } catch (error) {
        console.warn(`Failed to connect to ${addr}:`, error);
      }
    }

    // Try direct peer ID dial if DHT is enabled
    if (this.config.enableDHT && this.node.peerRouting) {
      try {
        // Use peerRouting to find peer via DHT
        const peerIdObj = peerIdFromString(did);
        const peerInfo = await this.node.peerRouting.findPeer(peerIdObj);
        if (peerInfo && peerInfo.multiaddrs.length > 0) {
          const firstAddr = peerInfo.multiaddrs[0];
          if (firstAddr) {
            const connection = await this.node.dial(firstAddr);
            return connection;
          }
        }
      } catch (error) {
        console.warn(`Failed to find peer via DHT:`, error);
      }
    }

    return null;
  }
}
