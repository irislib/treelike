import 'fake-indexeddb/auto'; // Automatically sets up fake IndexedDB globally

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Callback, Unsubscribe } from '../types.ts';
import { IndexedDBAdapter } from './IndexedDBAdapter.ts';

describe('IndexedDBAdapter with fake-indexeddb', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    vi.clearAllMocks();
    adapter = new IndexedDBAdapter('testDB', 'testStore');
    await adapter['dbReady']; // Wait for DB initialization
  });

  describe('get()', () => {
    it('should retrieve the stored value for a given path', async () => {
      const mockCallback: Callback = vi.fn();
      const mockValue = { value: 'testValue', updatedAt: Date.now() };

      await adapter.set('somePath', mockValue);
      const unsubscribe: Unsubscribe = adapter.get('somePath', mockCallback);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        'testValue',
        'somePath',
        mockValue.updatedAt,
        expect.any(Function),
      );
      unsubscribe();
    });
  });

  describe('set()', () => {
    it('should set the value at the given path', async () => {
      const mockCallback: Callback = vi.fn();
      const mockValue = { value: 'newValue', updatedAt: Date.now() };

      await adapter.set('anotherPath', mockValue);
      adapter.get('anotherPath', mockCallback);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        'newValue',
        'anotherPath',
        mockValue.updatedAt,
        expect.any(Function),
      );
    });
  });

  describe('list()', () => {
    it('should list child nodes under the given path', async () => {
      const mockCallback: Callback = vi.fn();
      const mockValue1 = { value: 'childValue1', updatedAt: Date.now() };
      const mockValue2 = { value: 'childValue2', updatedAt: Date.now() };

      await adapter.set('parent/child1', mockValue1);
      await adapter.set('parent/child2', mockValue2);
      const unsubscribe: Unsubscribe = adapter.list('parent', mockCallback);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCallback).toHaveBeenCalledWith(
        'childValue1',
        'parent/child1',
        mockValue1.updatedAt,
        expect.any(Function),
      );
      expect(mockCallback).toHaveBeenCalledWith(
        'childValue2',
        'parent/child2',
        mockValue2.updatedAt,
        expect.any(Function),
      );

      unsubscribe();
    });
  });
});
