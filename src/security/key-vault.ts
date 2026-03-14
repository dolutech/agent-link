/**
 * Key Vault - Secure Key Storage
 * 
 * Provides encrypted storage for private keys using:
 * - AES-256-GCM for encryption
 * - PBKDF2 for key derivation from password
 * 
 * @module security/key-vault
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types
// ============================================

export interface EncryptedKeyData {
  version: string;
  algorithm: string;
  salt: string;        // Base64
  iv: string;          // Base64
  authTag: string;     // Base64
  ciphertext: string;  // Base64
  createdAt: string;
}

export interface KeyVaultConfig {
  vaultPath?: string;
  iterations?: number; // PBKDF2 iterations (default: 100000)
}

// ============================================
// Constants
// ============================================

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const SALT_LENGTH = 32;
const DEFAULT_ITERATIONS = 100000;
const VAULT_VERSION = '1.0.0';
const VAULT_DIR = '.agentlink';
const VAULT_FILE = 'vault.enc';

// ============================================
// Key Derivation
// ============================================

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer, iterations: number): Buffer {
  return pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256');
}

// ============================================
// Encryption/Decryption
// ============================================

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param data - Data to encrypt (Uint8Array or Buffer)
 * @param password - Encryption password
 * @param iterations - PBKDF2 iterations (default: 100000)
 * @returns Encrypted key data
 */
export function encryptKey(
  data: Uint8Array | Buffer,
  password: string,
  iterations: number = DEFAULT_ITERATIONS
): EncryptedKeyData {
  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  
  // Derive encryption key
  const key = deriveKey(password, salt, iterations);
  
  // Encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(data)),
    cipher.final()
  ]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    version: VAULT_VERSION,
    algorithm: ALGORITHM,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    createdAt: new Date().toISOString()
  };
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encryptedData - Encrypted key data
 * @param password - Decryption password
 * @param iterations - PBKDF2 iterations (default: 100000)
 * @returns Decrypted data
 * @throws Error if decryption fails (wrong password or corrupted data)
 */
export function decryptKey(
  encryptedData: EncryptedKeyData,
  password: string,
  iterations: number = DEFAULT_ITERATIONS
): Buffer {
  // Validate version
  if (encryptedData.version !== VAULT_VERSION) {
    throw new Error(`Unsupported vault version: ${encryptedData.version}`);
  }
  
  // Decode base64 values
  const salt = Buffer.from(encryptedData.salt, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  
  // Derive decryption key
  const key = deriveKey(password, salt, iterations);
  
  // Decrypt
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: wrong password or corrupted data');
  }
}

// ============================================
// Vault Operations
// ============================================

/**
 * Save encrypted key to vault
 */
export async function saveToVault(
  keyData: Uint8Array | Buffer,
  password: string,
  config: KeyVaultConfig = {}
): Promise<void> {
  const vaultPath = config.vaultPath || path.join(process.cwd(), VAULT_DIR);
  const filePath = path.join(vaultPath, VAULT_FILE);
  
  // Create directory if needed
  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath, { recursive: true, mode: 0o700 }); // Restrictive permissions
  }
  
  // Encrypt
  const encrypted = encryptKey(keyData, password, config.iterations);
  
  // Write with restrictive permissions
  fs.writeFileSync(filePath, JSON.stringify(encrypted, null, 2), {
    encoding: 'utf-8',
    mode: 0o600 // Only owner can read/write
  });
}

/**
 * Load encrypted key from vault
 */
export async function loadFromVault(
  password: string,
  config: KeyVaultConfig = {}
): Promise<Buffer | null> {
  const vaultPath = config.vaultPath || path.join(process.cwd(), VAULT_DIR);
  const filePath = path.join(vaultPath, VAULT_FILE);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return decryptKey(data, password, config.iterations);
  } catch (error) {
    console.error('Failed to load from vault:', error);
    return null;
  }
}

/**
 * Check if vault exists
 */
export function vaultExists(config: KeyVaultConfig = {}): boolean {
  const vaultPath = config.vaultPath || path.join(process.cwd(), VAULT_DIR);
  const filePath = path.join(vaultPath, VAULT_FILE);
  return fs.existsSync(filePath);
}

/**
 * Delete vault (secure delete)
 */
export async function deleteVault(config: KeyVaultConfig = {}): Promise<boolean> {
  const vaultPath = config.vaultPath || path.join(process.cwd(), VAULT_DIR);
  const filePath = path.join(vaultPath, VAULT_FILE);
  
  if (fs.existsSync(filePath)) {
    // Overwrite with random data before delete
    const stats = fs.statSync(filePath);
    const randomData = randomBytes(stats.size);
    fs.writeFileSync(filePath, randomData);
    fs.unlinkSync(filePath);
    return true;
  }
  
  return false;
}

// ============================================
// Password Utilities
// ============================================

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars[(bytes[i] ?? 0) % chars.length];
  }
  
  return password;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  return {
    valid: score >= 4,
    score,
    feedback
  };
}
