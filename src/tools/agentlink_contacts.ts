/**
 * agentlink_contacts Tool
 * 
 * OpenClaw tool for managing contacts in the AgentLink network.
 * 
 * @module tools/agentlink_contacts
 */

import { z } from 'zod';
import { OpenClawBridge } from '../bridge/openclaw-bridge.js';
import { TrustLevel } from '../contacts/trust.js';

// ============================================
// Tool Schema
// ============================================

/**
 * Actions available for contact management
 */
export const ContactActionSchema = z.enum([
  'list',
  'add',
  'remove',
  'trust',
  'info'
]);

export type ContactAction = z.infer<typeof ContactActionSchema>;

/**
 * Parameters for the agentlink_contacts tool
 */
export const AgentlinkContactsParamsSchema = z.object({
  /** Action to perform */
  action: ContactActionSchema.describe('Action to perform: list, add, remove, trust, or info'),
  /** DID for add/remove/trust/info actions */
  did: z.string().optional().describe('DID for add/remove/trust/info actions'),
  /** Name for add action or to identify contact */
  name: z.string().optional().describe('Name for the contact'),
  /** Trust level for trust action */
  trustLevel: z.enum(['blocked', 'unknown', 'ask', 'friend', 'trusted']).optional()
    .describe('Trust level: blocked, unknown, ask, friend, or trusted'),
  /** Agent card JSON for add action */
  agentCard: z.record(z.unknown()).optional().describe('Agent card JSON object for add action'),
  /** Multiaddresses for add action */
  multiaddrs: z.array(z.string()).optional().describe('Connection addresses for add action')
});

export type AgentlinkContactsParams = z.infer<typeof AgentlinkContactsParamsSchema>;

/**
 * Result from the agentlink_contacts tool
 */
export interface AgentlinkContactsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Result message */
  message: string;
  /** Contacts data (for list action) */
  contacts?: Array<{
    did: string;
    name: string;
    trustLevel: TrustLevel;
    capabilities?: string[];
  }>;
  /** Contact info (for info action) */
  contact?: {
    did: string;
    name: string;
    trustLevel: TrustLevel;
    capabilities?: string[];
    multiaddrs: string[];
    addedAt: string;
  };
}

// ============================================
// Tool Definition
// ============================================

/**
 * Context provided to the tool during execution
 */
export interface AgentlinkContactsContext {
  /** The OpenClaw bridge instance */
  bridge: OpenClawBridge;
}

/**
 * agentlink_contacts tool definition
 * 
 * Allows the LLM agent to manage contacts in the AgentLink network.
 * 
 * @example
 * ```typescript
 * // List contacts
 * await agentlinkContactsTool.execute({ action: 'list' }, { bridge });
 * 
 * // Set trust level
 * await agentlinkContactsTool.execute({
 *   action: 'trust',
 *   did: 'did:key:z6Mk...',
 *   trustLevel: 'friend'
 * }, { bridge });
 * ```
 */
export const agentlinkContactsTool = {
  /** Tool name */
  name: 'agentlink_contacts',
  
  /** Tool description */
  description: 'List, add, remove, or manage contacts in the AgentLink network. Use this to see available agents, add new contacts, or set trust levels.',
  
  /** Parameter schema */
  parameters: AgentlinkContactsParamsSchema,
  
  /**
   * Execute the tool
   * 
   * @param params - Tool parameters
   * @param context - Execution context with bridge
   * @returns Operation result
   */
  execute: async (
    params: AgentlinkContactsParams,
    context: AgentlinkContactsContext
  ): Promise<AgentlinkContactsResult> => {
    const { bridge } = context;
    const { action, did, name, trustLevel, agentCard, multiaddrs } = params;
    
    try {
      switch (action) {
        case 'list':
          return handleListAction(bridge);
        
        case 'add':
          return handleAddAction(bridge, did, name, agentCard, multiaddrs);
        
        case 'remove':
          return handleRemoveAction(bridge, did);
        
        case 'trust':
          return handleTrustAction(bridge, did, trustLevel);
        
        case 'info':
          return handleInfoAction(bridge, did, name);
        
        default:
          return {
            success: false,
            message: `Unknown action: ${action}`
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error: ${errorMessage}`
      };
    }
  }
};

// ============================================
// Action Handlers
// ============================================

/**
 * Handle list action
 */
function handleListAction(bridge: OpenClawBridge): AgentlinkContactsResult {
  const contacts = bridge.getContacts();
  
  return {
    success: true,
    message: `Found ${contacts.length} contact(s)`,
    contacts: contacts.map(c => ({
      did: c.did,
      name: c.name,
      trustLevel: c.trustLevel,
      capabilities: c.agentCard?.capabilities
    }))
  };
}

/**
 * Handle add action
 */
async function handleAddAction(
  bridge: OpenClawBridge,
  did?: string,
  name?: string,
  agentCard?: Record<string, unknown>,
  multiaddrs?: string[]
): Promise<AgentlinkContactsResult> {
  if (!agentCard) {
    return {
      success: false,
      message: 'Agent card is required for add action. Provide agentCard parameter.'
    };
  }
  
  // Validate agent card has required fields
  if (!agentCard.did || typeof agentCard.did !== 'string') {
    return {
      success: false,
      message: 'Agent card must include a valid "did" field'
    };
  }
  
  if (!agentCard.name || typeof agentCard.name !== 'string') {
    return {
      success: false,
      message: 'Agent card must include a valid "name" field'
    };
  }
  
  try {
    const card = agentCard as any; // Cast to any for bridge compatibility
    await bridge.addContact(card, multiaddrs || []);
    
    return {
      success: true,
      message: `Added contact: ${card.name} (${card.did})`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to add contact: ${errorMessage}`
    };
  }
}

/**
 * Handle remove action
 */
async function handleRemoveAction(
  bridge: OpenClawBridge,
  did?: string
): Promise<AgentlinkContactsResult> {
  if (!did) {
    return {
      success: false,
      message: 'DID is required for remove action'
    };
  }
  
  const contact = bridge.getContact(did);
  if (!contact) {
    return {
      success: false,
      message: `Contact not found: ${did}`
    };
  }
  
  const removed = await bridge.removeContact(did);
  
  if (removed) {
    return {
      success: true,
      message: `Removed contact: ${contact.name} (${did})`
    };
  }
  
  return {
    success: false,
    message: 'Failed to remove contact'
  };
}

/**
 * Handle trust action
 */
async function handleTrustAction(
  bridge: OpenClawBridge,
  did?: string,
  trustLevel?: TrustLevel
): Promise<AgentlinkContactsResult> {
  if (!did) {
    return {
      success: false,
      message: 'DID is required for trust action'
    };
  }
  
  if (!trustLevel) {
    return {
      success: false,
      message: 'Trust level is required. Use: blocked, unknown, ask, friend, or trusted'
    };
  }
  
  const contact = bridge.getContact(did);
  if (!contact) {
    return {
      success: false,
      message: `Contact not found: ${did}`
    };
  }
  
  const updated = await bridge.setTrustLevel(did, trustLevel);
  
  if (updated) {
    return {
      success: true,
      message: `Set trust level for ${contact.name} to "${trustLevel}"`
    };
  }
  
  return {
    success: false,
    message: 'Failed to update trust level'
  };
}

/**
 * Handle info action
 */
function handleInfoAction(
  bridge: OpenClawBridge,
  did?: string,
  name?: string
): AgentlinkContactsResult {
  let contact = null;
  
  if (did) {
    contact = bridge.getContact(did);
  } else if (name) {
    const contacts = bridge.getContacts();
    contact = contacts.find(c => 
      c.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }
  
  if (!contact) {
    return {
      success: false,
      message: did 
        ? `Contact not found with DID: ${did}`
        : name
          ? `Contact not found with name: ${name}`
          : 'Provide either did or name to get contact info'
    };
  }
  
  return {
    success: true,
    message: `Contact info for ${contact.name}`,
    contact: {
      did: contact.did,
      name: contact.name,
      trustLevel: contact.trustLevel,
      capabilities: contact.agentCard?.capabilities,
      multiaddrs: contact.multiaddrs,
      addedAt: contact.addedAt
    }
  };
}

// ============================================
// Tool Export
// ============================================

export default agentlinkContactsTool;