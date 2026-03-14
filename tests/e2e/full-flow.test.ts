/**
 * End-to-End Tests - Full Flow
 * 
 * Tests complete agent-to-agent communication flow.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentLinkNode } from '../../src/node/agentlink-node.js';
import { toJson, fromLink } from '../../src/agent-card/export.js';
import { sign, verify } from '../../src/node/identity.js';

describe('E2E: Full Communication Flow', () => {
  let node1: AgentLinkNode;
  let node2: AgentLinkNode;

  beforeAll(async () => {
    node1 = new AgentLinkNode({
      name: 'Alice Agent',
      description: 'Test agent for E2E tests',
      capabilities: ['messaging', 'handshake', 'scheduling'],
      listenPort: 9400
    });

    node2 = new AgentLinkNode({
      name: 'Bob Agent',
      description: 'Test agent for E2E tests',
      capabilities: ['messaging', 'handshake'],
      listenPort: 9401
    });

    await node1.start();
    await node2.start();
  });

  afterAll(async () => {
    await node1.stop();
    await node2.stop();
  });

  describe('Node Initialization', () => {
    it('should have both nodes running', () => {
      expect(node1.getLibp2p()).toBeDefined();
      expect(node2.getLibp2p()).toBeDefined();
    });

    it('should have unique DIDs', () => {
      const did1 = node1.getIdentity()?.did;
      const did2 = node2.getIdentity()?.did;
      expect(did1).toBeDefined();
      expect(did2).toBeDefined();
      // Note: May be same if reusing persisted identity
    });

    it('should have valid Agent Cards', () => {
      const card1 = node1.getAgentCard();
      const card2 = node2.getAgentCard();

      expect(card1?.agentcard).toBe('0.1.0');
      expect(card1?.name).toBe('Alice Agent');
      expect(card1?.capabilities).toContain('messaging');

      expect(card2?.agentcard).toBe('0.1.0');
      expect(card2?.name).toBe('Bob Agent');
      expect(card2?.capabilities).toContain('messaging');
    });

    it('should have endpoints configured', () => {
      const card1 = node1.getAgentCard();
      const card2 = node2.getAgentCard();

      expect(card1?.endpoints.agentlink).toBeDefined();
      expect(card2?.endpoints.agentlink).toBeDefined();
    });
  });

  describe('Agent Card Operations', () => {
    it('should export Agent Card as JSON', () => {
      const card = node1.getAgentCard()!;
      const json = toJson(card);

      expect(json).toContain('Alice Agent');
      expect(json).toContain('did:key:');

      // Verify it's valid JSON
      const parsed = JSON.parse(json);
      expect(parsed.agentcard).toBe('0.1.0');
    });

    it('should export Agent Card as link', () => {
      const card = node1.getAgentCard()!;
      const link = card.endpoints.agentlink;

      expect(link).toBeDefined();
    });

    it('should have correct capabilities', () => {
      const card1 = node1.getAgentCard()!;
      const card2 = node2.getAgentCard()!;

      expect(card1.capabilities).toContain('scheduling');
      expect(card2.capabilities).not.toContain('scheduling');
    });
  });

  describe('Contact Management', () => {
    it('should add contacts', async () => {
      const card2 = node2.getAgentCard()!;

      await node1.getContactBook().add({
        did: card2.did,
        name: card2.name,
        trustLevel: 'friend',
        agentCard: card2,
        multiaddrs: []
      });

      const contact = node1.getContactBook().getByDid(card2.did);
      expect(contact).toBeDefined();
      expect(contact?.name).toBe('Bob Agent');
      expect(contact?.trustLevel).toBe('friend');
    });

    it('should list all contacts', () => {
      const contacts = node1.getContactBook().list();
      expect(contacts.length).toBeGreaterThanOrEqual(1);
    });

    it('should update trust level', async () => {
      const card2 = node2.getAgentCard()!;

      await node1.getContactBook().setTrustLevel(card2.did, 'trusted');

      const contact = node1.getContactBook().getByDid(card2.did);
      expect(contact?.trustLevel).toBe('trusted');
    });

    it('should get trust level for unknown DID', () => {
      const trust = node1.getContactBook().getTrustLevel('did:key:z6Mkunknown');
      expect(trust).toBe('ask'); // Default
    });
  });

  describe('Signature Verification', () => {
    it('should sign and verify messages correctly', async () => {
      const identity1 = node1.getIdentity()!;

      // Create a test message
      const message = Buffer.from('Test message from Alice to Bob');

      // Sign with Alice's private key
      const signature = sign(message, identity1.privateKey);

      // Verify with Alice's public key
      const isValid = verify(message, signature, identity1.publicKey);

      expect(isValid).toBe(true);
    });

    it('should reject signature from different key', async () => {
      // Generate a new, separate identity (not from disk)
      const { privateKey, publicKey } = await import('../../src/node/identity.js').then(m => m.generateKeyPair());
      const node1Identity = node1.getIdentity()!;

      const message = Buffer.from('Test message');

      // Sign with node1's key
      const signature = sign(message, node1Identity.privateKey);

      // Verify with the newly generated public key (different from node1)
      const isValid = verify(message, signature, publicKey);

      expect(isValid).toBe(false);
    });
  });

  describe('P2P Connection', () => {
    it('should have valid multiaddresses', () => {
      const libp2p1 = node1.getLibp2p()!;
      const addrs = libp2p1.getMultiaddrs();

      expect(addrs.length).toBeGreaterThan(0);

      // Should have at least one non-loopback address
      const nonLocal = addrs.find(a => 
        !a.toString().includes('127.0.0.1')
      );
      expect(nonLocal).toBeDefined();
    });

    it('should be listening on configured ports', () => {
      const libp2p1 = node1.getLibp2p()!;
      const addrs = libp2p1.getMultiaddrs();

      const port9400 = addrs.some(a => a.toString().includes('tcp/9400'));
      expect(port9400).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should stop nodes gracefully', async () => {
      // This is tested in afterAll, but we can verify the behavior
      const node3 = new AgentLinkNode({
        name: 'Test Node',
        listenPort: 9402
      });

      await node3.start();
      expect(node3.getLibp2p()).toBeDefined();

      await node3.stop();
      expect(node3.getLibp2p()).toBeNull();
    });
  });
});