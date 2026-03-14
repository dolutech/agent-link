/**
 * Thread Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThreadManager, Thread, ThreadMessage } from '../../src/application/threads.js';

describe('ThreadManager', () => {
  let manager: ThreadManager;

  beforeEach(() => {
    manager = new ThreadManager();
  });

  describe('Thread Creation', () => {
    it('should create a new thread', () => {
      const participants = ['did:key:alice', 'did:key:bob'];
      const thread = manager.create(participants);

      expect(thread.id).toBeDefined();
      expect(thread.participants).toEqual(participants.sort());
      expect(thread.messages).toHaveLength(0);
      expect(thread.status).toBe('active');
    });

    it('should create thread with custom ID', () => {
      const thread = manager.create(['did:key:alice'], 'custom-thread-id');
      expect(thread.id).toBe('custom-thread-id');
    });

    it('should sort participants', () => {
      const thread = manager.create(['did:key:bob', 'did:key:alice']);
      expect(thread.participants).toEqual(['did:key:alice', 'did:key:bob']);
    });
  });

  describe('Thread Retrieval', () => {
    it('should get thread by ID', () => {
      const created = manager.create(['did:key:alice']);
      const retrieved = manager.get(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent thread', () => {
      const thread = manager.get('non-existent');
      expect(thread).toBeNull();
    });

    it('should find thread by participants', () => {
      const created = manager.create(['did:key:alice', 'did:key:bob']);
      const found = manager.findByParticipants(['did:key:bob', 'did:key:alice']);

      expect(found?.id).toBe(created.id);
    });

    it('should get or create thread', () => {
      const participants = ['did:key:alice', 'did:key:bob'];
      
      const thread1 = manager.getOrCreate(participants);
      const thread2 = manager.getOrCreate(participants);

      expect(thread1.id).toBe(thread2.id);
    });
  });

  describe('Message Management', () => {
    it('should add message to thread', () => {
      const thread = manager.create(['did:key:alice']);
      const envelope = {
        v: '0.1.0',
        id: 'msg-1',
        from: 'did:key:alice',
        to: 'did:key:bob',
        type: 'request' as const,
        created: new Date().toISOString(),
        body: { test: true },
        sig: 'sig'
      };

      manager.addMessage(thread.id, envelope, 'inbound');
      expect(manager.getMessageCount(thread.id)).toBe(1);
    });

    it('should get last message', () => {
      const thread = manager.create(['did:key:alice']);
      
      const envelope1 = {
        v: '0.1.0', id: 'msg-1', from: 'did:key:alice', to: 'did:key:bob',
        type: 'request' as const, created: new Date().toISOString(), body: {}, sig: 'sig1'
      };
      const envelope2 = {
        v: '0.1.0', id: 'msg-2', from: 'did:key:bob', to: 'did:key:alice',
        type: 'response' as const, created: new Date().toISOString(), body: {}, sig: 'sig2'
      };

      manager.addMessage(thread.id, envelope1, 'inbound');
      manager.addMessage(thread.id, envelope2, 'outbound');

      const last = manager.getLastMessage(thread.id);
      expect(last?.envelope.id).toBe('msg-2');
    });

    it('should throw for non-existent thread', () => {
      const envelope = {
        v: '0.1.0', id: 'msg-1', from: 'did:key:alice', to: 'did:key:bob',
        type: 'request' as const, created: new Date().toISOString(), body: {}, sig: 'sig'
      };

      expect(() => manager.addMessage('non-existent', envelope, 'inbound')).toThrow();
    });
  });

  describe('Thread Management', () => {
    it('should list all threads', () => {
      manager.create(['did:key:alice']);
      manager.create(['did:key:bob']);

      const threads = manager.list();
      expect(threads).toHaveLength(2);
    });

    it('should list active threads only', () => {
      const thread1 = manager.create(['did:key:alice']);
      manager.create(['did:key:bob']);
      
      manager.close(thread1.id);

      const active = manager.listActive();
      expect(active).toHaveLength(1);
    });

    it('should close thread', () => {
      const thread = manager.create(['did:key:alice']);
      
      const result = manager.close(thread.id);
      expect(result).toBe(true);
      expect(manager.get(thread.id)?.status).toBe('closed');
    });

    it('should delete thread', () => {
      const thread = manager.create(['did:key:alice']);
      
      const result = manager.delete(thread.id);
      expect(result).toBe(true);
      expect(manager.get(thread.id)).toBeNull();
    });
  });
});