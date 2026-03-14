/**
 * Security Tests - Encryption & Signatures
 * 
 * Tests for cryptographic security and attack resistance.
 */

import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  sign,
  verify,
  publicKeyToDid,
  didToPublicKey
} from '../../src/node/identity.js';

describe('Security: Encryption & Signatures', () => {
  describe('Digital Signatures', () => {
    it('should create valid Ed25519 signatures', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test message');
      
      const signature = sign(data, identity.privateKey);
      
      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // Ed25519 signatures are 64 bytes
    });

    it('should verify valid signatures', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test message');
      
      const signature = sign(data, identity.privateKey);
      const isValid = verify(data, signature, identity.publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should reject signature with modified data', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('original message');
      const modifiedData = new TextEncoder().encode('modified message');
      
      const signature = sign(data, identity.privateKey);
      const isValid = verify(modifiedData, signature, identity.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', async () => {
      const identity1 = await generateKeyPair();
      const identity2 = await generateKeyPair();
      const data = new TextEncoder().encode('test message');
      
      const signature = sign(data, identity1.privateKey);
      const isValid = verify(data, signature, identity2.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject corrupted signature', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test message');
      
      const signature = sign(data, identity.privateKey);
      // Corrupt the signature
      const corruptedSignature = new Uint8Array(signature);
      corruptedSignature[0] = corruptedSignature[0]! ^ 0xFF;
      
      const isValid = verify(data, corruptedSignature, identity.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject empty signature', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test message');
      
      const emptySignature = new Uint8Array(64);
      const isValid = verify(data, emptySignature, identity.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong length', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test message');
      
      const wrongLengthSignature = new Uint8Array(32);
      
      // The verify function throws an error for wrong length signatures
      expect(() => verify(data, wrongLengthSignature, identity.publicKey)).toThrow();
    });

    it('should handle large data', async () => {
      const identity = await generateKeyPair();
      const data = new Uint8Array(1024 * 1024); // 1MB
      
      const signature = sign(data, identity.privateKey);
      const isValid = verify(data, signature, identity.publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should handle empty data', async () => {
      const identity = await generateKeyPair();
      const data = new Uint8Array(0);
      
      const signature = sign(data, identity.privateKey);
      const isValid = verify(data, signature, identity.publicKey);
      
      expect(isValid).toBe(true);
    });
  });

  describe('DID (did:key)', () => {
    it('should create valid DID from public key', async () => {
      const identity = await generateKeyPair();
      
      expect(identity.did).toMatch(/^did:key:z6Mk/);
    });

    it('should round-trip public key through DID', async () => {
      const identity = await generateKeyPair();
      
      const extractedKey = didToPublicKey(identity.did);
      
      expect(extractedKey).toEqual(identity.publicKey);
    });

    it('should reject invalid DID format', () => {
      expect(() => didToPublicKey('invalid-did')).toThrow();
      expect(() => didToPublicKey('did:web:example.com')).toThrow();
    });

    it('should produce unique DIDs for different keys', async () => {
      const identity1 = await generateKeyPair();
      const identity2 = await generateKeyPair();
      
      expect(identity1.did).not.toBe(identity2.did);
    });

    it('should create deterministic DID from same seed', async () => {
      const seed = new Uint8Array(32).fill(42);
      
      const identity1 = await generateKeyPair({ seed });
      const identity2 = await generateKeyPair({ seed });
      
      expect(identity1.did).toBe(identity2.did);
    });
  });

  describe('Attack Resistance', () => {
    it('should resist tampering with public key', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test');
      
      const signature = sign(data, identity.privateKey);
      
      // Tamper with public key
      const tamperedPublicKey = new Uint8Array(identity.publicKey);
      tamperedPublicKey[0] = tamperedPublicKey[0]! ^ 0x01;
      
      const isValid = verify(data, signature, tamperedPublicKey);
      
      expect(isValid).toBe(false);
    });

    it('should resist tampering with private key', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test');
      
      // Tamper with private key before signing
      const tamperedPrivateKey = new Uint8Array(identity.privateKey);
      tamperedPrivateKey[0] = tamperedPrivateKey[0]! ^ 0x01;
      
      const signature = sign(data, tamperedPrivateKey);
      
      // Signature should be invalid for original public key
      const isValid = verify(data, signature, identity.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject signature reuse on different message (replay attack simulation)', async () => {
      const identity = await generateKeyPair();
      const message1 = new TextEncoder().encode('message 1');
      const message2 = new TextEncoder().encode('message 2');
      
      const signature1 = sign(message1, identity.privateKey);
      
      // Try to use signature1 on message2
      const isValid = verify(message2, signature1, identity.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should handle null bytes in data', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test\x00message\x00');
      
      const signature = sign(data, identity.privateKey);
      const isValid = verify(data, signature, identity.publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should handle unicode in data', async () => {
      const identity = await generateKeyPair();
      const data = new TextEncoder().encode('test 日本語 🎉');
      
      const signature = sign(data, identity.privateKey);
      const isValid = verify(data, signature, identity.publicKey);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Key Generation', () => {
    it('should generate 32-byte private keys', async () => {
      const identity = await generateKeyPair();
      expect(identity.privateKey.length).toBe(32);
    });

    it('should generate 32-byte public keys', async () => {
      const identity = await generateKeyPair();
      expect(identity.publicKey.length).toBe(32);
    });

    it('should generate valid PeerId', async () => {
      const identity = await generateKeyPair();
      expect(identity.peerId).toBeDefined();
      expect(identity.peerId.toString()).toMatch(/^[0-9a-zA-Z]+$/);
    });

    it('should generate unique keys each time', async () => {
      const keys = await Promise.all([
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair(),
        generateKeyPair()
      ]);
      
      const dids = keys.map(k => k.did);
      const uniqueDids = new Set(dids);
      
      expect(uniqueDids.size).toBe(5);
    });
  });
});