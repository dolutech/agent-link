/**
 * Threads Module
 * 
 * Manages conversation threads between agents.
 * 
 * @module application/threads
 */

import { Envelope } from '../messages/types.js';

// ============================================
// Thread Types
// ============================================

export interface ThreadMessage {
  envelope: Envelope;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
}

export interface Thread {
  id: string;
  participants: string[]; // DIDs
  messages: ThreadMessage[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'closed' | 'pending';
  metadata?: Record<string, unknown>;
}

// ============================================
// Thread Manager
// ============================================

export class ThreadManager {
  private threads: Map<string, Thread> = new Map();
  private maxMessagesPerThread: number;

  constructor(maxMessagesPerThread: number = 1000) {
    this.maxMessagesPerThread = maxMessagesPerThread;
  }

  /**
   * Create a new thread
   */
  create(participants: string[], id?: string): Thread {
    const threadId = id || this.generateThreadId();
    
    const thread: Thread = {
      id: threadId,
      participants: participants.sort(), // Sort for consistency
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };
    
    this.threads.set(threadId, thread);
    return thread;
  }

  /**
   * Get a thread by ID
   */
  get(threadId: string): Thread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * Add a message to a thread
   */
  addMessage(threadId: string, envelope: Envelope, direction: 'inbound' | 'outbound'): void {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }
    
    const message: ThreadMessage = {
      envelope,
      direction,
      timestamp: new Date()
    };
    
    thread.messages.push(message);
    thread.updatedAt = new Date();
    
    // Trim old messages if exceeding limit
    if (thread.messages.length > this.maxMessagesPerThread) {
      thread.messages = thread.messages.slice(-this.maxMessagesPerThread);
    }
  }

  /**
   * Find thread by participants
   */
  findByParticipants(participants: string[]): Thread | null {
    const sortedParticipants = participants.sort();
    
    for (const thread of this.threads.values()) {
      if (this.arraysEqual(thread.participants, sortedParticipants)) {
        return thread;
      }
    }
    
    return null;
  }

  /**
   * Get or create thread for participants
   */
  getOrCreate(participants: string[]): Thread {
    const existing = this.findByParticipants(participants);
    if (existing) {
      return existing;
    }
    return this.create(participants);
  }

  /**
   * List all threads
   */
  list(): Thread[] {
    return Array.from(this.threads.values());
  }

  /**
   * List active threads
   */
  listActive(): Thread[] {
    return this.list().filter(t => t.status === 'active');
  }

  /**
   * Close a thread
   */
  close(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;
    
    thread.status = 'closed';
    thread.updatedAt = new Date();
    return true;
  }

  /**
   * Delete a thread
   */
  delete(threadId: string): boolean {
    return this.threads.delete(threadId);
  }

  /**
   * Get message count for a thread
   */
  getMessageCount(threadId: string): number {
    const thread = this.threads.get(threadId);
    return thread?.messages.length || 0;
  }

  /**
   * Get last message in a thread
   */
  getLastMessage(threadId: string): ThreadMessage | null {
    const thread = this.threads.get(threadId);
    if (!thread || thread.messages.length === 0) return null;
    return thread.messages[thread.messages.length - 1] || null;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private generateThreadId(): string {
    return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }
}