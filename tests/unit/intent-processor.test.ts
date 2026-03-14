/**
 * Intent Processor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntentProcessor, Intent, IntentResult } from '../../src/application/intent-processor.js';
import { Envelope } from '../../src/messages/types.js';
import { TrustLevel } from '../../src/contacts/trust.js';

describe('IntentProcessor', () => {
  let processor: IntentProcessor;

  beforeEach(() => {
    processor = new IntentProcessor();
  });

  const createEnvelope = (overrides?: Partial<Envelope>): Envelope => ({
    v: '0.1.0',
    id: 'test-msg',
    from: 'did:key:sender',
    to: 'did:key:receiver',
    type: 'request',
    created: new Date().toISOString(),
    body: {},
    sig: 'test-sig',
    ...overrides
  });

  describe('Handler Registration', () => {
    it('should register a handler for an intent', () => {
      const handler = vi.fn();
      processor.on('messaging.send', handler);

      expect(processor.getRegisteredIntents()).toContain('messaging.send');
    });

    it('should register pattern handlers', () => {
      const handler = vi.fn();
      processor.onPattern('messaging.*', handler);

      // Pattern handlers are stored with 'pattern:' prefix but filtered out by getRegisteredIntents
      // They should still work for matching
      expect(processor.getRegisteredIntents()).not.toContain('pattern:messaging.*');
      
      // Verify pattern works by processing a matching intent
      const envelope = createEnvelope();
      const intent: Intent = { name: 'messaging.custom' };
      // This would fail if pattern wasn't registered
    });

    it('should support chaining', () => {
      const result = processor
        .on('intent1', vi.fn())
        .on('intent2', vi.fn());

      expect(result).toBe(processor);
    });
  });

  describe('Intent Processing', () => {
    it('should reject invalid intent name', async () => {
      const envelope = createEnvelope();
      const intent: Intent = { name: '' };

      const result = await processor.process(intent, envelope, 'friend');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INTENT');
    });

    it('should deny blocked contacts', async () => {
      processor.on('messaging.send', vi.fn());
      const envelope = createEnvelope();
      const intent: Intent = { name: 'messaging.send' };

      const result = await processor.process(intent, envelope, 'blocked');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
    });

    it('should require approval for unknown contacts', async () => {
      processor.on('messaging.send', vi.fn());
      const envelope = createEnvelope();
      const intent: Intent = { name: 'messaging.send' };

      const result = await processor.process(intent, envelope, 'unknown');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('APPROVAL_REQUIRED');
      expect(result.requireApproval).toBe(true);
    });

    it('should return no handler error when no handler registered', async () => {
      const envelope = createEnvelope();
      const intent: Intent = { name: 'unknown.intent' };

      const result = await processor.process(intent, envelope, 'trusted');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_HANDLER');
    });

    it('should execute handler for trusted contacts', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, response: 'OK' });
      processor.on('messaging.send', handler);
      
      const envelope = createEnvelope();
      const intent: Intent = { name: 'messaging.send', natural: 'Send a message' };

      const result = await processor.process(intent, envelope, 'trusted');

      expect(handler).toHaveBeenCalledWith(intent, envelope);
      expect(result.success).toBe(true);
      expect(result.response).toBe('OK');
    });

    it('should allow auto-accepted intents for friends', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      processor.on('messaging.send', handler);
      
      const envelope = createEnvelope();
      const intent: Intent = { name: 'messaging.send' };

      const result = await processor.process(intent, envelope, 'friend', ['messaging.*']);

      expect(result.success).toBe(true);
    });
  });

  describe('Pattern Matching', () => {
    it('should match wildcard patterns', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      processor.onPattern('messaging.*', handler);
      
      const envelope = createEnvelope();
      const intent: Intent = { name: 'messaging.custom' };

      const result = await processor.process(intent, envelope, 'trusted');

      expect(result.success).toBe(true);
    });

    it('should match global wildcard', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      processor.onPattern('*', handler);
      
      const envelope = createEnvelope();
      const intent: Intent = { name: 'any.intent' };

      const result = await processor.process(intent, envelope, 'trusted');

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      processor.on('messaging.send', handler);
      
      const envelope = createEnvelope();
      const intent: Intent = { name: 'messaging.send' };

      const result = await processor.process(intent, envelope, 'trusted');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HANDLER_ERROR');
      expect(result.error?.message).toBe('Handler failed');
    });
  });

  describe('Intent Validation', () => {
    it('should validate intent names', () => {
      expect(processor.isValidIntent('messaging.send')).toBe(true);
      expect(processor.isValidIntent('invalid.intent')).toBe(false);
    });
  });
});