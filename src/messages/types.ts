/**
 * AgentLink Message Types
 * 
 * Defines all message types, schemas, and interfaces using Zod for validation.
 * 
 * @module messages/types
 */

import { z } from 'zod';

/**
 * Supported message types in the AgentLink protocol
 */
export const MessageTypeSchema = z.enum([
  'ping',
  'pong',
  'handshake.hello',
  'handshake.ack',
  'request',
  'response',
  'event',
  'error'
]);

export type MessageType = z.infer<typeof MessageTypeSchema>;

/**
 * Message envelope schema - wraps all protocol messages
 */
export const EnvelopeSchema = z.object({
  /** Protocol version (semver) */
  v: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Unique message identifier */
  id: z.string().min(1),
  /** Sender DID (did:key:z6Mk...) */
  from: z.string().startsWith('did:key:'),
  /** Recipient DID (did:key:z6Mk...) */
  to: z.string().startsWith('did:key:'),
  /** Message type */
  type: MessageTypeSchema,
  /** Creation timestamp (ISO 8601) */
  created: z.string().datetime(),
  /** Expiration timestamp (ISO 8601, optional) */
  expires: z.string().datetime().optional(),
  /** Thread ID for message correlation */
  thread: z.string().optional(),
  /** Message payload */
  body: z.record(z.unknown()),
  /** Ed25519 signature (base64) */
  sig: z.string().min(1)
});

export type Envelope = z.infer<typeof EnvelopeSchema>;

/**
 * Parsed message with verification status
 */
export interface ParsedMessage {
  /** Parsed envelope */
  envelope: Envelope;
  /** Raw message string */
  raw: string;
  /** Signature verification result */
  verified: boolean;
}

/**
 * Options for creating a new message
 */
export interface CreateMessageOptions {
  /** Sender DID */
  from: string;
  /** Recipient DID */
  to: string;
  /** Message type */
  type: MessageType;
  /** Message payload */
  body: Record<string, unknown>;
  /** Thread ID for correlation */
  thread?: string;
  /** Expiration date */
  expires?: Date;
  /** Custom message ID (auto-generated if not provided) */
  id?: string;
}

/**
 * Ping message body
 */
export const PingBodySchema = z.object({
  timestamp: z.number().int().positive().optional()
});

export type PingBody = z.infer<typeof PingBodySchema>;

/**
 * Pong message body
 */
export const PongBodySchema = z.object({
  timestamp: z.number().int().positive(),
  ping_id: z.string().optional()
});

export type PongBody = z.infer<typeof PongBodySchema>;

/**
 * Handshake hello message body
 */
export const HandshakeHelloBodySchema = z.object({
  agent_name: z.string().min(1),
  agent_version: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  protocols: z.array(z.string()).optional()
});

export type HandshakeHelloBody = z.infer<typeof HandshakeHelloBodySchema>;

/**
 * Handshake ack message body
 */
export const HandshakeAckBodySchema = z.object({
  accepted: z.boolean(),
  agent_name: z.string().min(1).optional(),
  capabilities: z.array(z.string()).optional(),
  reason: z.string().optional()
});

export type HandshakeAckBody = z.infer<typeof HandshakeAckBodySchema>;

/**
 * Error message body
 */
export const ErrorBodySchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional()
});

export type ErrorBody = z.infer<typeof ErrorBodySchema>;

/**
 * Request message body
 */
export const RequestBodySchema = z.object({
  method: z.string().min(1),
  params: z.record(z.unknown()).optional()
});

export type RequestBody = z.infer<typeof RequestBodySchema>;

/**
 * Response message body
 */
export const ResponseBodySchema = z.object({
  request_id: z.string().min(1),
  success: z.boolean(),
  result: z.unknown().optional(),
  error: ErrorBodySchema.optional()
});

export type ResponseBody = z.infer<typeof ResponseBodySchema>;

/**
 * Event message body
 */
export const EventBodySchema = z.object({
  event_type: z.string().min(1),
  data: z.record(z.unknown())
});

export type EventBody = z.infer<typeof EventBodySchema>;