/**
 * OpenClaw Bridge
 * 
 * Bridges AgentLink P2P networking with OpenClaw agent capabilities.
 * 
 * @module bridge/openclaw-bridge
 */

import { AgentCard } from '../agent-card/card.js';
import { Contact } from '../contacts/contact-book.js';
import { TrustLevel } from '../contacts/trust.js';
import { IdentityKeyPair } from '../node/identity.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Bridge message structure for LLM processing
 */
export interface BridgeMessage {
  /** Sender contact information */
  from: Contact;
  /** Intent/action requested */
  intent: string;
  /** Message content */
  content: string;
  /** Optional structured data */
  structured?: Record<string, unknown>;
}

/**
 * Response from LLM message processing
 */
export interface BridgeResponse {
  /** Whether to accept the message */
  accept: boolean;
  /** Response message to send back */
  response?: string;
  /** Error message if rejected */
  error?: string;
}

/**
 * Permission request for human approval
 */
export interface PermissionRequest {
  /** Contact requesting permission */
  from: Contact;
  /** Intent/action being requested */
  intent: string;
  /** Reason for the request */
  reason: string;
}

/**
 * Node status information
 */
export interface NodeStatus {
  /** Whether the node is running */
  running: boolean;
  /** Node's DID */
  did: string | null;
  /** Number of contacts */
  contacts: number;
  /** Connection endpoints */
  endpoints: string[];
}

// ============================================
// Bridge Configuration
// ============================================

/**
 * Configuration for OpenClaw Bridge
 */
export interface BridgeConfig {
  /** AgentLink node instance */
  node: AgentLinkNode;
  /** Callback to invoke LLM for message processing */
  onMessage?: (message: BridgeMessage) => Promise<BridgeResponse>;
  /** Callback for permission requests */
  onPermissionRequest?: (request: PermissionRequest) => Promise<boolean>;
}

// ============================================
// AgentLink Node Interface
// ============================================

/**
 * Interface for AgentLink Node (to be implemented in node module)
 */
export interface AgentLinkNode {
  /** Get the agent's card */
  getAgentCard(): AgentCard | null;
  /** Get the contact book */
  getContactBook(): ContactBookInterface;
  /** Get node identity */
  getIdentity(): IdentityKeyPair | null;
  /** Get libp2p instance */
  getLibp2p(): Libp2pInterface | null;
  /** Send a message to a contact */
  sendMessage(to: string, intent: string, content: string, structured?: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;
  /** Start the node */
  start(): Promise<void>;
  /** Stop the node */
  stop(): Promise<void>;
}

/**
 * Interface for Contact Book
 */
export interface ContactBookInterface {
  /** Add a contact */
  add(contact: Omit<Contact, 'addedAt'>): Promise<Contact>;
  /** Remove a contact */
  remove(did: string): Promise<boolean>;
  /** Get contact by DID */
  getByDid(did: string): Contact | null;
  /** List all contacts */
  list(): Contact[];
  /** Set trust level */
  setTrustLevel(did: string, level: TrustLevel): Promise<boolean>;
  /** Get trust level */
  getTrustLevel(did: string): TrustLevel;
}

/**
 * Interface for libp2p instance
 */
export interface Libp2pInterface {
  /** Get multiaddresses */
  getMultiaddrs(): Array<{ toString(): string }>;
}

// ============================================
// OpenClaw Bridge Class
// ============================================

/**
 * Bridge between AgentLink and OpenClaw
 * 
 * Provides a clean API for OpenClaw agents to interact with
 * AgentLink's P2P networking capabilities.
 * 
 * @example
 * ```typescript
 * const bridge = new OpenClawBridge({
 *   node: agentLinkNode,
 *   onMessage: async (msg) => {
 *     // Process with LLM
 *     return { accept: true, response: 'OK' };
 *   }
 * });
 * 
 * // Get status
 * const status = bridge.getStatus();
 * 
 * // Send message
 * await bridge.sendMessage('did:key:z6Mk...', 'greeting', 'Hello!');
 * ```
 */
export class OpenClawBridge {
  private node: AgentLinkNode;
  private onMessage?: BridgeConfig['onMessage'];
  private onPermissionRequest?: BridgeConfig['onPermissionRequest'];

  constructor(config: BridgeConfig) {
    this.node = config.node;
    this.onMessage = config.onMessage;
    this.onPermissionRequest = config.onPermissionRequest;
  }

  // ============================================
  // Agent Card Operations
  // ============================================

  /**
   * Get the agent's card for sharing
   * 
   * @returns Agent Card or null if node not started
   */
  getAgentCard(): AgentCard | null {
    return this.node.getAgentCard();
  }

  // ============================================
  // Contact Operations
  // ============================================

  /**
   * Get all contacts
   * 
   * @returns Array of all contacts
   */
  getContacts(): Contact[] {
    return this.node.getContactBook().list();
  }

  /**
   * Get a specific contact by DID
   * 
   * @param did - Contact's DID
   * @returns Contact or null if not found
   */
  getContact(did: string): Contact | null {
    return this.node.getContactBook().getByDid(did);
  }

  /**
   * Add a contact from an Agent Card
   * 
   * @param card - Agent Card from the contact
   * @param multiaddrs - Multiaddresses for direct connection
   * @returns The created contact
   */
  async addContact(card: AgentCard, multiaddrs: string[]): Promise<Contact> {
    const contactBook = this.node.getContactBook();
    
    return contactBook.add({
      did: card.did,
      name: card.name,
      trustLevel: 'ask',
      agentCard: card,
      multiaddrs,
      autoAccept: []
    });
  }

  /**
   * Remove a contact
   * 
   * @param did - DID of contact to remove
   * @returns Whether the contact was removed
   */
  async removeContact(did: string): Promise<boolean> {
    return this.node.getContactBook().remove(did);
  }

  /**
   * Set trust level for a contact
   * 
   * @param did - Contact's DID
   * @param level - New trust level
   * @returns Whether the update was successful
   */
  async setTrustLevel(did: string, level: TrustLevel): Promise<boolean> {
    return this.node.getContactBook().setTrustLevel(did, level);
  }

  /**
   * Get trust level for a contact
   * 
   * @param did - Contact's DID
   * @returns Trust level
   */
  getTrustLevel(did: string): TrustLevel {
    return this.node.getContactBook().getTrustLevel(did);
  }

  // ============================================
  // Messaging Operations
  // ============================================

  /**
   * Send a message to another agent
   * 
   * @param to - Recipient DID
   * @param intent - Intent/action to request
   * @param content - Message content
   * @param structured - Optional structured data
   * @returns Result of send operation
   */
  async sendMessage(
    to: string,
    intent: string,
    content: string,
    structured?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    return this.node.sendMessage(to, intent, content, structured);
  }

  /**
   * Process an incoming message through the LLM
   * 
   * @param message - Bridge message to process
   * @returns Response from LLM
   */
  async processMessage(message: BridgeMessage): Promise<BridgeResponse> {
    if (!this.onMessage) {
      return { accept: false, error: 'No message handler configured' };
    }
    
    return this.onMessage(message);
  }

  /**
   * Request permission from human operator
   * 
   * @param request - Permission request details
   * @returns Whether permission was granted
   */
  async requestPermission(request: PermissionRequest): Promise<boolean> {
    if (!this.onPermissionRequest) {
      // Default to asking through trust level
      const trustLevel = this.getTrustLevel(request.from.did);
      return trustLevel === 'trusted' || trustLevel === 'friend';
    }
    
    return this.onPermissionRequest(request);
  }

  // ============================================
  // Status Operations
  // ============================================

  /**
   * Get node status
   * 
   * @returns Current node status
   */
  getStatus(): NodeStatus {
    const identity = this.node.getIdentity();
    const contacts = this.node.getContactBook().list();
    const libp2p = this.node.getLibp2p();

    return {
      running: libp2p !== null,
      did: identity?.did || null,
      contacts: contacts.length,
      endpoints: libp2p ? libp2p.getMultiaddrs().map(m => m.toString()) : []
    };
  }

  /**
   * Check if node is running
   * 
   * @returns Whether the node is running
   */
  isRunning(): boolean {
    return this.node.getLibp2p() !== null;
  }

  /**
   * Get node's DID
   * 
   * @returns DID string or null
   */
  getDid(): string | null {
    const identity = this.node.getIdentity();
    return identity?.did || null;
  }

  // ============================================
  // Lifecycle Operations
  // ============================================

  /**
   * Start the node
   */
  async start(): Promise<void> {
    return this.node.start();
  }

  /**
   * Stop the node
   */
  async stop(): Promise<void> {
    return this.node.stop();
  }
}