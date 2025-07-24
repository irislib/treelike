import { Adapter, Callback, NodeValue, Unsubscribe } from '../types';

/**
 * An adapter that stores data in the browser's local storage and memory.
 */
export class LocalStorageMemoryAdapter implements Adapter {
  private storage = new Map<string, NodeValue>();
  private isLoaded = false;
  private loadingPromise: Promise<void>;
  private resolveLoading: (() => void) | null = null;

  constructor() {
    this.loadingPromise = new Promise((resolve) => {
      this.resolveLoading = resolve;
    });
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) as string;
      let value;
      try {
        value = localStorage.getItem(key) || '';
        value = JSON.parse(value);
      } catch (e) {
        // Ignore
      }
      this.storage.set(key, value);
    }
    this.isLoaded = true;
    if (this.resolveLoading) {
      this.resolveLoading();
    }
  }

  private listFromStorage(path: string, callback: Callback) {
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
  }

  get(path: string, callback: Callback): Unsubscribe {
    const storedValue = this.storage.get(path) || { value: undefined, updatedAt: undefined };
    callback(storedValue.value, path, storedValue.updatedAt, () => {});

    if (!this.isLoaded) {
      this.loadingPromise.then(() => {
        const updatedValue = this.storage.get(path) || { value: undefined, updatedAt: undefined };
        if (updatedValue !== storedValue) {
          callback(updatedValue.value, path, updatedValue.updatedAt, () => {});
        }
      });
    }

    return () => {};
  }

  async set(path: string, value: NodeValue) {
    if (value.updatedAt === undefined) {
      throw new Error(`Invalid value: ${JSON.stringify(value)}`);
    }
    this.storage.set(path, value);
    localStorage.setItem(path, JSON.stringify(value));
  }

  list(path: string, callback: Callback): Unsubscribe {
    this.listFromStorage(path, callback);

    if (!this.isLoaded) {
      this.loadingPromise.then(() => {
        this.listFromStorage(path, callback);
      });
    }

    return () => {};
  }
}
