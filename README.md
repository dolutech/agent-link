# AgentLink Protocol

> P2P protocol for direct communication between personal AI agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/@dolutech/agent-link.svg)](https://badge.fury.io/js/@dolutech/agent-link)
[![Node.js Version](https://img.shields.io/node/v/@dolutech/agent-link.svg)](https://nodejs.org)

**Status:** MVP Complete | Version: 0.1.0

---

## What is AgentLink?

AgentLink is like SMTP for AI agents - any agent, running anywhere, can send a message to any other agent simply by knowing its address.

### The Problem

Personal AI agents (like OpenClaw) run on user-owned hardware (Mac Minis, VPS, Raspberry Pi). Today, when two agents on different machines need to communicate, there's no native protocol for it. Current "solutions" are workarounds:

- Using human chat platforms (Telegram, Discord) as bridges
- Manually sharing .md files
- Running multiple agents on the same instance (no real isolation)

Existing protocols (A2A, ACP, ANP) are designed for enterprise/cloud scenarios and don't solve the personal self-hosted agent case.

### The Solution

**AgentLink Protocol** is a lightweight, open P2P protocol that enables personal AI agents to:

- **Discover** each other
- **Authenticate** cryptographic identities
- **Exchange messages** directly, without central servers

### Features

- :lock: **Self-sovereign identity** with DID did:key
- :globe_with_meridians: **P2P networking** with libp2p
- :closed_lock_with_key: **End-to-end encryption** with Noise
- :scroll: **Message signing** with Ed25519
- :handshake: **Trust levels** for permission control
- :credit_card: **Agent Cards** - shareable identity cards

### Design Principles

| Principle                        | Description                               |
| -------------------------------- | ----------------------------------------- |
| **Zero third parties**           | All communication is direct between peers |
| **Radical simplicity**           | Minimal implementation                    |
| **Secure by default**            | Everything encrypted and authenticated    |
| **Framework agnostic**           | Works with any agent/framework            |
| **Human-controlled permissions** | Owner defines what the agent can do       |

---

## Architecture

```
+-------------------------------------------------------------+
|  LAYER 4: APPLICATION (Agent Card, Intents, Capabilities)  |
+-------------------------------------------------------------+
|  LAYER 3: MESSAGE (JSON Envelope, Signature, Types)        |
+-------------------------------------------------------------+
|  LAYER 2: IDENTITY (DID did:key, Ed25519, Self-sovereign)  |
+-------------------------------------------------------------+
|  LAYER 1: TRANSPORT (QUIC, TCP, NAT Traversal, mDNS, DHT)  |
+-------------------------------------------------------------+
```

---

## Installation

```bash
npm install @dolutech/agent-link
```

**Requirements:** Node.js >= 20.0.0

---

## Quick Start

```typescript
import { AgentLinkNode } from "@dolutech/agent-link";

// Create and start your agent node
const agent = new AgentLinkNode({
  name: "My AI Assistant",
  description: "A helpful personal AI agent",
  capabilities: ["messaging", "scheduling"],
  listenPort: 9100,
  enableMdns: true,
});

await agent.start();

console.log("Agent DID:", agent.getIdentity()?.did);
console.log("Agent Card:", agent.getAgentCard());
console.log("Listening on:", agent.getPrimaryEndpoint());

// Stop when done
// await agent.stop();
```

---

## API Reference

### Node

```typescript
import { AgentLinkNode } from '@dolutech/agent-link';

const node = new AgentLinkNode({
  name: string;              // Required: Agent name
  description?: string;      // Optional: Description
  capabilities?: string[];   // Optional: ['messaging', 'handshake']
  listenPort?: number;       // Optional: Default 9100
  enableMdns?: boolean;      // Optional: Default true
  defaultTrust?: TrustLevel; // Optional: Default 'ask'
});

// Lifecycle
await node.start();
await node.stop();

// Identity
node.getIdentity();  // Returns IdentityKeyPair | null

// Agent Card
node.getAgentCard(); // Returns AgentCard | null

// Contacts
node.getContactBook(); // Returns ContactBook

// Transport
node.getLibp2p();        // Returns Libp2p | null
node.getPrimaryEndpoint(); // Returns string | null
```

### Identity

```typescript
import {
  generateKeyPair,
  getOrCreateIdentity,
  loadIdentity,
  saveIdentity,
  sign,
  verify,
  publicKeyToDid,
  didToPublicKey,
} from "@dolutech/agent-link";

// Generate a new identity
const identity = await generateKeyPair();
console.log(identity.did); // did:key:z6Mk...

// Get or create persisted identity
const identity = await getOrCreateIdentity();

// Convert between DID and public key
const did = publicKeyToDid(publicKey);
const publicKey = didToPublicKey(did);

// Sign and verify data
const data = new TextEncoder().encode("Hello, AgentLink!");
const signature = sign(data, identity.privateKey);
const isValid = verify(data, signature, identity.publicKey);

// Persist identity
await saveIdentity(identity);
const loaded = await loadIdentity();
```

### Agent Card

```typescript
import {
  createAgentCard,
  validateAgentCard,
  toJson,
  toLink,
  fromLink,
} from "@dolutech/agent-link";

// Create an Agent Card
const card = createAgentCard({
  did: "did:key:z6Mk...",
  name: "My Agent",
  description: "A personal AI assistant",
  capabilities: ["messaging", "scheduling"],
  endpoints: {
    agentlink: "/ip4/0.0.0.0/tcp/9100",
  },
});

// Validate an Agent Card
const result = validateAgentCard(unknownCard);
if (result.valid) {
  console.log("Valid card:", result.card);
} else {
  console.log("Errors:", result.errors);
}

// Export as JSON
const json = toJson(card);

// Export as shareable link
const link = toLink(card);
// agentlink://did:key:z6Mk...?name=My%20Agent&capabilities=messaging,scheduling

// Parse from link
const parsed = fromLink(link);
```

### Contacts & Permissions

```typescript
import {
  ContactBook,
  TrustLevel,
  PermissionGuard,
  PermissionResult,
} from "@dolutech/agent-link";

// Initialize contact book
const contacts = new ContactBook();

// Add a contact
await contacts.add({
  did: "did:key:z6Mk...",
  name: "Alice Agent",
  trustLevel: "friend",
  agentCard: card,
  multiaddrs: ["/ip4/192.168.1.1/tcp/9100"],
  autoAccept: ["messaging.*"],
});

// Get contact by DID
const contact = contacts.getByDid("did:key:z6Mk...");

// List all contacts
const allContacts = contacts.list();

// List by trust level
const friends = contacts.listByTrust("friend");

// Update trust level
await contacts.setTrustLevel("did:key:z6Mk...", "trusted");

// Check permissions
const guard = new PermissionGuard();
const result = guard.check("friend", "messaging.send");
// Returns: PermissionResult.ALLOWED

// Check with auto-accept patterns
const result = guard.check("friend", "messaging.send", ["messaging.*"]);
// Returns: PermissionResult.ALLOWED
```

---

## Trust Levels

| Level     | Description                             | Auto-Accept       |
| --------- | --------------------------------------- | ----------------- |
| `blocked` | Explicitly blocked, reject all messages | None              |
| `unknown` | New/unverified agent                    | Require approval  |
| `ask`     | Require human approval for actions      | Require approval  |
| `friend`  | Known agent, limited auto-accept        | Based on patterns |
| `trusted` | Full trust, auto-accept most intents    | All               |

---

## Usage Examples

### Two Agents Communicating

```typescript
// Agent A (Alice)
import { AgentLinkNode } from "@dolutech/agent-link";

const alice = new AgentLinkNode({
  name: "Alice Agent",
  capabilities: ["messaging", "scheduling"],
});

await alice.start();
console.log("Alice DID:", alice.getIdentity()?.did);
console.log("Alice endpoint:", alice.getPrimaryEndpoint());
```

```typescript
// Agent B (Bob)
import { AgentLinkNode, TrustLevel } from "@dolutech/agent-link";

const bob = new AgentLinkNode({
  name: "Bob Agent",
  capabilities: ["messaging", "scheduling"],
});

await bob.start();

// Add Alice as a contact
const aliceDID = "did:key:z6Mk..."; // From Alice's console output
await bob.getContactBook().add({
  did: aliceDID,
  name: "Alice Agent",
  trustLevel: TrustLevel.FRIEND,
  agentCard: aliceCard, // Obtained via Agent Card exchange
  multiaddrs: ["/ip4/192.168.1.100/tcp/9100"],
});
```

### Sharing an Agent Card

```typescript
import { createAgentCard, toLink, fromLink } from "@dolutech/agent-link";

// Create your agent card
const card = createAgentCard({
  did: "did:key:z6Mk...",
  name: "My Assistant",
  capabilities: ["messaging", "scheduling"],
  endpoints: { agentlink: "/ip4/192.168.1.50/tcp/9100" },
});

// Generate a shareable link
const link = toLink(card);
console.log("Share this link:", link);
// agentlink://did:key:z6Mk...?name=My%20Assistant&capabilities=messaging,scheduling

// Someone else can parse it
const parsedCard = fromLink(link);
console.log("Agent name:", parsedCard.name);
console.log("Capabilities:", parsedCard.capabilities);
```

### Permission Management

```typescript
import {
  ContactBook,
  PermissionGuard,
  PermissionResult,
} from "@dolutech/agent-link";

const contacts = new ContactBook();
const guard = new PermissionGuard();

// Add contact with specific auto-accept patterns
await contacts.add({
  did: "did:key:z6Mk...",
  name: "Trusted Scheduler",
  trustLevel: "friend",
  agentCard: card,
  multiaddrs: [],
  autoAccept: ["scheduling.query", "scheduling.propose"], // Auto-accept these
});

// Check if an intent should be allowed
const trustLevel = contacts.getTrustLevel("did:key:z6Mk...");
const autoAccept = contacts.getByDid("did:key:z6Mk...")?.autoAccept || [];

const result = guard.check(trustLevel, "scheduling.query", autoAccept);

switch (result) {
  case PermissionResult.ALLOWED:
    console.log("Auto-accepted");
    break;
  case PermissionResult.DENIED:
    console.log("Blocked");
    break;
  case PermissionResult.REQUIRE_APPROVAL:
    console.log("Ask user for approval");
    break;
}
```

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Test with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

---

## Project Status

### Phase 1: MVP (Complete)

- [x] Core P2P node with libp2p
- [x] DID identity with did:key
- [x] Ed25519 signing and verification
- [x] Agent Card creation and export
- [x] Contact book with persistence
- [x] Trust level system
- [x] Permission guard

### Phase 2: Connectivity (Complete)

- [x] QUIC transport for faster connections
- [x] AutoNAT for NAT detection
- [x] Circuit Relay v2 for NAT fallback
- [x] DHT discovery (Kademlia)
- [x] DCUtR hole punching
- [x] sendMessage for P2P messaging
- [x] Message protocol for libp2p streams

### Phase 3: Intelligence (Planned)

- [ ] Bridge with LLM
- [ ] Conversation threads
- [ ] Offline queue
- [ ] Complete documentation

---

## Documentation

- [Master Plan](./docs/PLANO_MESTRE.md)
- [Technical Architecture](./docs/ARQUITETURA.md)
- [Internet Connectivity](./docs/INTERNET_CONNECTIVITY.md)
- [Transport Layer](./docs/MODULO_TRANSPORT.md)
- [Identity Layer](./docs/MODULO_IDENTITY.md)
- [Message Layer](./docs/MODULO_MESSAGE.md)
- [Application Layer](./docs/MODULO_APPLICATION.md)
- [Contacts & Permissions](./docs/MODULO_CONTACTS.md)
- [Agent Card](./docs/MODULO_AGENTCARD.md)
- [Test Strategy](./docs/TESTES.md)

---

## Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## Security

If you discover a security vulnerability, please do NOT open a public issue. Email: security@dolutech.com

---

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

This project was inspired by:

- [libp2p](https://libp2p.io/) - Modular P2P framework
- [IPFS](https://ipfs.io/) - Distributed file system
- [OpenClaw](https://openclaw.ai/) - Personal AI agent framework
- [DID](https://www.w3.org/TR/did-core/) - Decentralized Identifiers

---

**"Building the communication infrastructure for the next generation of AI agents."**
