/**
 * Capabilities Module
 * 
 * Defines standard capabilities that an AI agent can support.
 * 
 * @module application/capabilities
 */

import { z } from 'zod';

// ============================================
// Capability Schema
// ============================================

export const ActionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parameters: z.record(z.unknown()).optional()
});

export type Action = z.infer<typeof ActionSchema>;

export const CapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  actions: z.array(ActionSchema).min(1)
});

export type Capability = z.infer<typeof CapabilitySchema>;

// ============================================
// Standard Capabilities
// ============================================

export const MESSAGING_CAPABILITY: Capability = {
  name: 'messaging',
  description: 'Send and receive messages from other agents',
  actions: [
    { name: 'messaging.send', description: 'Send a message to another agent' },
    { name: 'messaging.receive', description: 'Receive a message from another agent' },
    { name: 'messaging.broadcast', description: 'Broadcast a message to multiple agents' }
  ]
};

export const SCHEDULING_CAPABILITY: Capability = {
  name: 'scheduling',
  description: 'Manage calendar and scheduling tasks',
  actions: [
    { name: 'scheduling.create', description: 'Create a new event or reminder' },
    { name: 'scheduling.read', description: 'Read calendar events' },
    { name: 'scheduling.update', description: 'Update an existing event' },
    { name: 'scheduling.delete', description: 'Delete an event' },
    { name: 'scheduling.query', description: 'Query available times' }
  ]
};

export const FILES_CAPABILITY: Capability = {
  name: 'files',
  description: 'File system operations',
  actions: [
    { name: 'files.read', description: 'Read file contents' },
    { name: 'files.write', description: 'Write content to a file' },
    { name: 'files.list', description: 'List files in a directory' },
    { name: 'files.delete', description: 'Delete a file' }
  ]
};

export const WEB_CAPABILITY: Capability = {
  name: 'web',
  description: 'Web browsing and HTTP operations',
  actions: [
    { name: 'web.fetch', description: 'Fetch content from a URL' },
    { name: 'web.search', description: 'Search the web' },
    { name: 'web.scrape', description: 'Scrape content from a webpage' }
  ]
};

export const SYSTEM_CAPABILITY: Capability = {
  name: 'system',
  description: 'System-level operations',
  actions: [
    { name: 'system.execute', description: 'Execute a system command' },
    { name: 'system.status', description: 'Get system status' }
  ]
};

export const HANDSHAKE_CAPABILITY: Capability = {
  name: 'handshake',
  description: 'Agent handshake and discovery',
  actions: [
    { name: 'handshake.hello', description: 'Initiate connection with another agent' },
    { name: 'handshake.ack', description: 'Acknowledge connection request' }
  ]
};

// ============================================
// Default Capabilities
// ============================================

export const DEFAULT_CAPABILITIES: Capability[] = [
  MESSAGING_CAPABILITY,
  HANDSHAKE_CAPABILITY
];

export const ALL_CAPABILITIES: Capability[] = [
  MESSAGING_CAPABILITY,
  SCHEDULING_CAPABILITY,
  FILES_CAPABILITY,
  WEB_CAPABILITY,
  SYSTEM_CAPABILITY,
  HANDSHAKE_CAPABILITY
];

// ============================================
// Helper Functions
// ============================================

export function getCapability(name: string): Capability | undefined {
  return ALL_CAPABILITIES.find(c => c.name === name);
}

export function getActionsForCapability(capabilityName: string): Action[] {
  const capability = getCapability(capabilityName);
  return capability?.actions || [];
}

export function hasAction(capabilityName: string, actionName: string): boolean {
  const actions = getActionsForCapability(capabilityName);
  return actions.some(a => a.name === actionName);
}

export function getAllActionNames(): string[] {
  return ALL_CAPABILITIES.flatMap(c => c.actions.map(a => a.name));
}

export function isValidAction(actionName: string): boolean {
  return getAllActionNames().includes(actionName);
}