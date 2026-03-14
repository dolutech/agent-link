/**
 * Intent Processor Module
 * 
 * Processes intents from incoming messages.
 * 
 * @module application/intent-processor
 */

import { Envelope } from '../messages/types.js';
import { isValidAction } from './capabilities.js';
import { TrustLevel } from '../contacts/trust.js';
import { PermissionGuard, PermissionResult } from '../contacts/permissions.js';

// ============================================
// Intent Types
// ============================================

export interface Intent {
  name: string;           // e.g., 'messaging.send'
  natural?: string;       // Natural language description
  structured?: Record<string, unknown>; // Structured parameters
  replyTo?: string;       // Message ID this is replying to
}

export interface IntentResult {
  success: boolean;
  response?: unknown;
  error?: {
    code: string;
    message: string;
  };
  requireApproval?: boolean;
}

export type IntentHandler = (intent: Intent, envelope: Envelope) => Promise<IntentResult>;

// ============================================
// Intent Processor
// ============================================

export class IntentProcessor {
  private handlers: Map<string, IntentHandler> = new Map();
  private permissionGuard: PermissionGuard;
  private requireApprovalCallback?: (intent: Intent, envelope: Envelope) => Promise<boolean>;

  constructor(options?: {
    permissionGuard?: PermissionGuard;
    requireApprovalCallback?: (intent: Intent, envelope: Envelope) => Promise<boolean>;
  }) {
    this.permissionGuard = options?.permissionGuard || new PermissionGuard();
    this.requireApprovalCallback = options?.requireApprovalCallback;
  }

  /**
   * Register a handler for an intent
   */
  on(intentName: string, handler: IntentHandler): this {
    this.handlers.set(intentName, handler);
    return this;
  }

  /**
   * Register a handler for multiple intents (wildcard)
   */
  onPattern(pattern: string, handler: IntentHandler): this {
    // Store with pattern prefix
    this.handlers.set(`pattern:${pattern}`, handler);
    return this;
  }

  /**
   * Process an incoming intent
   */
  async process(
    intent: Intent,
    envelope: Envelope,
    trustLevel: TrustLevel,
    autoAccept: string[] = []
  ): Promise<IntentResult> {
    // 1. Validate intent name
    if (!intent.name) {
      return {
        success: false,
        error: { code: 'INVALID_INTENT', message: 'Intent name is required' }
      };
    }

    // 2. Check permissions
    const permission = this.permissionGuard.check(trustLevel, intent.name, autoAccept);

    if (permission === PermissionResult.DENIED) {
      return {
        success: false,
        error: { code: 'PERMISSION_DENIED', message: 'This action is not allowed' }
      };
    }

    if (permission === PermissionResult.REQUIRE_APPROVAL) {
      // Check if we have a callback for approval
      if (this.requireApprovalCallback) {
        const approved = await this.requireApprovalCallback(intent, envelope);
        if (!approved) {
          return {
            success: false,
            error: { code: 'APPROVAL_REQUIRED', message: 'Human approval required and was denied' },
            requireApproval: true
          };
        }
      } else {
        return {
          success: false,
          error: { code: 'APPROVAL_REQUIRED', message: 'Human approval required' },
          requireApproval: true
        };
      }
    }

    // 3. Find handler
    const handler = this.findHandler(intent.name);
    if (!handler) {
      return {
        success: false,
        error: { code: 'NO_HANDLER', message: `No handler registered for intent: ${intent.name}` }
      };
    }

    // 4. Execute handler
    try {
      return await handler(intent, envelope);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Check if an intent is valid
   */
  isValidIntent(intentName: string): boolean {
    return isValidAction(intentName);
  }

  /**
   * Get all registered intent names
   */
  getRegisteredIntents(): string[] {
    return Array.from(this.handlers.keys()).filter(k => !k.startsWith('pattern:'));
  }

  // ============================================
  // Private Helpers
  // ============================================

  private findHandler(intentName: string): IntentHandler | null {
    // Check exact match first
    const exactHandler = this.handlers.get(intentName);
    if (exactHandler) return exactHandler;

    // Check patterns
    for (const [key, handler] of this.handlers) {
      if (key.startsWith('pattern:')) {
        const pattern = key.slice('pattern:'.length);
        if (this.matchesPattern(intentName, pattern)) {
          return handler;
        }
      }
    }

    return null;
  }

  private matchesPattern(intentName: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return intentName.startsWith(prefix + '.') || intentName === prefix;
    }
    return intentName === pattern;
  }
}