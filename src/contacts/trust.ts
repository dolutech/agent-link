/**
 * Trust Level Definitions
 * 
 * Defines the trust hierarchy for agent-to-agent relationships.
 * 
 * @module contacts/trust
 */

/**
 * Trust levels for contacts
 * 
 * - blocked: Explicitly blocked, reject all messages
 * - unknown: New/unverified agent
 * - ask: Require human approval for actions
 * - friend: Known agent, limited auto-accept
 * - trusted: Full trust, auto-accept most intents
 */
export type TrustLevel = 'blocked' | 'unknown' | 'ask' | 'friend' | 'trusted';

/**
 * Trust level hierarchy (higher = more trusted)
 */
export const TRUST_HIERARCHY: Record<TrustLevel, number> = {
  blocked: 0,
  unknown: 1,
  ask: 2,
  friend: 3,
  trusted: 4
};

/**
 * Default trust level for new contacts
 */
export const DEFAULT_TRUST_LEVEL: TrustLevel = 'ask';

/**
 * Compares two trust levels
 * 
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareTrust(a: TrustLevel, b: TrustLevel): number {
  return TRUST_HIERARCHY[a] - TRUST_HIERARCHY[b];
}

/**
 * Checks if a trust level meets a minimum requirement
 */
export function meetsMinimum(trust: TrustLevel, minimum: TrustLevel): boolean {
  return TRUST_HIERARCHY[trust] >= TRUST_HIERARCHY[minimum];
}