/**
 * AgentLink Node Integration Tests
 * 
 * Tests the complete lifecycle of an AgentLink node.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentLinkNode } from '../../src/node/agentlink-node.js';
import * as fs from 'fs';
import * as path from 'path';

describe('AgentLink Node Integration', () => {
  const testDir = './test-agentlink-integration';
  
  beforeAll(() => {
    // Clean up any previous test runs
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });
  
  afterAll(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  describe('Node Lifecycle', () => {
    it('should create and start a node', async () => {
      const node = new AgentLinkNode({
        name: 'Test Agent',
        description: 'Integration test agent',
        listenPort: 9200
      });
      
      await node.start();
      
      expect(node.getIdentity()).toBeDefined();
      expect(node.getIdentity()?.did).toMatch(/^did:key:z6Mk/);
      expect(node.getAgentCard()).toBeDefined();
      expect(node.getAgentCard()?.name).toBe('Test Agent');
      
      await node.stop();
    });
    
    it('should stop node gracefully', async () => {
      const node = new AgentLinkNode({
        name: 'Stop Test Agent',
        listenPort: 9201
      });
      
      await node.start();
      expect(node.getLibp2p()).toBeDefined();
      
      await node.stop();
      expect(node.getLibp2p()).toBeNull();
    });
    
    it('should generate valid Agent Card', async () => {
      const node = new AgentLinkNode({
        name: 'Card Test Agent',
        description: 'Testing card generation',
        capabilities: ['messaging', 'scheduling'],
        listenPort: 9202
      });
      
      await node.start();
      
      const card = node.getAgentCard();
      
      expect(card).toBeDefined();
      expect(card?.agentcard).toBe('0.1.0');
      expect(card?.did).toMatch(/^did:key:/);
      expect(card?.name).toBe('Card Test Agent');
      expect(card?.capabilities).toContain('messaging');
      expect(card?.capabilities).toContain('scheduling');
      expect(card?.endpoints.agentlink).toBeDefined();
      
      await node.stop();
    });
    
    it('should have correct default capabilities', async () => {
      const node = new AgentLinkNode({
        name: 'Default Cap Agent',
        listenPort: 9203
      });
      
      await node.start();
      
      const card = node.getAgentCard();
      expect(card?.capabilities).toContain('messaging');
      expect(card?.capabilities).toContain('handshake');
      
      await node.stop();
    });
  });
  
  describe('Identity Generation', () => {
    it('should reuse identity from disk when available', async () => {
      // Both nodes will reuse the same identity from disk
      const node1 = new AgentLinkNode({ name: 'Agent 1', listenPort: 9210 });
      const node2 = new AgentLinkNode({ name: 'Agent 2', listenPort: 9211 });
      
      await node1.start();
      await node2.start();
      
      const did1 = node1.getIdentity()?.did;
      const did2 = node2.getIdentity()?.did;
      
      // Both nodes use the same persisted identity
      expect(did1).toBeDefined();
      expect(did2).toBeDefined();
      expect(did1).toBe(did2); // Same identity from disk
      
      await node1.stop();
      await node2.stop();
    });
    
    it('should have valid peer IDs', async () => {
      const node = new AgentLinkNode({ name: 'Peer ID Test', listenPort: 9212 });
      
      await node.start();
      
      const identity = node.getIdentity();
      expect(identity?.peerId).toBeDefined();
      expect(identity?.peerId.toString()).toMatch(/^[0-9a-zA-Z]+$/);
      
      await node.stop();
    });
  });
  
  describe('Contact Book', () => {
    it('should have a contact book available', async () => {
      const node = new AgentLinkNode({ name: 'Contact Test', listenPort: 9220 });
      
      await node.start();
      
      const contacts = node.getContactBook();
      expect(contacts).toBeDefined();
      expect(contacts.list).toBeDefined();
      
      await node.stop();
    });
  });
});