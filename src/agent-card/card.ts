/**
 * Agent Card Module
 * 
 * Defines and validates Agent Cards - the "business card" of AI agents.
 * 
 * @module agent-card/card
 */

import { z } from 'zod';

// ============================================
// Agent Card Schema
// ============================================

/**
 * Endpoint configuration for agent communication
 */
export const EndpointsSchema = z.object({
  /** Primary AgentLink P2P endpoint */
  agentlink: z.string().min(1),
  /** Optional public endpoint for discovery */
  agentlink_public: z.string().optional()
});

export type Endpoints = z.infer<typeof EndpointsSchema>;

/**
 * Agent Card - the identity card of an AI agent
 * 
 * Contains all information needed to contact and interact with an agent.
 */
export const AgentCardSchema = z.object({
  /** Protocol identifier - always 'agentcard' */
  agentcard: z.literal('0.1.0'),
  
  /** Agent's DID */
  did: z.string().startsWith('did:key:'),
  
  /** Human-readable name */
  name: z.string().min(1).max(100),
  
  /** Optional description of the agent's purpose */
  description: z.string().max(500).optional(),
  
  /** Capabilities this agent supports */
  capabilities: z.array(z.string()).min(1),
  
  /** Communication endpoints */
  endpoints: EndpointsSchema
});

export type AgentCard = z.infer<typeof AgentCardSchema>;

// ============================================
// Creation & Validation
// ============================================

export interface CreateAgentCardOptions {
  did: string;
  name: string;
  description?: string;
  capabilities: string[];
  endpoints: Endpoints;
}

/**
 * Creates a new Agent Card
 * 
 * @param options - Card creation options
 * @returns Validated Agent Card
 * 
 * @example
 * const card = createAgentCard({
 *   did: 'did:key:z6Mk...',
 *   name: 'My Assistant',
 *   capabilities: ['messaging', 'scheduling'],
 *   endpoints: { agentlink: '/ip4/0.0.0.0/tcp/9100' }
 * });
 */
export function createAgentCard(options: CreateAgentCardOptions): AgentCard {
  const card: AgentCard = {
    agentcard: '0.1.0',
    did: options.did,
    name: options.name,
    description: options.description,
    capabilities: options.capabilities,
    endpoints: options.endpoints
  };
  
  return AgentCardSchema.parse(card);
}

/**
 * Validates an Agent Card
 * 
 * @param card - Card to validate (can be unknown input)
 * @returns Validation result with errors if any
 */
export function validateAgentCard(card: unknown): { 
  valid: boolean; 
  errors?: string[];
  card?: AgentCard;
} {
  const result = AgentCardSchema.safeParse(card);
  
  if (result.success) {
    return { valid: true, card: result.data };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  };
}

/**
 * Default capabilities for a basic agent
 */
export const DEFAULT_CAPABILITIES = [
  'messaging',
  'handshake'
] as const;