/**
 * Permission System
 * 
 * Evaluates permissions for agent actions based on trust levels.
 * 
 * @module contacts/permissions
 */

import { TrustLevel, meetsMinimum } from './trust.js';
import { Contact } from './contact-book.js';

// ============================================
// Permission Result
// ============================================

export enum PermissionResult {
  ALLOWED = 'allowed',
  DENIED = 'denied',
  REQUIRE_APPROVAL = 'require_approval'
}

// ============================================
// Permission Rules
// ============================================

/**
 * Default permission rules by trust level
 */
const DEFAULT_PERMISSION_RULES: Record<TrustLevel, {
  allowAll: boolean;
  denyAll: boolean;
  requireApproval: boolean;
}> = {
  blocked: { allowAll: false, denyAll: true, requireApproval: false },
  unknown: { allowAll: false, denyAll: false, requireApproval: true },
  ask: { allowAll: false, denyAll: false, requireApproval: true },
  friend: { allowAll: false, denyAll: false, requireApproval: false },
  trusted: { allowAll: true, denyAll: false, requireApproval: false }
};

// ============================================
// Permission Guard
// ============================================

/**
 * Evaluates permissions for agent actions
 * 
 * @example
 * const guard = new PermissionGuard();
 * const result = guard.check('friend', 'messaging.send', ['messaging.*']);
 * // Returns: PermissionResult.ALLOWED
 */
export class PermissionGuard {
  /**
   * Check if an intent is allowed for a contact
   * 
   * @param trustLevel - Contact's trust level
   * @param intent - Intent to check (e.g., 'messaging.send')
   * @param autoAccept - Patterns the user has auto-accepted
   * @param defaultTrust - Default trust level for unknown contacts
   * @returns Permission decision
   */
  check(
    trustLevel: TrustLevel,
    intent: string,
    autoAccept: string[] = [],
    defaultTrust: TrustLevel = 'ask'
  ): PermissionResult {
    // Blocked contacts always denied
    if (trustLevel === 'blocked') {
      return PermissionResult.DENIED;
    }
    
    // Check auto-accept patterns first
    if (this.matchesPattern(intent, autoAccept)) {
      return PermissionResult.ALLOWED;
    }
    
    // Apply trust-level rules
    const rules = DEFAULT_PERMISSION_RULES[trustLevel];
    
    if (rules.allowAll) {
      return PermissionResult.ALLOWED;
    }
    
    if (rules.denyAll) {
      return PermissionResult.DENIED;
    }
    
    if (rules.requireApproval) {
      return PermissionResult.REQUIRE_APPROVAL;
    }
    
    // Default to require approval for safety
    return PermissionResult.REQUIRE_APPROVAL;
  }

  /**
   * Check if an intent matches any pattern
   * 
   * Supports wildcards: 'messaging.*' matches 'messaging.send', 'messaging.receive', etc.
   */
  private matchesPattern(intent: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern === '*') return true;
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        return intent.startsWith(prefix + '.') || intent === prefix;
      }
      return intent === pattern;
    });
  }

  /**
   * Get required trust level for an intent
   * 
   * @param intent - Intent to check
   * @returns Minimum required trust level
   */
  getRequiredTrust(intent: string): TrustLevel {
    // Sensitive intents require higher trust
    const sensitiveIntents = [
      'scheduling.create',
      'scheduling.modify',
      'files.write',
      'system.execute'
    ];
    
    const intentPrefix = intent.split('.')[0];
    if (sensitiveIntents.some(i => i.split('.')[0] === intentPrefix)) {
      return 'trusted';
    }
    
    return 'friend';
  }
}