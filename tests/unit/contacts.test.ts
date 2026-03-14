import { describe, it, expect, beforeEach } from 'vitest';
import { compareTrust, meetsMinimum, DEFAULT_TRUST_LEVEL } from '../../src/contacts/trust.js';
import { PermissionGuard, PermissionResult } from '../../src/contacts/permissions.js';

describe('Trust Module', () => {
  it('should have correct trust hierarchy', () => {
    expect(compareTrust('trusted', 'friend')).toBeGreaterThan(0);
    expect(compareTrust('blocked', 'unknown')).toBeLessThan(0);
    expect(compareTrust('friend', 'friend')).toBe(0);
  });

  it('should check minimum trust correctly', () => {
    expect(meetsMinimum('trusted', 'friend')).toBe(true);
    expect(meetsMinimum('friend', 'trusted')).toBe(false);
  });

  it('should have correct default trust level', () => {
    expect(DEFAULT_TRUST_LEVEL).toBe('ask');
  });

  it('should compare all trust levels correctly', () => {
    // blocked < unknown < ask < friend < trusted
    expect(compareTrust('blocked', 'unknown')).toBeLessThan(0);
    expect(compareTrust('unknown', 'ask')).toBeLessThan(0);
    expect(compareTrust('ask', 'friend')).toBeLessThan(0);
    expect(compareTrust('friend', 'trusted')).toBeLessThan(0);
    
    // Reverse comparisons
    expect(compareTrust('trusted', 'blocked')).toBeGreaterThan(0);
    expect(compareTrust('trusted', 'unknown')).toBeGreaterThan(0);
    expect(compareTrust('friend', 'ask')).toBeGreaterThan(0);
  });
});

describe('PermissionGuard', () => {
  let guard: PermissionGuard;

  beforeEach(() => {
    guard = new PermissionGuard();
  });

  it('should deny blocked contacts', () => {
    const result = guard.check('blocked', 'messaging.send');
    expect(result).toBe(PermissionResult.DENIED);
  });

  it('should require approval for unknown contacts', () => {
    const result = guard.check('unknown', 'messaging.send');
    expect(result).toBe(PermissionResult.REQUIRE_APPROVAL);
  });

  it('should require approval for ask trust level', () => {
    const result = guard.check('ask', 'messaging.send');
    expect(result).toBe(PermissionResult.REQUIRE_APPROVAL);
  });

  it('should require approval for friends without auto-accept', () => {
    const result = guard.check('friend', 'messaging.send');
    expect(result).toBe(PermissionResult.REQUIRE_APPROVAL);
  });

  it('should allow trusted contacts', () => {
    const result = guard.check('trusted', 'messaging.send');
    expect(result).toBe(PermissionResult.ALLOWED);
  });

  it('should match wildcard patterns', () => {
    const guard = new PermissionGuard();
    const result = guard.check('friend', 'messaging.send', ['messaging.*']);
    expect(result).toBe(PermissionResult.ALLOWED);
  });

  it('should match exact patterns', () => {
    const result = guard.check('friend', 'messaging.send', ['messaging.send']);
    expect(result).toBe(PermissionResult.ALLOWED);
  });

  it('should not match partial patterns', () => {
    const result = guard.check('friend', 'messaging.receive', ['messaging.send']);
    expect(result).toBe(PermissionResult.REQUIRE_APPROVAL);
  });

  it('should match global wildcard for non-blocked contacts', () => {
    const result = guard.check('friend', 'any.action', ['*']);
    expect(result).toBe(PermissionResult.ALLOWED);
  });

  it('should always deny blocked contacts even with global wildcard', () => {
    // Security: blocked contacts are always denied, regardless of auto-accept patterns
    const result = guard.check('blocked', 'any.action', ['*']);
    expect(result).toBe(PermissionResult.DENIED);
  });

  it('should get required trust for sensitive intents', () => {
    expect(guard.getRequiredTrust('scheduling.create')).toBe('trusted');
    expect(guard.getRequiredTrust('files.write')).toBe('trusted');
    expect(guard.getRequiredTrust('messaging.send')).toBe('friend');
  });
});