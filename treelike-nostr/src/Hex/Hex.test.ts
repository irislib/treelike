import { describe, expect, it } from 'vitest';

import { PublicKey } from './PublicKey.ts';

describe('PublicKey', () => {
  it('should convert npub bech32 to hex', () => {
    const bech32 = 'npub1g53mukxnjkcmr94fhryzkqutdz2ukq4ks0gvy5af25rgmwsl4ngq43drvk';
    const hex = '4523be58d395b1b196a9b8c82b038b6895cb02b683d0c253a955068dba1facd0';
    const publicKey = new PublicKey(bech32);
    expect(publicKey.hex).toEqual(hex);
    expect(publicKey.npub).toEqual(bech32);
  });

  it('should init from hex', () => {
    const hex = '4523be58d395b1b196a9b8c82b038b6895cb02b683d0c253a955068dba1facd0';
    const publicKey = new PublicKey(hex);
    expect(publicKey.hex).toEqual(hex);
    expect(publicKey.npub).toEqual(
      'npub1g53mukxnjkcmr94fhryzkqutdz2ukq4ks0gvy5af25rgmwsl4ngq43drvk',
    );
  });

  it('should fail with too long hex', () => {
    const hex =
      '4523be58d395b1b196a9b8c82b038b6895cb02b683d0c253a955068dba1facd04523be58d395b1b196a9b8c82b038b6895cb02b683d0c253a955068dba1facd0';
    expect(() => new PublicKey(hex)).toThrow();
  });

  it('equals(hexStr)', () => {
    const hex = '4523be58d395b1b196a9b8c82b038b6895cb02b683d0c253a955068dba1facd0';
    const publicKey = new PublicKey(hex);
    expect(publicKey.equals(hex)).toEqual(true);
  });

  it('equals(PublicKey)', () => {
    const hex = '4523be58d395b1b196a9b8c82b038b6895cb02b683d0c253a955068dba1facd0';
    const publicKey = new PublicKey(hex);
    const publicKey2 = new PublicKey(hex);
    expect(publicKey.equals(publicKey2)).toEqual(true);
  });

  it('equals(bech32)', () => {
    const bech32 = 'npub1g53mukxnjkcmr94fhryzkqutdz2ukq4ks0gvy5af25rgmwsl4ngq43drvk';
    const publicKey = new PublicKey(bech32);
    expect(publicKey.equals(bech32)).toEqual(true);
  });
});
