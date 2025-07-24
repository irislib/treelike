import { Adapter, Callback, NodeValue, Unsubscribe } from '../types.ts';

/**
 * Memory-only adapter
 */
export class MemoryAdapter implements Adapter {
  private storage = new Map<string, NodeValue>();

  get(path: string, callback: Callback): Unsubscribe {
    const storedValue = this.storage.get(path) || { value: undefined, updatedAt: undefined };
    callback(storedValue.value, path, storedValue.updatedAt, () => {});
    return () => {};
  }

  async set(path: string, value: NodeValue) {
    if (value.updatedAt === undefined) {
      throw new Error(`Invalid value: ${JSON.stringify(value)}`);
    }
    if (value === undefined) {
      this.storage.delete(path);
    } else {
      this.storage.set(path, value);
    }
  }

  list(path: string, callback: Callback): Unsubscribe {
    for (const [storedPath, storedValue] of this.storage) {
      const remainingPath = storedPath.replace(`${path}/`, '');
      if (
        storedPath.startsWith(`${path}/`) &&
        remainingPath.length &&
        !remainingPath.includes('/')
      ) {
        callback(storedValue.value, storedPath, storedValue.updatedAt, () => {});
      }
    }
    return () => {};
  }
}
