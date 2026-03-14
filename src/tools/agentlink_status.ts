/**
 * agentlink_status Tool
 * 
 * OpenClaw tool for checking the AgentLink node status.
 * 
 * @module tools/agentlink_status
 */

import { z } from 'zod';
import { OpenClawBridge, NodeStatus } from '../bridge/openclaw-bridge.js';

// ============================================
// Tool Schema
// ============================================

/**
 * Parameters for the agentlink_status tool
 */
export const AgentlinkStatusParamsSchema = z.object({}).describe('No parameters required');

export type AgentlinkStatusParams = z.infer<typeof AgentlinkStatusParamsSchema>;

/**
 * Result from the agentlink_status tool
 */
export interface AgentlinkStatusResult {
  /** Whether the node is running */
  running: boolean;
  /** Node's DID */
  did: string | null;
  /** Number of contacts */
  contacts: number;
  /** Connection endpoints */
  endpoints: string[];
  /** Status message */
  message: string;
}

// ============================================
// Tool Definition
// ============================================

/**
 * Context provided to the tool during execution
 */
export interface AgentlinkStatusContext {
  /** The OpenClaw bridge instance */
  bridge: OpenClawBridge;
}

/**
 * agentlink_status tool definition
 * 
 * Allows the LLM agent to check the current status of the
 * AgentLink P2P node.
 * 
 * @example
 * ```typescript
 * const result = await agentlinkStatusTool.execute({}, { bridge });
 * console.log(result.message);
 * // "Node is running with DID did:key:z6Mk... and 5 contacts"
 * ```
 */
export const agentlinkStatusTool = {
  /** Tool name */
  name: 'agentlink_status',
  
  /** Tool description */
  description: 'Get the current status of the AgentLink P2P node. Shows if the node is running, your DID, number of contacts, and connection endpoints.',
  
  /** Parameter schema */
  parameters: AgentlinkStatusParamsSchema,
  
  /**
   * Execute the tool
   * 
   * @param params - Tool parameters (empty)
   * @param context - Execution context with bridge
   * @returns Node status
   */
  execute: async (
    params: AgentlinkStatusParams,
    context: AgentlinkStatusContext
  ): Promise<AgentlinkStatusResult> => {
    const { bridge } = context;
    
    try {
      const status = bridge.getStatus();
      
      const message = formatStatusMessage(status);
      
      return {
        running: status.running,
        did: status.did,
        contacts: status.contacts,
        endpoints: status.endpoints,
        message
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        running: false,
        did: null,
        contacts: 0,
        endpoints: [],
        message: `Error getting status: ${errorMessage}`
      };
    }
  }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Format a human-readable status message
 */
function formatStatusMessage(status: NodeStatus): string {
  if (!status.running) {
    return 'AgentLink node is not running. Use agentlink_start to start the node.';
  }
  
  const parts: string[] = [];
  
  parts.push('Node is running');
  
  if (status.did) {
    parts.push(`with DID ${status.did}`);
  }
  
  if (status.contacts > 0) {
    parts.push(`and ${status.contacts} contact${status.contacts === 1 ? '' : 's'}`);
  }
  
  let message = parts.join(' ') + '.';
  
  if (status.endpoints.length > 0) {
    message += `\n\nListening on:\n${status.endpoints.map(e => `  - ${e}`).join('\n')}`;
  }
  
  return message;
}

// ============================================
// Tool Export
// ============================================

export default agentlinkStatusTool;