import { describe, it, expect } from 'vitest';
import { createAgentCard, validateAgentCard } from '../../src/agent-card/card.js';
import { toLink, fromLink, toJson } from '../../src/agent-card/export.js';

describe('Agent Card', () => {
  it('should create a valid agent card', () => {
    const card = createAgentCard({
      did: 'did:key:z6Mktest',
      name: 'Test Agent',
      capabilities: ['messaging'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    });
    
    expect(card.agentcard).toBe('0.1.0');
    expect(card.name).toBe('Test Agent');
    expect(card.capabilities).toContain('messaging');
  });

  it('should create agent card with optional description', () => {
    const card = createAgentCard({
      did: 'did:key:z6Mktest',
      name: 'Test Agent',
      description: 'A test agent for unit testing',
      capabilities: ['messaging', 'scheduling'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    });
    
    expect(card.description).toBe('A test agent for unit testing');
    expect(card.capabilities).toHaveLength(2);
  });

  it('should validate agent cards', () => {
    const validCard = {
      agentcard: '0.1.0',
      did: 'did:key:z6Mktest',
      name: 'Test',
      capabilities: ['messaging'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    };
    
    const result = validateAgentCard(validCard);
    expect(result.valid).toBe(true);
    expect(result.card).toBeDefined();
  });

  it('should reject invalid cards with invalid DID', () => {
    const invalidCard = {
      agentcard: '0.1.0',
      did: 'invalid-did',
      name: 'Test',
      capabilities: ['messaging'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    };
    
    const result = validateAgentCard(invalidCard);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should reject cards missing required fields', () => {
    const invalidCard = {
      agentcard: '0.1.0',
      did: 'did:key:z6Mktest'
      // missing name, capabilities, endpoints
    };
    
    const result = validateAgentCard(invalidCard);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should reject cards with empty capabilities', () => {
    const invalidCard = {
      agentcard: '0.1.0',
      did: 'did:key:z6Mktest',
      name: 'Test',
      capabilities: [],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    };
    
    const result = validateAgentCard(invalidCard);
    expect(result.valid).toBe(false);
  });

  it('should export to JSON', () => {
    const card = createAgentCard({
      did: 'did:key:z6Mktest',
      name: 'Test',
      capabilities: ['messaging'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    });
    
    const json = toJson(card);
    expect(json).toContain('Test');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should create and parse links', () => {
    const card = createAgentCard({
      did: 'did:key:z6Mktest',
      name: 'Test Agent',
      capabilities: ['messaging'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    });
    
    const link = toLink(card);
    expect(link).toContain('agentlink://');
    expect(link).toContain(card.did);
    
    const parsed = fromLink(link);
    expect(parsed.did).toBe(card.did);
    expect(parsed.name).toBe(card.name);
  });

  it('should include description in link when present', () => {
    const card = createAgentCard({
      did: 'did:key:z6Mktest',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: ['messaging'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    });
    
    const link = toLink(card);
    expect(link).toContain('description');
    
    const parsed = fromLink(link);
    expect(parsed.description).toBe('A test agent');
  });

  it('should throw error for invalid link format', () => {
    expect(() => fromLink('invalid-link')).toThrow();
    expect(() => fromLink('https://example.com')).toThrow();
  });

  it('should handle multiple capabilities in link', () => {
    const card = createAgentCard({
      did: 'did:key:z6Mktest',
      name: 'Test Agent',
      capabilities: ['messaging', 'scheduling', 'files'],
      endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
    });
    
    const link = toLink(card);
    const parsed = fromLink(link);
    
    expect(parsed.capabilities).toHaveLength(3);
    expect(parsed.capabilities).toContain('messaging');
    expect(parsed.capabilities).toContain('scheduling');
    expect(parsed.capabilities).toContain('files');
  });
});