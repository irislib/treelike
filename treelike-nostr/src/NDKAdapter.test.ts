import 'fake-indexeddb/auto';

import { bytesToHex } from '@noble/hashes/utils';
import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie';
import { waitFor } from '@testing-library/dom';
import { Callback, Unsubscribe } from 'treelike';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NDKAdapter, PublicKey } from '.';
import { NostrEvent, NostrFilter } from './types';

describe('NDKAdapter', () => {
  let adapter: NDKAdapter;
  let i = 0;

  beforeEach(() => {
    const dbName = `treelike-nostr-${i++}`;
    const dexieAdapter = new NDKCacheAdapterDexie({ dbName });
    const ndk = new NDK({
      explicitRelayUrls: [],
      cacheAdapter: dexieAdapter,
    });
    ndk.connect();

    const sk = generateSecretKey(); // `sk` is a Uint8Array
    const pk = getPublicKey(sk); // `pk` is a hex string
    const privateKeyHex = bytesToHex(sk);
    console.log('privateKeyHex:', privateKeyHex);
    const privateKeySigner = new NDKPrivateKeySigner(privateKeyHex);
    ndk.signer = privateKeySigner;
    const publish = (e: Partial<NostrEvent>) => {
      new NDKEvent(ndk, e as NostrEvent).publish();
      return;
    };
    const subscribe = (filter: NostrFilter, onEvent: (e: NostrEvent) => void) => {
      const sub = ndk.subscribe(filter);
      sub.on('event', (event) => {
        onEvent(event.rawEvent() as NostrEvent);
      });
      return () => sub.stop();
    };
    adapter = new NDKAdapter(publish, subscribe, [new PublicKey(pk)]);
  });

  describe('get()', () => {
    it('should retrieve the stored value for a given path', async () => {
      const mockCallback: Callback = vi.fn();
      await adapter.set('somePath', { value: 'someValue', updatedAt: Date.now() });
      const unsubscribe: Unsubscribe = adapter.get('somePath', mockCallback);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith(
          'someValue',
          'somePath',
          expect.any(Number),
          expect.any(Function),
        );
      });
      unsubscribe();
    });
  });

  describe('set()', () => {
    it('should set the value at the given path', async () => {
      await adapter.set('anotherPath', { value: 'newValue', updatedAt: Date.now() });
      const mockCallback: Callback = vi.fn();
      adapter.get('anotherPath', mockCallback);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith(
          'newValue',
          'anotherPath',
          expect.any(Number),
          expect.any(Function),
        );
      });
    });
  });

  describe('list()', () => {
    it('should list child nodes under the given path', async () => {
      const mockCallback: Callback = vi.fn();
      await adapter.set('parent/child1', { value: 'childValue1', updatedAt: Date.now() });
      await adapter.set('parent/child2', { value: 'childValue2', updatedAt: Date.now() });

      const unsubscribe: Unsubscribe = adapter.list('parent', mockCallback);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith(
          'childValue1',
          'parent/child1',
          expect.any(Number),
          expect.any(Function),
        );

        expect(mockCallback).toHaveBeenCalledWith(
          'childValue2',
          'parent/child2',
          expect.any(Number),
          expect.any(Function),
        );
      });

      unsubscribe();
    });
  });
});
