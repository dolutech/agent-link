/**
 * AgentLink Ping Handler
 * 
 * Handles ping/pong message exchange for connection health checks.
 * 
 * @module messages/handlers/ping
 */

import type { MessageHandler, MessageContext } from '../router.js';
import type { PingBody, PongBody } from '../types.js';

/**
 * Ping message handler
 * 
 * Responds to ping messages with a pong response.
 * 
 * @example
 * router.on('ping', pingHandler);
 */
export const pingHandler: MessageHandler = async (ctx: MessageContext): Promise<void> => {
  const pingBody = ctx.envelope.body as PingBody;
  
  const pongBody: PongBody = {
    timestamp: Date.now(),
    ping_id: ctx.envelope.id
  };
  
  const response = await ctx.createResponse('pong', pongBody);
  await ctx.send(response);
};

/**
 * Pong message handler
 * 
 * Handles incoming pong responses.
 * Stores them for correlation with ping requests.
 * 
 * @example
 * router.on('pong', pongHandler);
 */
export const pongHandler: MessageHandler = async (ctx: MessageContext): Promise<void> => {
  const pongBody = ctx.envelope.body as PongBody;
  
  // Log the pong for debugging
  // In production, this would be stored for request correlation
  console.debug('Received pong:', {
    from: ctx.envelope.from,
    ping_id: pongBody.ping_id,
    latency: Date.now() - pongBody.timestamp
  });
};

/**
 * Creates a ping envelope
 * 
 * @param from - Sender DID
 * @param to - Recipient DID
 * @param privateKey - Private key for signing
 * @param createEnvelope - Envelope creation function
 * @returns Signed ping envelope
 */
export async function createPing(
  from: string,
  to: string,
  privateKey: Uint8Array,
  createEnvelope: (options: import('../types.js').CreateMessageOptions, privateKey: Uint8Array) => Promise<import('../types.js').Envelope>
): Promise<import('../types.js').Envelope> {
  return createEnvelope({
    from,
    to,
    type: 'ping',
    body: {
      timestamp: Date.now()
    }
  }, privateKey);
}