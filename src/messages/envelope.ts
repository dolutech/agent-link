/**
 * AgentLink Message Envelope
 * 
 * Functions for creating, parsing, signing, and serializing message envelopes.
 * 
 * @module messages/envelope
 */

import { ulid } from 'ulid';
import { sign, verify, didToPublicKey } from '../node/identity.js';
import { EnvelopeSchema, type Envelope, type ParsedMessage, type CreateMessageOptions, type MessageType } from './types.js';

/** Protocol version */
const PROTOCOL_VERSION = '1.0.0';

/**
 * Creates a new signed message envelope
 * 
 * @param options - Message creation options
 * @param privateKey - Ed25519 private key for signing
 * @returns Signed envelope
 * 
 * @example
 * const envelope = await createEnvelope({
 *   from: 'did:key:z6Mk...',
 *   to: 'did:key:z6Mk...',
 *   type: 'ping',
 *   body: {}
 * }, privateKey);
 */
export async function createEnvelope(
  options: CreateMessageOptions,
  privateKey: Uint8Array
): Promise<Envelope> {
  const id = options.id || ulid();
  const created = new Date().toISOString();
  
  const envelope: Omit<Envelope, 'sig'> = {
    v: PROTOCOL_VERSION,
    id,
    from: options.from,
    to: options.to,
    type: options.type,
    created,
    body: options.body
  };
  
  // Add optional fields
  if (options.thread) {
    envelope.thread = options.thread;
  }
  if (options.expires) {
    envelope.expires = options.expires.toISOString();
  }
  
  // Sign the envelope
  const signingData = serializeForSigning(envelope as Envelope);
  const signature = sign(signingData, privateKey);
  
  return {
    ...envelope,
    sig: Buffer.from(signature).toString('base64')
  } as Envelope;
}

/**
 * Serializes envelope for signing (without sig field)
 * 
 * @param envelope - Envelope to serialize
 * @returns Serialized data for signing
 */
export function serializeForSigning(envelope: Envelope): Uint8Array {
  const { sig, ...dataToSign } = envelope;
  const sortedJson = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());
  return new TextEncoder().encode(sortedJson);
}

/**
 * Serializes an envelope to a JSON string
 * 
 * @param envelope - Envelope to serialize
 * @returns JSON string
 */
export function serialize(envelope: Envelope): string {
  return JSON.stringify(envelope);
}

/**
 * Parses a raw message string into a ParsedMessage
 * 
 * @param raw - Raw message string
 * @returns Parsed message with verification status
 * @throws Error if parsing fails
 * 
 * @example
 * const parsed = parseMessage(rawString);
 * if (parsed.verified) {
 *   console.log('Valid message from:', parsed.envelope.from);
 * }
 */
export function parseMessage(raw: string): ParsedMessage {
  const parsed = JSON.parse(raw);
  const envelope = EnvelopeSchema.parse(parsed);
  
  // Verify signature
  const signingData = serializeForSigning(envelope);
  const signature = Buffer.from(envelope.sig, 'base64');
  const publicKey = didToPublicKey(envelope.from);
  
  const verified = verify(signingData, signature, publicKey);
  
  return {
    envelope,
    raw,
    verified
  };
}

/**
 * Verifies a message signature
 * 
 * @param envelope - Envelope to verify
 * @returns true if signature is valid
 */
export function verifyEnvelope(envelope: Envelope): boolean {
  try {
    const signingData = serializeForSigning(envelope);
    const signature = Buffer.from(envelope.sig, 'base64');
    const publicKey = didToPublicKey(envelope.from);
    return verify(signingData, signature, publicKey);
  } catch {
    return false;
  }
}

/**
 * Checks if a message has expired
 * 
 * @param envelope - Envelope to check
 * @returns true if expired
 */
export function isExpired(envelope: Envelope): boolean {
  if (!envelope.expires) {
    return false;
  }
  return new Date(envelope.expires) < new Date();
}

/**
 * Creates a response envelope for a request
 * 
 * @param request - Original request envelope
 * @param type - Response message type
 * @param body - Response body
 * @param privateKey - Private key for signing
 * @returns Signed response envelope
 */
export async function createResponse(
  request: Envelope,
  type: MessageType,
  body: Record<string, unknown>,
  privateKey: Uint8Array
): Promise<Envelope> {
  return createEnvelope({
    from: request.to,
    to: request.from,
    type,
    body,
    thread: request.id
  }, privateKey);
}

/**
 * Creates an error response envelope
 * 
 * @param request - Original request envelope
 * @param code - Error code
 * @param message - Error message
 * @param details - Optional error details
 * @param privateKey - Private key for signing
 * @returns Signed error envelope
 */
export async function createErrorResponse(
  request: Envelope,
  code: string,
  message: string,
  details: Record<string, unknown> | undefined,
  privateKey: Uint8Array
): Promise<Envelope> {
  return createResponse(request, 'error', {
    code,
    message,
    details
  }, privateKey);
}