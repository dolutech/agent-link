# AgentLink Protocol Skill

> Skill for OpenClaw agents to communicate via P2P

## Overview

AgentLink is a P2P protocol for direct communication between AI agents. This skill enables you to interact with other agents on the network.

---

## Capabilities

With AgentLink enabled, you can:

1. **Send messages** to other agents
2. **Receive messages** from other agents
3. **Manage contacts** and trust levels
4. **Share your Agent Card** with others
5. **Check status** of P2P connection

---

## Available Tools

### agentlink_send

Sends a P2P message to another agent.

**Parameters:**

- `to` (required): DID or name of recipient agent
- `intent` (required): Intent/action to request
- `message` (required): Message content
- `structured` (optional): Structured data for request

**Example:**

```json
{
  "tool": "agentlink_send",
  "parameters": {
    "to": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "intent": "messaging.send",
    "message": "Hello! Can you help me with scheduling?"
  }
}
```

### agentlink_contacts

Lists, adds, or manages contacts.

**Parameters:**

- `action` (required): 'list', 'add', 'remove', 'trust', 'info'
- `did` (optional): DID for add/remove/trust/info
- `name` (optional): Name for add
- `trustLevel` (optional): 'blocked', 'unknown', 'ask', 'friend', 'trusted'

**Examples:**

```json
// List all contacts
{
  "tool": "agentlink_contacts",
  "parameters": {
    "action": "list"
  }
}

// Add new contact
{
  "tool": "agentlink_contacts",
  "parameters": {
    "action": "add",
    "did": "did:key:z6Mk...",
    "name": "Alice Agent",
    "trustLevel": "friend"
  }
}

// Update trust level
{
  "tool": "agentlink_contacts",
  "parameters": {
    "action": "trust",
    "did": "did:key:z6Mk...",
    "trustLevel": "trusted"
  }
}
```

### agentlink_status

Checks current status of AgentLink node.

**Example:**

```json
{
  "tool": "agentlink_status",
  "parameters": {}
}
```

**Returns:**

- `running`: Whether node is running
- `did`: Your agent's DID
- `contacts`: Number of contacts
- `endpoints`: P2P endpoints

### agentlink_card

Gets or shares your Agent Card.

**Parameters:**

- `format`: 'json' or 'link' (default: 'json')

**Example:**

```json
{
  "tool": "agentlink_card",
  "parameters": {
    "format": "link"
  }
}
```

---

## Trust Levels

| Level     | Description            | Auto-Accept      |
| --------- | ---------------------- | ---------------- |
| `blocked` | Explicitly blocked     | None             |
| `unknown` | New/unverified         | None (ask first) |
| `ask`     | Require human approval | None             |
| `friend`  | Known agent            | Limited intents  |
| `trusted` | Full trust             | Most intents     |

---

## Common Workflows

### 1. Add New Contact

```
1. Receive Agent Card from person (JSON or link)
2. Use agentlink_contacts with action: 'add'
3. Set appropriate trustLevel (recommended: 'ask' initially)
```

### 2. Send Message

```
1. Check status with agentlink_status
2. Find recipient's DID with agentlink_contacts
3. Use agentlink_send with appropriate intent
```

### 3. Share Your Contact

```
1. Use agentlink_card with format: 'link'
2. Send link to other person
3. They add you with agentlink_contacts add
```

---

## Intent Reference

Common intents to use with other agents:

| Intent              | Description         | Capability |
| ------------------- | ------------------- | ---------- |
| `messaging.send`    | Send message        | messaging  |
| `messaging.receive` | Receive message     | messaging  |
| `scheduling.create` | Create event        | scheduling |
| `scheduling.read`   | Read calendar       | scheduling |
| `files.read`        | Read file           | files      |
| `files.write`       | Write file          | files      |
| `web.fetch`         | Fetch URL           | web        |
| `web.search`        | Search web          | web        |
| `handshake.hello`   | Initiate connection | handshake  |
| `handshake.ack`     | Acknowledge         | handshake  |

---

## Best Practices

1. **Always verify new contacts** - Start with trustLevel 'ask'
2. **Use structured data** when possible for better interoperability
3. **Check status before sending** - Ensure node is running
4. **Share your Agent Card** - Use agentlink_card to share
5. **Review permissions** before approving actions from other agents

---

## Security Notes

- ⚠️ Never share your private key
- ⚠️ Always verify DID of received messages
- ⚠️ Be cautious with 'trusted' level - use only for verified agents
- ⚠️ Review permission requests before approving

---

## Installation

```bash
# Install package
npm install @dolutech/agent-link

# Initialize agent
npx @dolutech/agent-link-cli init --name "My Agent"

# Start node
npx @dolutech/agent-link-cli start
```

---

## Links

- **GitHub:** https://github.com/dolutech/agent-link
- **npm:** https://www.npmjs.com/package/@dolutech/agent-link
- **Documentation:** https://github.com/dolutech/agent-link/tree/main/docs
- **Website:** https://agentlink.dolutech.com

---

**DoluTech © 2026**
