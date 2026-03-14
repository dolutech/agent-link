/**
 * Performance Tests - Message Throughput
 * 
 * Tests for latency, throughput, and concurrency.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentLinkNode } from '../../src/node/agentlink-node.js';
import { generateKeyPair, sign, verify } from '../../src/node/identity.js';

describe('Performance: Message Throughput', () => {
  let node: AgentLinkNode;

  beforeAll(async () => {
    node = new AgentLinkNode({
      name: 'Performance Test Node',
      listenPort: 9500
    });
    await node.start();
  });

  afterAll(async () => {
    await node.stop();
  });

  describe('Signature Performance', () => {
    it('should sign 100 messages in under 1 second', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test message');

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        sign(data, identity.privateKey);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should verify 100 signatures in under 1 second', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test message');
      const signature = sign(data, identity.privateKey);

      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        verify(data, signature, identity.publicKey);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Key Generation Performance', () => {
    it('should generate 10 keypairs in under 5 seconds', async () => {
      const start = performance.now();

      await Promise.all([
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair()
      ]);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Node Startup Performance', () => {
    it('should start a node in under 5 seconds', async () => {
      const testNode = new AgentLinkNode({
        name: 'Startup Test',
        listenPort: 9501
      });

      const start = performance.now();
      await testNode.start();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000);

      await testNode.stop();
    });

    it('should stop a node in under 2 seconds', async () => {
      const testNode = new AgentLinkNode({
        name: 'Stop Test',
        listenPort: 9502
      });

      await testNode.start();

      const start = performance.now();
      await testNode.stop();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Data Size Performance', () => {
    it('should sign small messages quickly', async () => {
      const identity = await generateKeyPair();
      const data = new Uint8Array(64); // 64 bytes

      const start = performance.now();
      sign(data, identity.privateKey);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should sign medium messages efficiently', async () => {
      const identity = await generateKeyPair();
      const data = new Uint8Array(1024); // 1KB

      const start = performance.now();
      sign(data, identity.privateKey);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should sign large messages in reasonable time', async () => {
      const identity = await generateKeyPair();
      const data = new Uint8Array(1024 * 100); // 100KB

      const start = performance.now();
      sign(data, identity.privateKey);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Contact Book Performance', () => {
    it('should handle 100 contacts efficiently', async () => {
      const contactBook = node.getContactBook();

      const start = performance.now();

      // Add 100 contacts
      for (let i = 0; i < 100; i++) {
        await contactBook.add({
          did: `did:key:test${i}`,
          name: `Contact ${i}`,
          trustLevel: 'friend',
          agentCard: {
            agentcard: '0.1.0',
            did: `did:key:test${i}`,
            name: `Contact ${i}`,
            capabilities: ['messaging'],
            endpoints: { agentlink: '' }
          },
          multiaddrs: []
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000);

      // Verify list performance
      const listStart = performance.now();
      const contacts = contactBook.list();
      const listDuration = performance.now() - listStart;

      expect(contacts.length).toBeGreaterThanOrEqual(100);
      expect(listDuration).toBeLessThan(100);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent signatures', async () => {
      const identity = await generateKeyPair();

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise<void>(resolve => {
            const data = new TextEncoder().encode(`message ${i}`);
            sign(data, identity.privateKey);
            resolve();
          })
        );
      }

      const start = performance.now();
      await Promise.all(promises);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});