import { Adapter, Callback, NodeValue, Unsubscribe } from '../types';

/**
 * IndexedDB adapter that works in both main thread and service worker contexts
 */
export class IndexedDBAdapter implements Adapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;
  private callbacks = new Map<string, Set<Callback>>();
  private idbFactory: IDBFactory;

  constructor(dbName = 'treelike', storeName = 'keyval') {
    this.dbName = dbName;
    this.storeName = storeName;
    // Use the appropriate IDBFactory depending on context
    this.idbFactory = typeof window !== 'undefined' ? window.indexedDB : self.indexedDB;
    this.dbReady = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.idbFactory.open(this.dbName, 1);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB blocked. Please close other tabs/windows.');
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle connection errors
        this.db.onerror = (event) => {
          console.error('IndexedDB error:', (event as ErrorEvent).error);
        };

        // Handle version change (e.g., another tab/worker upgrades the DB)
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.dbReady = this.initDB();
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Create store with a compound index for path-based queries
          const store = db.createObjectStore(this.storeName, { keyPath: 'path' });
          store.createIndex('pathIndex', 'path', { unique: true });
          store.createIndex('updatedAtIndex', 'updatedAt');
        }
      };
    });
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.dbReady;
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(this.storeName, mode);
    return transaction.objectStore(this.storeName);
  }

  private addCallback(path: string, callback: Callback) {
    if (!this.callbacks.has(path)) {
      this.callbacks.set(path, new Set());
    }
    this.callbacks.get(path)!.add(callback);
  }

  private removeCallback(path: string, callback: Callback) {
    const callbacks = this.callbacks.get(path);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.callbacks.delete(path);
      }
    }
  }

  get(path: string, callback: Callback): Unsubscribe {
    this.getStore()
      .then((store) => {
        const request = store.get(path);

        request.onsuccess = () => {
          const record = request.result;
          if (record) {
            const { value, updatedAt } = record;
            callback(value, path, updatedAt, () => this.removeCallback(path, callback));
          } else {
            callback(undefined, path, undefined, () => this.removeCallback(path, callback));
          }
        };

        request.onerror = () => {
          console.error('Error reading from IndexedDB:', request.error);
          callback(undefined, path, undefined, () => this.removeCallback(path, callback));
        };
      })
      .catch((error) => {
        console.error('IndexedDB get error:', error);
        callback(undefined, path, undefined, () => {});
      });

    this.addCallback(path, callback);
    return () => this.removeCallback(path, callback);
  }

  async set(path: string, value: NodeValue): Promise<void> {
    if (value.updatedAt === undefined) {
      throw new Error(`Invalid value: ${JSON.stringify(value)}`);
    }

    try {
      const store = await this.getStore('readwrite');
      const record = {
        path,
        value: value.value,
        updatedAt: value.updatedAt,
        expiresAt: value.expiresAt,
      };

      return new Promise((resolve, reject) => {
        const request = store.put(record);

        request.onsuccess = () => {
          const callbacks = this.callbacks.get(path);
          if (callbacks) {
            callbacks.forEach((callback) => {
              callback(value.value, path, value.updatedAt, () =>
                this.removeCallback(path, callback),
              );
            });
          }
          resolve();
        };

        request.onerror = () => {
          console.error('Error writing to IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('IndexedDB set error:', error);
      throw error;
    }
  }

  list(path: string, callback: Callback): Unsubscribe {
    this.getStore()
      .then((store) => {
        const index = store.index('pathIndex');
        const range = IDBKeyRange.bound(`${path}/`, `${path}/\uffff`, false, false);

        const request = index.openCursor(range);

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const record = cursor.value;
            const storedPath = record.path;
            const remainingPath = storedPath.replace(`${path}/`, '');

            if (!remainingPath.includes('/')) {
              callback(record.value, storedPath, record.updatedAt, () =>
                this.removeCallback(path, callback),
              );
            }
            cursor.continue();
          }
        };

        request.onerror = () => {
          console.error('Error listing from IndexedDB:', request.error);
        };
      })
      .catch((error) => {
        console.error('IndexedDB list error:', error);
      });

    this.addCallback(path, callback);
    return () => this.removeCallback(path, callback);
  }

  /**
   * Delete expired entries. Can be called periodically for cleanup.
   */
  async cleanup(): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      const now = Date.now();
      const index = store.index('updatedAtIndex');
      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value;
          if (record.expiresAt && record.expiresAt < now) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
    }
  }
}
