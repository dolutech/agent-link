/**
 * Contact Book Module
 *
 * Manages the list of known agents and their trust levels.
 *
 * @module contacts/contact-book
 */

import * as fs from "fs";
import * as path from "path";
import { AgentCard } from "../agent-card/card.js";
import { TrustLevel, DEFAULT_TRUST_LEVEL } from "./trust.js";

// ============================================
// Contact Interface
// ============================================

/**
 * Represents a known agent in the contact book
 */
export interface Contact {
  /** Agent's DID */
  did: string;

  /** Human-readable name */
  name: string;

  /** Trust level for this contact */
  trustLevel: TrustLevel;

  /** Agent Card with capabilities and endpoints */
  agentCard: AgentCard;

  /** Known multiaddresses for direct connection */
  multiaddrs: string[];

  /** When this contact was added */
  addedAt: string;

  /** Intents that are auto-accepted from this contact */
  autoAccept?: string[];
}

// ============================================
// Contact Book Class
// ============================================

const CONTACTS_FILE = "contacts.json";

/**
 * Contact Book - manages known agents
 *
 * @example
 * const book = new ContactBook();
 *
 * await book.add({
 *   did: 'did:key:z6Mk...',
 *   name: 'Alice Agent',
 *   trustLevel: 'friend',
 *   agentCard: card,
 *   multiaddrs: ['/ip4/192.168.1.1/tcp/9100']
 * });
 */
export class ContactBook {
  private contacts: Map<string, Contact> = new Map();
  private filePath: string;

  constructor(basePath: string = process.cwd()) {
    this.filePath = path.join(basePath, ".agentlink", CONTACTS_FILE);
    this.load();
  }

  /**
   * Add a new contact
   */
  async add(contact: Omit<Contact, "addedAt">): Promise<Contact> {
    const fullContact: Contact = {
      ...contact,
      addedAt: new Date().toISOString(),
      autoAccept: contact.autoAccept || [],
    };

    this.contacts.set(contact.did, fullContact);
    await this.save();

    return fullContact;
  }

  /**
   * Remove a contact by DID
   */
  async remove(did: string): Promise<boolean> {
    const existed = this.contacts.delete(did);
    if (existed) {
      await this.save();
    }
    return existed;
  }

  /**
   * Get a contact by DID
   */
  getByDid(did: string): Contact | null {
    return this.contacts.get(did) || null;
  }

  /**
   * Get trust level for a DID (defaults to 'ask')
   */
  getTrustLevel(did: string): TrustLevel {
    const contact = this.contacts.get(did);
    return contact?.trustLevel || DEFAULT_TRUST_LEVEL;
  }

  /**
   * Update trust level for a contact
   */
  async setTrustLevel(did: string, level: TrustLevel): Promise<boolean> {
    const contact = this.contacts.get(did);
    if (!contact) return false;

    contact.trustLevel = level;
    await this.save();
    return true;
  }

  /**
   * List all contacts
   */
  list(): Contact[] {
    return Array.from(this.contacts.values());
  }

  /**
   * List contacts by trust level
   */
  listByTrust(level: TrustLevel): Contact[] {
    return this.list().filter((c) => c.trustLevel === level);
  }

  /**
   * Check if a DID is known
   */
  has(did: string): boolean {
    return this.contacts.has(did);
  }

  // ============================================
  // Persistence
  // ============================================

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        this.contacts = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn("Failed to load contacts:", error);
      this.contacts = new Map();
    }
  }

  private async save(): Promise<void> {
    const dir = path.dirname(this.filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = Object.fromEntries(this.contacts);
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }
}
