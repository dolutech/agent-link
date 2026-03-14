import { describe, it, expect } from 'vitest';
import { ulid } from 'ulid';
import { EnvelopeSchema, MessageTypeSchema } from '../../src/messages/types.js';
import { createEnvelope, serialize, parseMessage, verifyEnvelope, isExpired } from '../../src/messages/envelope.js';
import { generateKeyPair } from '../../src/node/identity.js';

describe('Message Module', () => {
  it('should generate unique message IDs', () => {
    const id1 = ulid();
    const id2 = ulid();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('should validate envelope schema', async () => {
    const keypair = await generateKeyPair();
    const envelope = await createEnvelope({
      from: keypair.did,
      to: 'did:key:z6Mktest2',
      type: 'ping',
      body: {}
    }, keypair.privateKey);
    
    const result = EnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });

  it('should reject invalid message types', () => {
    const result = MessageTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });

  it('should create and verify a valid envelope', async () => {
    const keypair = await generateKeyPair();
    const envelope = await createEnvelope({
      from: keypair.did,
      to: 'did:key:z6Mktest2',
      type: 'ping',
      body: { timestamp: Date.now() }
    }, keypair.privateKey);
    
    expect(envelope.from).toBe(keypair.did);
    expect(envelope.type).toBe('ping');
    expect(envelope.sig).toBeDefined();
    
    const isValid = verifyEnvelope(envelope);
    expect(isValid).toBe(true);
  });

  it('should serialize and parse envelope', async () => {
    const keypair = await generateKeyPair();
    const envelope = await createEnvelope({
      from: keypair.did,
      to: 'did:key:z6Mktest2',
      type: 'ping',
      body: {}
    }, keypair.privateKey);
    
    const serialized = serialize(envelope);
    expect(serialized).toContain(keypair.did);
    
    const parsed = parseMessage(serialized);
    expect(parsed.verified).toBe(true);
    expect(parsed.envelope.from).toBe(keypair.did);
  });

  it('should detect expired messages', async () => {
    const keypair = await generateKeyPair();
    const expiredEnvelope = await createEnvelope({
      from: keypair.did,
      to: 'did:key:z6Mktest2',
      type: 'ping',
      body: {},
      expires: new Date(Date.now() - 1000) // 1 second ago
    }, keypair.privateKey);
    
    expect(isExpired(expiredEnvelope)).toBe(true);
    
    const validEnvelope = await createEnvelope({
      from: keypair.did,
      to: 'did:key:z6Mktest2',
      type: 'ping',
      body: {},
      expires: new Date(Date.now() + 60000) // 1 minute from now
    }, keypair.privateKey);
    
    expect(isExpired(validEnvelope)).toBe(false);
  });
});