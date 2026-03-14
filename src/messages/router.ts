/**
 * AgentLink Message Router
 * 
 * Routes incoming messages to appropriate handlers based on message type.
 * 
 * @module messages/router
 */

import type { Envelope, ParsedMessage } from './types.js';
import { parseMessage } from './envelope.js';

/**
 * Context provided to message handlers
 */
export interface MessageContext {
  /** Parsed message envelope */
  envelope: Envelope;
  /** Raw message string */
  raw: string;
  /** Signature verification status */
  verified: boolean;
  /** Function to send a response */
  send: (envelope: Envelope) => Promise<void>;
  /** Function to create a signed response */
  createResponse: (type: Envelope['type'], body: Record<string, unknown>) => Promise<Envelope>;
  /** Original parsed message */
  message: ParsedMessage;
}

/**
 * Message handler function type
 */
export type MessageHandler = (ctx: MessageContext) => Promise<void>;

/**
 * Configuration for MessageRouter
 */
export interface MessageRouterOptions {
  /** Called when no handler is found for a message type */
  onUnhandled?: (ctx: MessageContext) => Promise<void>;
  /** Called when message verification fails */
  onUnverified?: (ctx: MessageContext) => Promise<void>;
  /** Called when an error occurs in a handler */
  onError?: (error: Error, ctx: MessageContext) => Promise<void>;
}

/**
 * Message router that dispatches messages to registered handlers
 */
export class MessageRouter {
  private handlers: Map<string, MessageHandler> = new Map();
  private options: MessageRouterOptions;
  private signerPrivateKey?: Uint8Array;
  private createEnvelopeFn?: (options: import('./types.js').CreateMessageOptions, privateKey: Uint8Array) => Promise<Envelope>;

  constructor(options: MessageRouterOptions = {}) {
    this.options = options;
  }

  /**
   * Sets the signing key and envelope creation function
   * 
   * @param privateKey - Private key for signing responses
   * @param createEnvelope - Envelope creation function
   */
  setSigner(privateKey: Uint8Array, createEnvelope: typeof import('./envelope.js').createEnvelope): void {
    this.signerPrivateKey = privateKey;
    this.createEnvelopeFn = createEnvelope;
  }

  /**
   * Registers a handler for a message type
   * 
   * @param type - Message type to handle
   * @param handler - Handler function
   * 
   * @example
   * router.on('ping', async (ctx) => {
   *   await ctx.send(await ctx.createResponse('pong', {}));
   * });
   */
  on(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Removes a handler for a message type
   * 
   * @param type - Message type to remove handler for
   */
  off(type: string): void {
    this.handlers.delete(type);
  }

  /**
   * Routes a raw message to the appropriate handler
   * 
   * @param raw - Raw message string
   * @param sendFn - Function to send responses
   * @returns true if message was handled
   * 
   * @example
   * await router.route(rawMessage, async (envelope) => {
   *   await connection.send(envelope);
   * });
   */
  async route(raw: string, sendFn: (envelope: Envelope) => Promise<void>): Promise<boolean> {
    let parsed: ParsedMessage;
    
    try {
      parsed = parseMessage(raw);
    } catch (error) {
      console.error('Failed to parse message:', error);
      return false;
    }

    const ctx: MessageContext = {
      envelope: parsed.envelope,
      raw: parsed.raw,
      verified: parsed.verified,
      send: sendFn,
      createResponse: async (type, body) => {
        if (!this.signerPrivateKey || !this.createEnvelopeFn) {
          throw new Error('Router not configured with signer');
        }
        return this.createEnvelopeFn({
          from: parsed.envelope.to,
          to: parsed.envelope.from,
          type,
          body,
          thread: parsed.envelope.id
        }, this.signerPrivateKey);
      },
      message: parsed
    };

    // Check signature verification
    if (!parsed.verified) {
      if (this.options.onUnverified) {
        await this.options.onUnverified(ctx);
      }
      return false;
    }

    // Find handler
    const handler = this.handlers.get(parsed.envelope.type);
    
    if (!handler) {
      if (this.options.onUnhandled) {
        await this.options.onUnhandled(ctx);
      }
      return false;
    }

    // Execute handler
    try {
      await handler(ctx);
      return true;
    } catch (error) {
      if (this.options.onError) {
        await this.options.onError(error as Error, ctx);
      } else {
        console.error('Handler error:', error);
      }
      return false;
    }
  }

  /**
   * Gets all registered message types
   * 
   * @returns Array of registered types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Checks if a handler is registered for a type
   * 
   * @param type - Message type to check
   * @returns true if handler exists
   */
  hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }
}