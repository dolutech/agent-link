/**
 * Agent Card Import Utilities
 * 
 * Provides methods to import Agent Cards from various sources.
 * 
 * @module agent-card/import
 */

import { AgentCard, validateAgentCard } from './card.js';
import { fromLink } from './export.js';

/**
 * Import an Agent Card from JSON string
 * 
 * @param json - JSON string representing an Agent Card
 * @returns Parsed and validated Agent Card
 * @throws Error if validation fails
 * 
 * @example
 * const card = fromJson('{"agentcard":"0.1.0","did":"did:key:z6Mk..."}');
 */
export function fromJson(json: string): AgentCard {
  let data: unknown;
  
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }
  
  const result = validateAgentCard(data);
  
  if (!result.valid || !result.card) {
    throw new Error(`Invalid Agent Card: ${result.errors?.join(', ')}`);
  }
  
  return result.card;
}

/**
 * Import an Agent Card from a JSON object
 * 
 * @param data - Object representing an Agent Card
 * @returns Validated Agent Card
 * @throws Error if validation fails
 */
export function fromObject(data: unknown): AgentCard {
  const result = validateAgentCard(data);
  
  if (!result.valid || !result.card) {
    throw new Error(`Invalid Agent Card: ${result.errors?.join(', ')}`);
  }
  
  return result.card;
}

/**
 * Import an Agent Card from a shareable link
 * 
 * @param link - agentlink:// URL
 * @returns Partial Agent Card (may need endpoints filled in)
 */
export function importFromLink(link: string): Partial<AgentCard> {
  return fromLink(link);
}

/**
 * Safely parse an Agent Card without throwing
 * 
 * @param data - Unknown data to parse
 * @returns Result with card or errors
 */
export function safeParseAgentCard(data: unknown): {
  success: boolean;
  card?: AgentCard;
  errors?: string[];
} {
  const result = validateAgentCard(data);
  
  if (result.valid && result.card) {
    return { success: true, card: result.card };
  }
  
  return { success: false, errors: result.errors };
}

/**
 * Merge partial Agent Card data with defaults
 * 
 * @param partial - Partial Agent Card data
 * @param defaults - Default values
 * @returns Complete Agent Card
 */
export function mergeWithDefaults(
  partial: Partial<AgentCard>,
  defaults: {
    did: string;
    endpoints: { agentlink: string };
  }
): AgentCard {
  return {
    agentcard: '0.1.0',
    did: partial.did || defaults.did,
    name: partial.name || 'Unknown Agent',
    description: partial.description,
    capabilities: partial.capabilities || ['messaging', 'handshake'],
    endpoints: partial.endpoints || defaults.endpoints
  };
}