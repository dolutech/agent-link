/**
 * Application Layer Tests
 * 
 * Tests for capabilities, threads, and intent processor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CapabilitySchema,
  ActionSchema,
  MESSAGING_CAPABILITY,
  SCHEDULING_CAPABILITY,
  DEFAULT_CAPABILITIES,
  ALL_CAPABILITIES,
  getCapability,
  getActionsForCapability,
  hasAction,
  getAllActionNames,
  isValidAction
} from '../../src/application/capabilities.js';

describe('Capabilities', () => {
  describe('Schema Validation', () => {
    it('should validate a valid action', () => {
      const action = {
        name: 'test.action',
        description: 'Test action'
      };
      
      const result = ActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
    
    it('should validate a valid capability', () => {
      const capability = {
        name: 'test',
        actions: [
          { name: 'test.action1' },
          { name: 'test.action2' }
        ]
      };
      
      const result = CapabilitySchema.safeParse(capability);
      expect(result.success).toBe(true);
    });
    
    it('should reject capability without actions', () => {
      const capability = {
        name: 'test',
        actions: []
      };
      
      const result = CapabilitySchema.safeParse(capability);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Standard Capabilities', () => {
    it('should have messaging capability', () => {
      expect(MESSAGING_CAPABILITY.name).toBe('messaging');
      expect(MESSAGING_CAPABILITY.actions.length).toBeGreaterThan(0);
    });
    
    it('should have scheduling capability', () => {
      expect(SCHEDULING_CAPABILITY.name).toBe('scheduling');
      expect(SCHEDULING_CAPABILITY.actions).toContainEqual(
        expect.objectContaining({ name: 'scheduling.create' })
      );
    });
    
    it('should have default capabilities', () => {
      expect(DEFAULT_CAPABILITIES.length).toBe(2);
      expect(DEFAULT_CAPABILITIES[0].name).toBe('messaging');
    });
    
    it('should have all capabilities', () => {
      expect(ALL_CAPABILITIES.length).toBe(6);
    });
  });
  
  describe('Helper Functions', () => {
    it('should get capability by name', () => {
      const capability = getCapability('messaging');
      expect(capability?.name).toBe('messaging');
    });
    
    it('should return undefined for unknown capability', () => {
      const capability = getCapability('unknown');
      expect(capability).toBeUndefined();
    });
    
    it('should get actions for capability', () => {
      const actions = getActionsForCapability('messaging');
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].name).toContain('messaging.');
    });
    
    it('should check if action exists', () => {
      expect(hasAction('messaging', 'messaging.send')).toBe(true);
      expect(hasAction('messaging', 'unknown.action')).toBe(false);
    });
    
    it('should get all action names', () => {
      const names = getAllActionNames();
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('messaging.send');
    });
    
    it('should validate action names', () => {
      expect(isValidAction('messaging.send')).toBe(true);
      expect(isValidAction('scheduling.create')).toBe(true);
      expect(isValidAction('unknown.action')).toBe(false);
    });
  });
});