/**
 * AgentLink Handshake Handler
 * 
 * Handles handshake protocol between agents (hello/ack exchange).
 * 
 * @module messages/handlers/handshake
 */

import type { MessageHandler, MessageContext } from '../router.js';
import type { HandshakeHelloBody, HandshakeAckBody } from '../types.js';

/**
 * Agent information exchanged during handshake
 */
export interface AgentInfo {
  name: string;
  version?: string;
  capabilities?: string[];
  protocols?: string[];
}

/**
 * Handshake state for tracking ongoing handshakes
 */
export interface HandshakeState {
  /** Remote agent DID */
  remoteDid: string;
  /** Whether handshake is complete */
  complete: boolean;
  /** Remote agent info (if accepted) */
  remoteAgent?: AgentInfo;
  /** Timestamp of handshake initiation */
  initiatedAt: Date;
}

/**
 * Handshake manager for tracking multiple concurrent handshakes
 */
export class HandshakeManager {
  private handshakes: Map<string, HandshakeState> = new Map();
  private localAgentInfo: AgentInfo;

  constructor(agentInfo: AgentInfo) {
    this.localAgentInfo = agentInfo;
  }

  /**
   * Gets the local agent info
   */
  getLocalAgentInfo(): AgentInfo {
    return this.localAgentInfo;
  }

  /**
   * Starts tracking a new handshake
   */
  startHandshake(remoteDid: string): void {
    this.handshakes.set(remoteDid, {
      remoteDid,
      complete: false,
      initiatedAt: new Date()
    });
  }

  /**
   * Completes a handshake with agent info
   */
  completeHandshake(remoteDid: string, remoteAgent?: AgentInfo): void {
    const state = this.handshakes.get(remoteDid);
    if (state) {
      state.complete = true;
      state.remoteAgent = remoteAgent;
    }
  }

  /**
   * Gets handshake state for a remote agent
   */
  getHandshakeState(remoteDid: string): HandshakeState | undefined {
    return this.handshakes.get(remoteDid);
  }

  /**
   * Removes a handshake from tracking
   */
  removeHandshake(remoteDid: string): void {
    this.handshakes.delete(remoteDid);
  }
}

/**
 * Creates a handshake hello handler
 * 
 * @param manager - Handshake manager instance
 * @param acceptAll - Whether to accept all handshakes (default: true)
 * @returns Message handler
 */
export function createHandshakeHelloHandler(
  manager: HandshakeManager,
  acceptAll: boolean = true
): MessageHandler {
  return async (ctx: MessageContext): Promise<void> => {
    const helloBody = ctx.envelope.body as HandshakeHelloBody;
    const remoteDid = ctx.envelope.from;
    
    // Track the handshake
    manager.startHandshake(remoteDid);
    
    // Build response
    const accepted = acceptAll;
    const ackBody: HandshakeAckBody = {
      accepted,
      agent_name: manager.getLocalAgentInfo().name,
      capabilities: manager.getLocalAgentInfo().capabilities
    };
    
    if (!accepted) {
      ackBody.reason = 'Handshake rejected by policy';
    }
    
    const response = await ctx.createResponse('handshake.ack', ackBody);
    await ctx.send(response);
    
    // If accepted, mark as complete with remote info
    if (accepted) {
      manager.completeHandshake(remoteDid, {
        name: helloBody.agent_name,
        version: helloBody.agent_version,
        capabilities: helloBody.capabilities,
        protocols: helloBody.protocols
      });
    }
  };
}

/**
 * Creates a handshake ack handler
 * 
 * @param manager - Handshake manager instance
 * @returns Message handler
 */
export function createHandshakeAckHandler(manager: HandshakeManager): MessageHandler {
  return async (ctx: MessageContext): Promise<void> => {
    const ackBody = ctx.envelope.body as HandshakeAckBody;
    const remoteDid = ctx.envelope.from;
    
    if (ackBody.accepted) {
      manager.completeHandshake(remoteDid, {
        name: ackBody.agent_name || 'Unknown',
        capabilities: ackBody.capabilities
      });
      
      console.info('Handshake accepted by:', remoteDid);
    } else {
      console.warn('Handshake rejected by:', remoteDid, 'Reason:', ackBody.reason);
      manager.removeHandshake(remoteDid);
    }
  };
}

/**
 * Creates a handshake hello envelope
 * 
 * @param from - Sender DID
 * @param to - Recipient DID
 * @param agentInfo - Agent information to send
 * @param privateKey - Private key for signing
 * @param createEnvelope - Envelope creation function
 * @returns Signed handshake hello envelope
 */
export async function createHandshakeHello(
  from: string,
  to: string,
  agentInfo: AgentInfo,
  privateKey: Uint8Array,
  createEnvelope: (options: import('../types.js').CreateMessageOptions, privateKey: Uint8Array) => Promise<import('../types.js').Envelope>
): Promise<import('../types.js').Envelope> {
  const body: HandshakeHelloBody = {
    agent_name: agentInfo.name,
    agent_version: agentInfo.version,
    capabilities: agentInfo.capabilities,
    protocols: agentInfo.protocols
  };
  
  return createEnvelope({
    from,
    to,
    type: 'handshake.hello',
    body
  }, privateKey);
}

/**
 * Default handlers for convenience
 */
export const handshakeHelloHandler: MessageHandler = async (ctx: MessageContext): Promise<void> => {
  // Simple default handler - accepts all handshakes
  const ackBody: HandshakeAckBody = {
    accepted: true,
    agent_name: 'AgentLink Node',
    capabilities: ['ping', 'handshake']
  };
  
  const response = await ctx.createResponse('handshake.ack', ackBody);
  await ctx.send(response);
};

export const handshakeAckHandler: MessageHandler = async (ctx: MessageContext): Promise<void> => {
  const ackBody = ctx.envelope.body as HandshakeAckBody;
  
  if (ackBody.accepted) {
    console.info('Handshake accepted by:', ctx.envelope.from);
  } else {
    console.warn('Handshake rejected by:', ctx.envelope.from, 'Reason:', ackBody.reason);
  }
};