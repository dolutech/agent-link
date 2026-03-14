/**
 * AgentLink Tools for OpenClaw
 * 
 * This module exports all available tools for integrating
 * AgentLink with OpenClaw agents.
 * 
 * @module tools
 */

// ============================================
// Tool Exports
// ============================================

export { agentlinkSendTool } from './agentlink_send.js';
export type { 
  AgentlinkSendParams, 
  AgentlinkSendResult, 
  AgentlinkSendContext 
} from './agentlink_send.js';

export { agentlinkContactsTool } from './agentlink_contacts.js';
export type { 
  AgentlinkContactsParams, 
  AgentlinkContactsResult, 
  AgentlinkContactsContext,
  ContactAction
} from './agentlink_contacts.js';

export { agentlinkStatusTool } from './agentlink_status.js';
export type { 
  AgentlinkStatusParams, 
  AgentlinkStatusResult, 
  AgentlinkStatusContext 
} from './agentlink_status.js';

export { 
  agentlinkCardTool,
  parseCardFromLink,
  validateCard
} from './agentlink_card.js';
export type { 
  AgentlinkCardParams, 
  AgentlinkCardResult, 
  AgentlinkCardContext,
  CardFormat
} from './agentlink_card.js';

// ============================================
// Tool Collection
// ============================================

import { agentlinkSendTool } from './agentlink_send.js';
import { agentlinkContactsTool } from './agentlink_contacts.js';
import { agentlinkStatusTool } from './agentlink_status.js';
import { agentlinkCardTool } from './agentlink_card.js';

/**
 * All AgentLink tools for OpenClaw
 * 
 * Use this array to register all tools with an OpenClaw agent:
 * 
 * @example
 * ```typescript
 * import { AGENTLINK_TOOLS } from '@agentlink/protocol/tools';
 * 
 * for (const tool of AGENTLINK_TOOLS) {
 *   agent.registerTool({
 *     name: tool.name,
 *     description: tool.description,
 *     parameters: tool.parameters,
 *     execute: (params) => tool.execute(params, { bridge })
 *   });
 * }
 * ```
 */
export const AGENTLINK_TOOLS = [
  agentlinkSendTool,
  agentlinkContactsTool,
  agentlinkStatusTool,
  agentlinkCardTool
];

// ============================================
// Tool Names
// ============================================

/**
 * Names of all AgentLink tools
 */
export const TOOL_NAMES = {
  SEND: 'agentlink_send',
  CONTACTS: 'agentlink_contacts',
  STATUS: 'agentlink_status',
  CARD: 'agentlink_card'
} as const;

// ============================================
// Re-export Types
// ============================================

// Re-export bridge types that tools use
export type {
  OpenClawBridge,
  BridgeMessage,
  BridgeResponse,
  PermissionRequest,
  NodeStatus
} from '../bridge/openclaw-bridge.js';