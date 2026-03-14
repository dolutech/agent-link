/**
 * agentlink_send Tool
 * 
 * OpenClaw tool for sending messages to other agents via P2P.
 * 
 * @module tools/agentlink_send
 */

import { z } from 'zod';
import { OpenClawBridge } from '../bridge/openclaw-bridge.js';

// ============================================
// Tool Schema
// ============================================

/**
 * Parameters for the agentlink_send tool
 */
export const AgentlinkSendParamsSchema = z.object({
  /** The DID or name of the recipient agent */
  to: z.string().describe('The DID or name of the recipient agent'),
  /** The intent/action to request */
  intent: z.string().describe('The intent/action to request (e.g., "greeting", "query", "task")'),
  /** The message content */
  message: z.string().describe('The message content to send'),
  /** Optional structured data */
  structured: z.record(z.unknown()).optional().describe('Optional structured data (JSON object)')
});

export type AgentlinkSendParams = z.infer<typeof AgentlinkSendParamsSchema>;

/**
 * Result from the agentlink_send tool
 */
export interface AgentlinkSendResult {
  /** Whether the send was successful */
  success: boolean;
  /** Success or error message */
  message: string;
  /** Recipient DID */
  to?: string;
}

// ============================================
// Tool Definition
// ============================================

/**
 * Context provided to the tool during execution
 */
export interface AgentlinkSendContext {
  /** The OpenClaw bridge instance */
  bridge: OpenClawBridge;
}

/**
 * agentlink_send tool definition
 * 
 * Allows the LLM agent to send messages to other AI agents
 * via the AgentLink P2P network.
 * 
 * @example
 * ```typescript
 * // In OpenClaw agent setup:
 * agent.registerTool({
 *   name: agentlinkSendTool.name,
 *   description: agentlinkSendTool.description,
 *   parameters: agentlinkSendTool.parameters,
 *   execute: (params) => agentlinkSendTool.execute(params, { bridge })
 * });
 * ```
 */
export const agentlinkSendTool = {
  /** Tool name */
  name: 'agentlink_send',
  
  /** Tool description */
  description: 'Send a message to another AI agent via P2P network. Use this to communicate with other agents, request information, or delegate tasks.',
  
  /** Parameter schema */
  parameters: AgentlinkSendParamsSchema,
  
  /**
   * Execute the tool
   * 
   * @param params - Tool parameters
   * @param context - Execution context with bridge
   * @returns Send result
   */
  execute: async (
    params: AgentlinkSendParams,
    context: AgentlinkSendContext
  ): Promise<AgentlinkSendResult> => {
    const { bridge } = context;
    const { to, intent, message, structured } = params;
    
    try {
      // Check if node is running
      if (!bridge.isRunning()) {
        return {
          success: false,
          message: 'AgentLink node is not running. Please start the node first.'
        };
      }
      
      // Resolve recipient (could be DID or name)
      let recipientDid = to;
      
      // If not a DID, try to find by name
      if (!to.startsWith('did:key:')) {
        const contacts = bridge.getContacts();
        const contact = contacts.find(c => 
          c.name.toLowerCase() === to.toLowerCase()
        );
        
        if (!contact) {
          return {
            success: false,
            message: `Contact not found: "${to}". Use agentlink_contacts to see available contacts.`
          };
        }
        
        recipientDid = contact.did;
      }
      
      // Check trust level
      const trustLevel = bridge.getTrustLevel(recipientDid);
      if (trustLevel === 'blocked') {
        return {
          success: false,
          message: `Cannot send message to blocked contact: ${recipientDid}`
        };
      }
      
      // Send the message
      const result = await bridge.sendMessage(recipientDid, intent, message, structured);
      
      if (result.success) {
        return {
          success: true,
          message: `Message sent successfully to ${recipientDid}`,
          to: recipientDid
        };
      }
      
      return {
        success: false,
        message: result.error || 'Failed to send message'
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error sending message: ${errorMessage}`
      };
    }
  }
};

// ============================================
// Tool Export
// ============================================

export default agentlinkSendTool;