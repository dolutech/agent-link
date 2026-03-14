/**
 * AgentLink Identity Module
 *
 * Implements self-sovereign identity using did:key method with Ed25519 keys.
 *
 * @module identity
 */

import { ed25519 } from "@noble/curves/ed25519";
import { randomBytes } from "@noble/hashes/utils";
import { peerIdFromPrivateKey } from "@libp2p/peer-id";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import { base58btc } from "multiformats/bases/base58";
import type { PeerId, PrivateKey } from "@libp2p/interface";
import * as fs from "fs";
import * as path from "path";

// DID did:key prefix
const DID_KEY_PREFIX = "did:key:";

/**
 * Represents a complete identity keypair with DID and PeerId
 */
export interface IdentityKeyPair {
  /** DID in did:key format (did:key:z6Mk...) */
  did: string;
  /** libp2p PeerId derived from the keypair */
  peerId: PeerId;
  /** libp2p PrivateKey object for libp2p node creation */
  libp2pPrivateKey: PrivateKey;
  /** Raw Ed25519 public key (32 bytes) */
  publicKey: Uint8Array;
  /** Raw Ed25519 private key (32 bytes seed) */
  privateKey: Uint8Array;
}

/**
 * Options for identity generation
 */
export interface GenerateKeyPairOptions {
  /** Optional seed for deterministic key generation (32 bytes) */
  seed?: Uint8Array;
}

/**
 * Generates a new Ed25519 keypair with DID and PeerId
 *
 * @param options - Optional generation options
 * @returns Complete identity keypair
 *
 * @example
 * const identity = await generateKeyPair();
 * console.log(identity.did); // did:key:z6Mk...
 */
export async function generateKeyPair(
  options: GenerateKeyPairOptions = {},
): Promise<IdentityKeyPair> {
  // Generate or use provided seed
  const seed = options.seed || randomBytes(32);

  // Generate Ed25519 keypair from seed using @libp2p/crypto
  const privateKeyObj = await generateKeyPairFromSeed("Ed25519", seed);
  const publicKey = privateKeyObj.publicKey.raw;
  const privateKey = seed; // Keep the seed as the private key for compatibility

  // Create libp2p PeerId from the private key object
  const peerId = peerIdFromPrivateKey(privateKeyObj);

  // Generate DID from public key
  const did = publicKeyToDid(publicKey);

  return {
    did,
    peerId,
    libp2pPrivateKey: privateKeyObj,
    publicKey,
    privateKey,
  };
}

/**
 * Converts an Ed25519 public key to a did:key DID
 *
 * @param publicKey - Raw Ed25519 public key (32 bytes)
 * @returns DID string in did:key format
 *
 * @example
 * const did = publicKeyToDid(publicKey);
 * // Returns: did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
 */
export function publicKeyToDid(publicKey: Uint8Array): string {
  if (publicKey.length !== 32) {
    throw new Error(
      `Invalid public key length: expected 32 bytes, got ${publicKey.length}`,
    );
  }

  // Varint encoding of Ed25519 multicodec (0xed = 237)
  // 237 = 128 * 1 + 109, so varint is [0xed, 0x01]
  const multicodecPrefix = new Uint8Array([0xed, 0x01]);
  const prefixedKey = new Uint8Array([...multicodecPrefix, ...publicKey]);

  // Base58-btc encode (already includes 'z' prefix)
  const encoded = base58btc.encode(prefixedKey);

  return `${DID_KEY_PREFIX}${encoded}`;
}

/**
 * Extracts the Ed25519 public key from a did:key DID
 *
 * @param did - DID string in did:key format
 * @returns Raw Ed25519 public key (32 bytes)
 *
 * @example
 * const publicKey = didToPublicKey('did:key:z6Mk...');
 */
export function didToPublicKey(did: string): Uint8Array {
  if (!did.startsWith(DID_KEY_PREFIX)) {
    throw new Error(`Invalid DID: must start with ${DID_KEY_PREFIX}`);
  }

  const encoded = did.slice(DID_KEY_PREFIX.length);
  const decoded = base58btc.decode(encoded);

  // Remove varint multicodec prefix (2 bytes: 0xed, 0x01 for Ed25519)
  const publicKey = decoded.slice(2);

  if (publicKey.length !== 32) {
    throw new Error(
      `Invalid key length in DID: expected 32 bytes, got ${publicKey.length}`,
    );
  }

  return publicKey;
}

/**
 * Signs data using Ed25519 private key
 *
 * @param data - Data to sign
 * @param privateKey - Ed25519 private key (32 bytes seed)
 * @returns Signature (64 bytes)
 *
 * @example
 * const signature = sign(new TextEncoder().encode('hello'), privateKey);
 */
export function sign(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  if (privateKey.length !== 32) {
    throw new Error(
      `Invalid private key length: expected 32 bytes, got ${privateKey.length}`,
    );
  }

  return ed25519.sign(data, privateKey);
}

/**
 * Verifies an Ed25519 signature
 *
 * @param data - Original data that was signed
 * @param signature - Signature to verify (64 bytes)
 * @param publicKey - Ed25519 public key (32 bytes)
 * @returns true if signature is valid
 *
 * @example
 * const isValid = verify(data, signature, publicKey);
 */
export function verify(
  data: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  if (publicKey.length !== 32) {
    throw new Error(
      `Invalid public key length: expected 32 bytes, got ${publicKey.length}`,
    );
  }

  if (signature.length !== 64) {
    throw new Error(
      `Invalid signature length: expected 64 bytes, got ${signature.length}`,
    );
  }

  try {
    return ed25519.verify(signature, data, publicKey);
  } catch {
    return false;
  }
}

/**
 * Storage paths for identity persistence
 */
const IDENTITY_DIR = ".agentlink";
const IDENTITY_FILE = "identity.key";

/**
 * Saves identity to disk
 *
 * @deprecated Use saveIdentitySecure instead - this stores keys in plaintext with file permissions
 *
 * @param keyPair - Identity keypair to save
 * @param basePath - Optional base path (defaults to current directory)
 *
 * @example
 * await saveIdentity(identity);
 */
export async function saveIdentity(
  keyPair: IdentityKeyPair,
  basePath: string = process.cwd(),
): Promise<void> {
  const dirPath = path.join(basePath, IDENTITY_DIR);
  const filePath = path.join(dirPath, IDENTITY_FILE);

  // Create directory if it doesn't exist with restrictive permissions
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }

  // Create JSON representation
  const identityData = {
    did: keyPair.did,
    privateKey: Buffer.from(keyPair.privateKey).toString("base64"),
    publicKey: Buffer.from(keyPair.publicKey).toString("base64"),
    peerId: keyPair.peerId.toString(),
  };

  // Write with restrictive file permissions (owner read/write only)
  fs.writeFileSync(filePath, JSON.stringify(identityData, null, 2), {
    encoding: "utf-8",
    mode: 0o600, // Owner read/write only
  });

  // Log warning about plaintext storage
  console.warn(
    "[SECURITY WARNING] Identity stored in plaintext. Use saveIdentitySecure for encrypted storage.",
  );
}

/**
 * Loads identity from disk
 *
 * @param basePath - Optional base path (defaults to current directory)
 * @returns Identity keypair or null if not found
 *
 * @example
 * const identity = await loadIdentity();
 * if (identity) {
 *   console.log('Loaded identity:', identity.did);
 * }
 */
export async function loadIdentity(
  basePath: string = process.cwd(),
): Promise<IdentityKeyPair | null> {
  const filePath = path.join(basePath, IDENTITY_DIR, IDENTITY_FILE);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const privateKey = Buffer.from(data.privateKey, "base64");
    const publicKey = Buffer.from(data.publicKey, "base64");

    // Recreate PrivateKey using the new API
    const privateKeyObj = await generateKeyPairFromSeed(
      "Ed25519",
      new Uint8Array(privateKey),
    );
    const peerId = peerIdFromPrivateKey(privateKeyObj);

    return {
      did: data.did,
      peerId,
      libp2pPrivateKey: privateKeyObj,
      publicKey: new Uint8Array(publicKey),
      privateKey: new Uint8Array(privateKey),
    };
  } catch (error) {
    console.error("Failed to load identity:", error);
    return null;
  }
}

/**
 * Gets or creates an identity (convenience function)
 *
 * Prefers encrypted storage if available. Falls back to plaintext storage
 * for backwards compatibility (with security warning).
 *
 * @param basePath - Optional base path for identity storage
 * @param password - Optional password for encrypted storage (required if encrypted vault exists)
 * @returns Existing or newly generated identity
 *
 * @example
 * // With encryption
 * const identity = await getOrCreateIdentity(process.cwd(), process.env.AGENTLINK_PASSWORD);
 *
 * // Without encryption (not recommended)
 * const identity = await getOrCreateIdentity();
 */
export async function getOrCreateIdentity(
  basePath: string = process.cwd(),
  password?: string,
): Promise<IdentityKeyPair> {
  // Try to load from secure storage first
  const secureVaultPath = path.join(basePath, IDENTITY_DIR, "vault.enc");
  if (fs.existsSync(secureVaultPath)) {
    if (!password) {
      throw new Error(
        "Encrypted identity vault found but no password provided. " +
          "Please provide a password or set AGENTLINK_PASSWORD environment variable.",
      );
    }
    const existing = await loadIdentitySecure(password, basePath);
    if (existing) {
      return existing;
    }
  }

  // Try plaintext storage (backwards compatibility)
  const existing = await loadIdentity(basePath);
  if (existing) {
    console.warn(
      "[SECURITY WARNING] Loading plaintext identity. Consider migrating to encrypted storage.",
    );
    return existing;
  }

  // Generate new identity
  const newIdentity = await generateKeyPair();

  // Save with encryption if password provided
  if (password) {
    await saveIdentitySecure(newIdentity, password, basePath);
  } else {
    await saveIdentity(newIdentity, basePath);
  }

  return newIdentity;
}

// ============================================
// Secure Storage Integration
// ============================================

import {
  saveToVault,
  loadFromVault,
  vaultExists as checkVaultExists,
  generateSecurePassword as genSecurePassword,
} from "../security/key-vault.js";

/**
 * Options for secure identity storage
 */
export interface SecureStorageOptions {
  password?: string;
  useEncryption?: boolean;
}

/**
 * Save identity with encryption
 *
 * Uses AES-256-GCM encryption with PBKDF2 key derivation.
 * The vault file is stored with restrictive permissions (0o600).
 *
 * @param keyPair - Identity keypair to save
 * @param password - Encryption password
 * @param basePath - Optional base path (defaults to current directory)
 *
 * @example
 * const password = generateSecurePassword();
 * await saveIdentitySecure(identity, password);
 * // Store password securely (e.g., in environment variable or keychain)
 */
export async function saveIdentitySecure(
  keyPair: IdentityKeyPair,
  password: string,
  basePath: string = process.cwd(),
): Promise<void> {
  const keyData = JSON.stringify({
    did: keyPair.did,
    privateKey: Buffer.from(keyPair.privateKey).toString("base64"),
    publicKey: Buffer.from(keyPair.publicKey).toString("base64"),
    peerId: keyPair.peerId.toString(),
  });

  await saveToVault(Buffer.from(keyData), password, {
    vaultPath: path.join(basePath, IDENTITY_DIR),
  });
}

/**
 * Load identity from encrypted storage
 *
 * @param password - Decryption password
 * @param basePath - Optional base path (defaults to current directory)
 * @returns Identity keypair or null if not found
 *
 * @example
 * const identity = await loadIdentitySecure(password);
 * if (identity) {
 *   console.log('Loaded encrypted identity:', identity.did);
 * }
 */
export async function loadIdentitySecure(
  password: string,
  basePath: string = process.cwd(),
): Promise<IdentityKeyPair | null> {
  const data = await loadFromVault(password, {
    vaultPath: path.join(basePath, IDENTITY_DIR),
  });

  if (!data) return null;

  try {
    const parsed = JSON.parse(data.toString());

    const privateKey = Buffer.from(parsed.privateKey, "base64");
    const publicKey = Buffer.from(parsed.publicKey, "base64");

    const privateKeyObj = await generateKeyPairFromSeed(
      "Ed25519",
      new Uint8Array(privateKey),
    );
    const peerId = peerIdFromPrivateKey(privateKeyObj);

    return {
      did: parsed.did,
      peerId,
      libp2pPrivateKey: privateKeyObj,
      publicKey: new Uint8Array(publicKey),
      privateKey: new Uint8Array(privateKey),
    };
  } catch (error) {
    console.error("Failed to load encrypted identity:", error);
    return null;
  }
}

/**
 * Check if encrypted vault exists
 *
 * @param basePath - Optional base path (defaults to current directory)
 * @returns true if vault.enc exists
 */
export function secureVaultExists(basePath: string = process.cwd()): boolean {
  return checkVaultExists({ vaultPath: path.join(basePath, IDENTITY_DIR) });
}

/**
 * Generate a secure random password for vault encryption
 *
 * @param length - Password length (default: 32)
 * @returns Secure random password
 */
export function generateSecurePassword(length: number = 32): string {
  return genSecurePassword(length);
}
