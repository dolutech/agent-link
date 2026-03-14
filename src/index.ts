/**
 * AgentLink Protocol
 *
 * P2P protocol for direct communication between personal AI agents.
 *
 * @packageDocumentation
 */

// Node
export { AgentLinkNode } from "./node/agentlink-node.js";
export type { AgentLinkConfig } from "./node/agentlink-node.js";

// Identity
export {
  generateKeyPair,
  getOrCreateIdentity,
  loadIdentity,
  saveIdentity,
  saveIdentitySecure,
  loadIdentitySecure,
  secureVaultExists,
  sign,
  verify,
  publicKeyToDid,
  didToPublicKey,
} from "./node/identity.js";
export type {
  IdentityKeyPair,
  GenerateKeyPairOptions,
} from "./node/identity.js";

// Transport
export {
  createTransportNode,
  getMultiaddrs,
  getPrimaryMultiaddr,
  parseMultiaddr,
  setupEventHandlers,
  checkNATStatus,
  connectToBootstrapPeer,
  connectToBootstrapPeers,
} from "./node/transport.js";
export type {
  TransportConfig,
  PeerInfo,
  PeerDiscoveryCallback,
  ConnectionCallback,
  NATStatus,
} from "./node/transport.js";

// Agent Card
export {
  createAgentCard,
  validateAgentCard,
  AgentCardSchema,
  DEFAULT_CAPABILITIES,
} from "./agent-card/card.js";
export type {
  AgentCard,
  Endpoints,
  CreateAgentCardOptions,
} from "./agent-card/card.js";
export { toJson, toLink, fromLink } from "./agent-card/export.js";
export {
  fromJson,
  fromObject,
  importFromLink,
  safeParseAgentCard,
  mergeWithDefaults,
} from "./agent-card/import.js";

// Contacts
export { ContactBook } from "./contacts/contact-book.js";
export type { Contact } from "./contacts/contact-book.js";
export {
  TrustLevel,
  TRUST_HIERARCHY,
  DEFAULT_TRUST_LEVEL,
  compareTrust,
  meetsMinimum,
} from "./contacts/trust.js";
export { PermissionGuard, PermissionResult } from "./contacts/permissions.js";

// Application Layer
export {
  // Capabilities
  ActionSchema,
  Action,
  CapabilitySchema,
  Capability,
  MESSAGING_CAPABILITY,
  SCHEDULING_CAPABILITY,
  FILES_CAPABILITY,
  WEB_CAPABILITY,
  SYSTEM_CAPABILITY,
  HANDSHAKE_CAPABILITY,
  DEFAULT_CAPABILITIES as APP_DEFAULT_CAPABILITIES,
  ALL_CAPABILITIES,
  getCapability,
  getActionsForCapability,
  hasAction,
  getAllActionNames,
  isValidAction,
  // Threads
  ThreadManager,
  Thread,
  ThreadMessage,
  // Intent Processor
  IntentProcessor,
  Intent,
  IntentResult,
  IntentHandler,
} from "./application/index.js";

// Security
export {
  encryptKey,
  decryptKey,
  saveToVault,
  loadFromVault,
  vaultExists,
  deleteVault,
  generateSecurePassword,
  validatePasswordStrength,
} from "./security/key-vault.js";
export type { EncryptedKeyData, KeyVaultConfig } from "./security/key-vault.js";

// DHT Discovery
export {
  findPeerViaDHT,
  announceOnDHT,
  findClosestPeers,
  bootstrapDHT,
} from "./node/discovery.js";

// Message Protocol
export {
  MESSAGE_PROTOCOL,
  MAX_MESSAGE_SIZE,
  createMessageStream,
  sendMessageOverStream,
  openMessageStream,
  registerMessageProtocol,
} from "./messages/protocol.js";
export type { MessageHandler } from "./messages/protocol.js";
