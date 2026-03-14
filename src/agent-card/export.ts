/**
 * Agent Card Export Utilities
 * 
 * Provides methods to export Agent Cards in various formats.
 * 
 * @module agent-card/export
 */

import { AgentCard } from './card.js';

/**
 * Exports an Agent Card as a JSON string
 * 
 * @param card - Agent Card to export
 * @returns JSON string
 */
export function toJson(card: AgentCard): string {
  return JSON.stringify(card, null, 2);
}

/**
 * Exports an Agent Card as a shareable link
 * 
 * @param card - Agent Card to export
 * @returns agentlink:// URL
 * 
 * @example
 * const link = toLink(card);
 * // Returns: agentlink://did:key:z6Mk...?name=My%20Agent&capabilities=messaging,scheduling
 */
export function toLink(card: AgentCard): string {
  const params = new URLSearchParams({
    name: card.name,
    capabilities: card.capabilities.join(',')
  });
  
  if (card.description) {
    params.set('description', card.description);
  }
  
  return `agentlink://${card.did}?${params.toString()}`;
}

/**
 * Parses an agentlink:// URL into an Agent Card
 * 
 * @param link - agentlink:// URL
 * @returns Partial Agent Card (without endpoints)
 */
export function fromLink(link: string): Partial<AgentCard> {
  if (!link.startsWith('agentlink://')) {
    throw new Error('Invalid agentlink URL');
  }
  
  // Parse manually since URL doesn't support custom schemes
  const afterProtocol = link.slice('agentlink://'.length);
  const [didPart, queryPart] = afterProtocol.split('?');
  const did = decodeURIComponent(didPart ?? '');
  
  const params = new URLSearchParams(queryPart || '');
  
  return {
    agentcard: '0.1.0',
    did,
    name: params.get('name') || 'Unknown Agent',
    description: params.get('description') ?? undefined,
    capabilities: (params.get('capabilities') ?? '').split(',').filter(Boolean)
  };
}