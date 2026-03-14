/**
 * agentlink_card Tool
 * 
 * OpenClaw tool for getting and exporting the Agent Card.
 * 
 * @module tools/agentlink_card
 */

import { z } from 'zod';
import { OpenClawBridge } from '../bridge/openclaw-bridge.js';
import { AgentCard } from '../agent-card/card.js';

// ============================================
// Tool Schema
// ============================================

/**
 * Output format options
 */
export const CardFormatSchema = z.enum(['json', 'link', 'qr']).describe(
  'Output format: json (full card), link (shareable link), or qr (QR code data)'
);

export type CardFormat = z.infer<typeof CardFormatSchema>;

/**
 * Parameters for the agentlink_card tool
 */
export const AgentlinkCardParamsSchema = z.object({
  /** Output format */
  format: CardFormatSchema.optional().default('json')
    .describe('Output format: json (full card), link (shareable link), or qr (QR code data)')
});

export type AgentlinkCardParams = z.infer<typeof AgentlinkCardParamsSchema>;

/**
 * Result from the agentlink_card tool
 */
export interface AgentlinkCardResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Result message */
  message: string;
  /** Agent card (JSON format) */
  card?: AgentCard;
  /** Shareable link (link format) */
  link?: string;
  /** QR code data URL (qr format) */
  qrData?: string;
}

// ============================================
// Tool Definition
// ============================================

/**
 * Context provided to the tool during execution
 */
export interface AgentlinkCardContext {
  /** The OpenClaw bridge instance */
  bridge: OpenClawBridge;
}

/**
 * agentlink_card tool definition
 * 
 * Allows the LLM agent to get or export its Agent Card,
 * which can be shared with other agents for connection.
 * 
 * @example
 * ```typescript
 * // Get JSON card
 * const result = await agentlinkCardTool.execute({ format: 'json' }, { bridge });
 * console.log(result.card);
 * 
 * // Get shareable link
 * const linkResult = await agentlinkCardTool.execute({ format: 'link' }, { bridge });
 * console.log('Share this link:', linkResult.link);
 * ```
 */
export const agentlinkCardTool = {
  /** Tool name */
  name: 'agentlink_card',
  
  /** Tool description */
  description: 'Get or export your Agent Card. This card contains your DID, name, capabilities, and connection endpoints. Share it with other agents to allow them to connect with you.',
  
  /** Parameter schema */
  parameters: AgentlinkCardParamsSchema,
  
  /**
   * Execute the tool
   * 
   * @param params - Tool parameters
   * @param context - Execution context with bridge
   * @returns Card data in requested format
   */
  execute: async (
    params: AgentlinkCardParams,
    context: AgentlinkCardContext
  ): Promise<AgentlinkCardResult> => {
    const { bridge } = context;
    const { format = 'json' } = params;
    
    try {
      const card = bridge.getAgentCard();
      
      if (!card) {
        return {
          success: false,
          message: 'Agent Card not available. The node may not be running or initialized.'
        };
      }
      
      switch (format) {
        case 'json':
          return handleJsonFormat(card);
        
        case 'link':
          return handleLinkFormat(card);
        
        case 'qr':
          return handleQrFormat(card);
        
        default:
          return {
            success: false,
            message: `Unknown format: ${format}`
          };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error getting Agent Card: ${errorMessage}`
      };
    }
  }
};

// ============================================
// Format Handlers
// ============================================

/**
 * Handle JSON format output
 */
function handleJsonFormat(card: AgentCard): AgentlinkCardResult {
  return {
    success: true,
    message: `Agent Card for ${card.name}:\n${JSON.stringify(card, null, 2)}`,
    card
  };
}

/**
 * Handle link format output
 * 
 * Creates a shareable link with encoded card data
 */
function handleLinkFormat(card: AgentCard): AgentlinkCardResult {
  // Encode card as base64 for URL
  const cardJson = JSON.stringify(card);
  const cardBase64 = Buffer.from(cardJson).toString('base64url');
  
  // Create agentlink:// URI
  const link = `agentlink://card?v=0.1&data=${cardBase64}`;
  
  return {
    success: true,
    message: `Share this link with other agents:\n${link}`,
    link,
    card
  };
}

/**
 * Handle QR format output
 * 
 * Creates data for QR code generation
 * Note: This returns the data URL format for QR rendering
 */
function handleQrFormat(card: AgentCard): AgentlinkCardResult {
  // For QR codes, we use a compact format
  const qrData = {
    type: 'agentlink-card',
    v: '0.1',
    did: card.did,
    name: card.name,
    capabilities: card.capabilities,
    endpoint: card.endpoints.agentlink
  };
  
  // Return the data that can be rendered as QR
  const qrString = JSON.stringify(qrData);
  const qrDataBase64 = Buffer.from(qrString).toString('base64');
  
  return {
    success: true,
    message: `QR Code data for ${card.name}:\n${qrString}`,
    qrData: qrDataBase64,
    card
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Parse an Agent Card from a shareable link
 */
export function parseCardFromLink(link: string): AgentCard | null {
  try {
    if (!link.startsWith('agentlink://card?')) {
      return null;
    }
    
    const url = new URL(link.replace('agentlink://', 'https://'));
    const data = url.searchParams.get('data');
    
    if (!data) {
      return null;
    }
    
    const cardJson = Buffer.from(data, 'base64url').toString('utf-8');
    return JSON.parse(cardJson) as AgentCard;
    
  } catch {
    return null;
  }
}

/**
 * Validate an Agent Card structure
 */
export function validateCard(card: unknown): { valid: boolean; errors?: string[] } {
  if (!card || typeof card !== 'object') {
    return { valid: false, errors: ['Card must be an object'] };
  }
  
  const c = card as Record<string, unknown>;
  const errors: string[] = [];
  
  if (c.agentcard !== '0.1.0') {
    errors.push('Invalid or missing agentcard version');
  }
  
  if (typeof c.did !== 'string' || !c.did.startsWith('did:key:')) {
    errors.push('Invalid or missing DID');
  }
  
  if (typeof c.name !== 'string' || c.name.length === 0) {
    errors.push('Invalid or missing name');
  }
  
  if (!Array.isArray(c.capabilities) || c.capabilities.length === 0) {
    errors.push('Invalid or missing capabilities');
  }
  
  if (!c.endpoints || typeof c.endpoints !== 'object') {
    errors.push('Invalid or missing endpoints');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ============================================
// Tool Export
// ============================================

export default agentlinkCardTool;