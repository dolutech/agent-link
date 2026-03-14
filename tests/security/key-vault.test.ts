/**
 * Key Vault Security Tests
 * 
 * Tests for secure key storage with AES-256-GCM encryption.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  encryptKey,
  decryptKey,
  saveToVault,
  loadFromVault,
  vaultExists,
  deleteVault,
  generateSecurePassword,
  validatePasswordStrength,
  EncryptedKeyData
} from '../../src/security/key-vault.js';

describe('Key Vault', () => {
  const testVaultDir = './test-vault';

  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const data = Buffer.from('secret private key data');
      const password = 'secure-password-123';

      const encrypted = encryptKey(data, password);
      const decrypted = decryptKey(encrypted, password);

      expect(decrypted.toString()).toBe(data.toString());
    });

    it('should produce different ciphertext for same data', () => {
      const data = Buffer.from('same data');
      const password = 'password';

      const encrypted1 = encryptKey(data, password);
      const encrypted2 = encryptKey(data, password);

      // Different due to random salt and IV
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong password', () => {
      const data = Buffer.from('secret');
      const encrypted = encryptKey(data, 'correct-password');

      expect(() => decryptKey(encrypted, 'wrong-password')).toThrow(
        'Decryption failed: wrong password or corrupted data'
      );
    });

    it('should fail decryption with corrupted ciphertext', () => {
      const data = Buffer.from('secret');
      const encrypted = encryptKey(data, 'password');

      // Corrupt the ciphertext
      const corrupted: EncryptedKeyData = {
        ...encrypted,
        ciphertext: Buffer.from('corrupted').toString('base64')
      };

      expect(() => decryptKey(corrupted, 'password')).toThrow();
    });

    it('should fail decryption with corrupted auth tag', () => {
      const data = Buffer.from('secret');
      const encrypted = encryptKey(data, 'password');

      // Corrupt the auth tag
      const corrupted: EncryptedKeyData = {
        ...encrypted,
        authTag: Buffer.from('corrupted').toString('base64')
      };

      expect(() => decryptKey(corrupted, 'password')).toThrow();
    });

    it('should reject unsupported vault version', () => {
      const data = Buffer.from('secret');
      const encrypted = encryptKey(data, 'password');

      const wrongVersion: EncryptedKeyData = {
        ...encrypted,
        version: '2.0.0'
      };

      expect(() => decryptKey(wrongVersion, 'password')).toThrow(
        'Unsupported vault version'
      );
    });

    it('should include all required fields in encrypted data', () => {
      const data = Buffer.from('test');
      const encrypted = encryptKey(data, 'password');

      expect(encrypted.version).toBe('1.0.0');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.createdAt).toBeDefined();
    });
  });

  describe('Vault Operations', () => {
    it('should save and load from vault', async () => {
      const data = Buffer.from('private key data');
      const password = 'vault-password';

      await saveToVault(data, password, { vaultPath: testVaultDir });
      const loaded = await loadFromVault(password, { vaultPath: testVaultDir });

      expect(loaded?.toString()).toBe(data.toString());
    });

    it('should detect if vault exists', async () => {
      expect(vaultExists({ vaultPath: testVaultDir })).toBe(false);

      await saveToVault(Buffer.from('data'), 'password', { vaultPath: testVaultDir });

      expect(vaultExists({ vaultPath: testVaultDir })).toBe(true);
    });

    it('should return null if vault does not exist', async () => {
      const loaded = await loadFromVault('password', { vaultPath: testVaultDir });
      expect(loaded).toBeNull();
    });

    it('should delete vault securely', async () => {
      const data = Buffer.from('secret data');
      await saveToVault(data, 'password', { vaultPath: testVaultDir });

      const deleted = await deleteVault({ vaultPath: testVaultDir });

      expect(deleted).toBe(true);
      expect(vaultExists({ vaultPath: testVaultDir })).toBe(false);
    });

    it('should return false when deleting non-existent vault', async () => {
      const deleted = await deleteVault({ vaultPath: testVaultDir });
      expect(deleted).toBe(false);
    });

    it('should create vault directory with restrictive permissions', async () => {
      await saveToVault(Buffer.from('data'), 'password', { vaultPath: testVaultDir });

      const stats = fs.statSync(testVaultDir);
      // Check permission bits (0o700 = read/write/execute for owner only)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o700);
    });

    it('should create vault file with restrictive permissions', async () => {
      await saveToVault(Buffer.from('data'), 'password', { vaultPath: testVaultDir });

      const filePath = path.join(testVaultDir, 'vault.enc');
      const stats = fs.statSync(filePath);
      // Check permission bits (0o600 = read/write for owner only)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  describe('Password Utilities', () => {
    it('should generate secure password of specified length', () => {
      const password = generateSecurePassword(32);
      expect(password.length).toBe(32);
    });

    it('should generate unique passwords', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      expect(password1).not.toBe(password2);
    });

    it('should validate strong password', () => {
      const result = validatePasswordStrength('SecureP@ssw0rd!');
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.feedback).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should provide feedback for improvement', () => {
      const result = validatePasswordStrength('password');
      expect(result.feedback).toContain('Add uppercase letters');
      expect(result.feedback).toContain('Add numbers');
      expect(result.feedback).toContain('Add special characters');
    });

    it('should accept 8-character password with mixed types', () => {
      const result = validatePasswordStrength('Passw0rd');
      expect(result.valid).toBe(true);
    });

    it('should prefer 12+ character passwords', () => {
      const shortResult = validatePasswordStrength('Passw0rd');
      const longResult = validatePasswordStrength('Passw0rd1234');
      expect(longResult.score).toBeGreaterThan(shortResult.score);
    });
  });

  describe('Security Scenarios', () => {
    it('should handle empty data', () => {
      const data = Buffer.alloc(0);
      const encrypted = encryptKey(data, 'password');
      const decrypted = decryptKey(encrypted, 'password');
      expect(decrypted.length).toBe(0);
    });

    it('should handle large data', () => {
      const data = Buffer.alloc(1024 * 1024, 'x'); // 1MB
      const encrypted = encryptKey(data, 'password');
      const decrypted = decryptKey(encrypted, 'password');
      expect(decrypted.length).toBe(data.length);
    });

    it('should handle unicode passwords', () => {
      const data = Buffer.from('secret');
      const password = 'パスワード123!@#';
      
      const encrypted = encryptKey(data, password);
      const decrypted = decryptKey(encrypted, password);
      
      expect(decrypted.toString()).toBe('secret');
    });

    it('should handle special characters in data', () => {
      const data = Buffer.from('secret\x00with\x00nulls');
      const encrypted = encryptKey(data, 'password');
      const decrypted = decryptKey(encrypted, 'password');
      expect(decrypted.toString()).toBe(data.toString());
    });
  });
});