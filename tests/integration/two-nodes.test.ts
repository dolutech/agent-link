/**
 * Two Node Communication Tests
 * 
 * Tests interaction between two AgentLink nodes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AgentLinkNode } from '../../src/node/agentlink-node.js';

describe('Two Node Communication', () => {
  let node1: AgentLinkNode;
  let node2: AgentLinkNode;
  
  beforeAll(async () => {
    node1 = new AgentLinkNode({ 
      name: 'Node 1', 
      description: 'First test node',
      listenPort: 9300 
    });
    node2 = new AgentLinkNode({ 
      name: 'Node 2', 
      description: 'Second test node',
      listenPort: 9301 
    });
    
    await node1.start();
    await node2.start();
  });
  
  afterAll(async () => {
    await node1.stop();
    await node2.stop();
  });
  
  describe('Both Nodes Running', () => {
    it('should have both nodes running', () => {
      expect(node1.getLibp2p()).toBeDefined();
      expect(node2.getLibp2p()).toBeDefined();
    });
    
    it('should reuse the same identity from disk', () => {
      // Both nodes share the same persisted identity
      const did1 = node1.getIdentity()?.did;
      const did2 = node2.getIdentity()?.did;
      
      expect(did1).toBeDefined();
      expect(did2).toBeDefined();
      expect(did1).toBe(did2); // Same identity from disk
    });
    
    it('should have the same peer ID (from shared identity)', () => {
      const peer1 = node1.getIdentity()?.peerId.toString();
      const peer2 = node2.getIdentity()?.peerId.toString();
      
      expect(peer1).toBeDefined();
      expect(peer2).toBeDefined();
      expect(peer1).toBe(peer2); // Same identity = same peer ID
    });
  });
  
  describe('Agent Cards', () => {
    it('should have endpoints configured', () => {
      const card1 = node1.getAgentCard();
      const card2 = node2.getAgentCard();
      
      expect(card1?.endpoints.agentlink).toBeDefined();
      expect(card2?.endpoints.agentlink).toBeDefined();
    });
    
    it('should have correct names', () => {
      expect(node1.getAgentCard()?.name).toBe('Node 1');
      expect(node2.getAgentCard()?.name).toBe('Node 2');
    });
    
    it('should have valid DIDs in cards', () => {
      const card1 = node1.getAgentCard();
      const card2 = node2.getAgentCard();
      
      expect(card1?.did).toMatch(/^did:key:/);
      expect(card2?.did).toMatch(/^did:key:/);
    });
  });
  
  describe('Contact Management', () => {
    it('should add contacts to contact book', async () => {
      const card2 = node2.getAgentCard()!;
      
      // Add node2 as contact to node1
      await node1.getContactBook().add({
        did: card2.did,
        name: card2.name,
        trustLevel: 'friend',
        agentCard: card2,
        multiaddrs: []
      });
      
      const contact = node1.getContactBook().getByDid(card2.did);
      expect(contact).toBeDefined();
      expect(contact?.name).toBe(card2.name);
      expect(contact?.trustLevel).toBe('friend');
    });
    
    it('should list all contacts', async () => {
      const contacts = node1.getContactBook().list();
      expect(contacts.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should update trust level', async () => {
      const card2 = node2.getAgentCard()!;
      
      await node1.getContactBook().setTrustLevel(card2.did, 'trusted');
      
      const contact = node1.getContactBook().getByDid(card2.did);
      expect(contact?.trustLevel).toBe('trusted');
    });
    
    it('should remove contacts', async () => {
      const card2 = node2.getAgentCard()!;
      
      await node1.getContactBook().remove(card2.did);
      
      const contact = node1.getContactBook().getByDid(card2.did);
      expect(contact).toBeNull();
    });
  });
  
  describe('Trust Levels', () => {
    it('should return correct default trust for unknown DIDs', () => {
      const unknownDid = 'did:key:z6Mkunknown123456789';
      const trust = node1.getContactBook().getTrustLevel(unknownDid);
      expect(trust).toBe('ask'); // Default trust level
    });
  });
});