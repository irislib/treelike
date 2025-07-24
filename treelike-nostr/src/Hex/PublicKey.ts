import { nip19 } from 'nostr-tools';

import { Hex } from './Hex';

/**
 * Nostr public key hex encoded string.
 */
export class PublicKey extends Hex {
  npubValue: string | undefined;

  /**
   * @param str hex or npub encoded string
   * @throws Error if the provided string is not a valid nostr public key
   */
  constructor(str: string) {
    const isNpub = str.startsWith('npub');
    let hexValue = str;
    if (isNpub) {
      const res = nip19.decode(str);
      if (res.type === 'npub') {
        hexValue = res.data;
      } else {
        throw new Error(`failed to decode npub ${str}`);
      }
    }
    super(hexValue, 64);
    if (isNpub) {
      this.npubValue = str; // preserve the original Bech32 value
    }
  }

  get npub(): string {
    if (!this.npubValue) {
      this.npubValue = super.toBech32('npub');
    }
    return this.npubValue;
  }

  equals(other: PublicKey | string): boolean {
    if (typeof other === 'string') {
      if (other === this.value) {
        return true;
      }
      other = new PublicKey(other);
    }
    return this.value === other.value;
  }
}
