import { describe, it, expect } from 'vitest';
import { generateKeyPair, publicKeyToDid, didToPublicKey, sign, verify } from '../../src/node/identity.js';

describe('Identity Module', () => {
  it('should generate a valid keypair', async () => {
    const keypair = await generateKeyPair();
    
    expect(keypair.did).toMatch(/^did:key:z6Mk/);
    expect(keypair.publicKey).toHaveLength(32);
    expect(keypair.privateKey).toHaveLength(32);
    expect(keypair.peerId).toBeDefined();
  });

  it('should convert public key to DID and back', async () => {
    const keypair = await generateKeyPair();
    const extractedKey = didToPublicKey(keypair.did);
    
    expect(extractedKey).toEqual(keypair.publicKey);
  });

  it('should sign and verify data', async () => {
    const keypair = await generateKeyPair();
    const data = new TextEncoder().encode('test message');
    
    const signature = sign(data, keypair.privateKey);
    expect(signature).toHaveLength(64);
    
    const isValid = verify(data, signature, keypair.publicKey);
    expect(isValid).toBe(true);
  });

  it('should reject invalid signatures', async () => {
    const keypair = await generateKeyPair();
    const data = new TextEncoder().encode('test message');
    const wrongData = new TextEncoder().encode('wrong message');
    
    const signature = sign(data, keypair.privateKey);
    const isValid = verify(wrongData, signature, keypair.publicKey);
    
    expect(isValid).toBe(false);
  });
});