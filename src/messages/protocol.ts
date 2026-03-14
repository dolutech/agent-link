/**
 * AgentLink Message Protocol
 *
 * Stream-based messaging protocol for libp2p.
 * Handles message framing, validation, and routing over libp2p streams.
 *
 * @module messages/protocol
 */

import type { Connection, Stream } from "@libp2p/interface";
import { pipe } from "it-pipe";
import * as lp from "it-length-prefixed";
import type { Envelope } from "./types.js";
import { parseMessage, isExpired } from "./envelope.js";
import { getGlobalReplayCache } from "../security/replay-cache.js";

/**
 * Protocol identifier for AgentLink messaging
 */
export const MESSAGE_PROTOCOL = "/agentlink/message/1.0.0";

/**
 * Maximum message size (1MB)
 * Messages larger than this will be rejected
 */
export const MAX_MESSAGE_SIZE = 1024 * 1024;

/**
 * Maximum messages per connection to prevent DoS
 */
export const MAX_MESSAGES_PER_CONNECTION = 1000;

/**
 * Maximum messages per minute per connection (rate limiting)
 */
export const MAX_MESSAGES_PER_MINUTE = 100;

/**
 * Message handler function type
 *
 * @param envelope - The parsed and verified message envelope
 * @param stream - The libp2p stream
 * @param connection - The libp2p connection
 */
export type MessageHandler = (
  envelope: Envelope,
  stream: Stream,
  connection: Connection,
) => Promise<void>;

/**
 * Creates a stream handler for incoming messages
 *
 * Uses length-prefixed encoding for message framing.
 * Each message is parsed, verified, and passed to the handler.
 * Only verified messages are processed.
 *
 * @param handler - Function to handle incoming messages
 * @returns Stream handler function for libp2p handle()
 *
 * @example
 * node.handle(MESSAGE_PROTOCOL, createMessageStream(async (envelope, stream, connection) => {
 *   console.log('Received message:', envelope);
 * }));
 */
export function createMessageStream(
  handler: MessageHandler,
): (props: { stream: Stream; connection: Connection }) => Promise<void> {
  return async ({
    stream,
    connection,
  }: {
    stream: Stream;
    connection: Connection;
  }) => {
    let messageCount = 0;
    let windowStart = Date.now();
    let windowCount = 0;

    // Convert stream async iterable to Uint8Array source for lp.decode
    async function* streamToSource(): AsyncGenerator<Uint8Array> {
      for await (const chunk of stream) {
        // Handle both Uint8Array and Uint8ArrayList
        if (chunk instanceof Uint8Array) {
          yield chunk;
        } else {
          // Uint8ArrayList - convert to Uint8Array
          yield "slice" in chunk
            ? (chunk as { slice: () => Uint8Array }).slice()
            : new Uint8Array(chunk as ArrayBuffer);
        }
      }
    }

    // Process messages through length-prefixed decoder
    await pipe(
      streamToSource(),
      (source) => lp.decode(source, { maxDataLength: MAX_MESSAGE_SIZE }),
      async (source) => {
        for await (const data of source) {
          // Check total message limit
          messageCount++;
          if (messageCount > MAX_MESSAGES_PER_CONNECTION) {
            console.warn(
              "[Protocol] Connection message limit reached, closing stream",
            );
            stream.abort(new Error("Message limit exceeded"));
            return;
          }

          // Check rate limit (messages per minute)
          const now = Date.now();
          if (now - windowStart > 60000) {
            // Reset window
            windowStart = now;
            windowCount = 0;
          }
          windowCount++;
          if (windowCount > MAX_MESSAGES_PER_MINUTE) {
            console.warn("[Protocol] Rate limit exceeded, closing stream");
            stream.abort(new Error("Rate limit exceeded"));
            return;
          }

          // Convert Uint8ArrayList to Uint8Array if needed
          const rawMessage = new TextDecoder().decode(
            "slice" in data
              ? (data as { slice: () => Uint8Array }).slice()
              : data,
          );

          try {
            const parsed = parseMessage(rawMessage);

            // Only process verified and non-expired messages
            if (parsed.verified) {
              // Check message expiration
              if (isExpired(parsed.envelope)) {
                console.warn(
                  "[Protocol] Rejected expired message:",
                  parsed.envelope.id,
                );
                continue; // Skip expired messages
              }

              // Check for replay attacks
              const replayCache = getGlobalReplayCache();
              if (replayCache.checkAndMark(parsed.envelope.id)) {
                console.warn(
                  "[Protocol] Rejected replayed message:",
                  parsed.envelope.id,
                );
                continue; // Skip replayed messages
              }

              await handler(parsed.envelope, stream, connection);
            }
          } catch (error) {
            console.error("Failed to process message:", error);
          }
        }
      },
    );
  };
}

/**
 * Sends a message over a libp2p stream
 *
 * Serializes the envelope to JSON and encodes with length-prefix framing.
 *
 * @param stream - The libp2p stream to send on
 * @param envelope - The message envelope to send
 *
 * @example
 * await sendMessageOverStream(stream, envelope);
 */
export async function sendMessageOverStream(
  stream: Stream,
  envelope: Envelope,
): Promise<void> {
  const messageBytes = new TextEncoder().encode(JSON.stringify(envelope));

  // Encode with length prefix and collect encoded data
  const encodedChunks: Uint8Array[] = [];

  await pipe(
    [messageBytes],
    (source) => lp.encode(source),
    async (source) => {
      for await (const chunk of source) {
        // Convert Uint8ArrayList to Uint8Array if needed
        if (chunk instanceof Uint8Array) {
          encodedChunks.push(chunk);
        } else {
          encodedChunks.push(
            "slice" in chunk
              ? (chunk as { slice: () => Uint8Array }).slice()
              : new Uint8Array(chunk as ArrayBuffer),
          );
        }
      }
    },
  );

  // Send each encoded chunk using the stream's send method
  for (const chunk of encodedChunks) {
    stream.send(chunk);
  }
}

/**
 * Opens a message stream to a peer
 *
 * Creates a bi-directional stream for sending and receiving messages.
 * Returns helper functions for sending messages and closing the stream.
 *
 * @param connection - The libp2p connection to the peer
 * @returns Object with stream, send function, and close function
 *
 * @example
 * const { stream, send, close } = await openMessageStream(connection);
 * await send(envelope);
 * await close();
 */
export async function openMessageStream(connection: Connection): Promise<{
  stream: Stream;
  send: (envelope: Envelope) => Promise<void>;
  close: () => Promise<void>;
}> {
  const stream = await connection.newStream(MESSAGE_PROTOCOL);

  return {
    stream,
    send: async (envelope: Envelope) => {
      await sendMessageOverStream(stream, envelope);
    },
    close: async () => {
      await stream.close();
    },
  };
}

/**
 * Registers the message protocol on a libp2p node
 *
 * Sets up the handler for incoming connections on the message protocol.
 * The handler will receive and process all incoming messages.
 *
 * @param node - The libp2p node instance
 * @param handler - Function to handle incoming messages
 *
 * @example
 * registerMessageProtocol(node, async (envelope, stream, connection) => {
 *   console.log('Message from:', envelope.from);
 *   console.log('Message type:', envelope.type);
 * });
 */
export function registerMessageProtocol(
  node: any,
  handler: MessageHandler,
): void {
  node.handle(MESSAGE_PROTOCOL, createMessageStream(handler));
}
