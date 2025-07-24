import { LocalStorageMemoryAdapter } from './adapters/LocalStorageMemoryAdapter.ts';
import {
  Adapter,
  Callback,
  JsonObject,
  JsonValue,
  NodeValue,
  Subscription,
  TypeGuard,
  Unsubscribe,
} from './types.ts';

export const DIRECTORY_VALUE = {};

/**
 * Check if the value is a directory (object with no keys {})
 * @param value
 */
export const isDirectory = (value: JsonValue) =>
  typeof value === 'object' &&
  value !== null && // length 0
  Object.keys(value).length === 0 &&
  !Array.isArray(value);

/**
 * Nodes represent queries into the tree. The actual tree data is stored by Adapters.
 *
 * Node can be a branch node (directory) or a leaf node (value).
 */
export class Node {
  id: string;
  parent: Node | null;
  private children = new Map<string, Node>();
  private onSubscriptions = new Map<number, Subscription>();
  private forEachSubscriptions = new Map<number, Subscription>();
  private adapters: Adapter[];
  private counter = 0;

  /**
   */
  constructor({ id = '', adapters, parent = null }: NodeProps = {}) {
    this.id = id;
    this.parent = parent;
    this.adapters = adapters ?? parent?.adapters ?? [new LocalStorageMemoryAdapter()];
  }

  /**
   * Get a child node
   * @param key
   * @returns {Node}
   * @example node.get('apps/canvas/documents/test').put({name: 'Test Document'})
   * @example node.get('apps').get('canvas').get('documents').get('test').on((value) => console.log(`Document name: ${value.name}`))
   */
  get(key: string): Node {
    const splitKey = key.split('/');
    let node = this.children.get(splitKey[0]);
    if (!node) {
      node = new Node({ id: `${this.id}/${splitKey[0]}`, parent: this });
      this.children.set(splitKey[0], node);
    }
    if (splitKey.length > 1) {
      return node.get(splitKey.slice(1).join('/'));
    }
    return node;
  }

  private async putValue(value: JsonValue, updatedAt: number, expiresAt?: number) {
    if (!isDirectory(value)) {
      this.children = new Map();
    }
    const nodeValue: NodeValue = {
      updatedAt,
      value,
      expiresAt,
    };
    const promises = this.adapters.map((adapter) => adapter.set(this.id, nodeValue));
    this.notifyChange(value, updatedAt);
    await Promise.all(promises);
  }

  private async putChildValues(value: JsonObject, updatedAt: number, expiresAt?: number) {
    const promises = this.adapters.map((adapter) =>
      adapter.set(this.id, { value: DIRECTORY_VALUE, updatedAt, expiresAt }),
    );
    const children = Object.keys(value);
    // the following probably causes the same callbacks to be fired too many times
    const childPromises = children.map((key) => this.get(key).put(value[key], updatedAt));
    await Promise.all([...promises, ...childPromises]);
  }

  /**
   * Set a value to the node. If the value is an object, it will be converted to child nodes.
   * @param value
   * @example node.get('apps/canvas/documents/test').put({name: 'Test Canvas'})
   */
  async put(value: JsonValue, updatedAt = Date.now(), expiresAt?: number) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length
    ) {
      await this.putChildValues(value, updatedAt, expiresAt);
    } else {
      await this.putValue(value, updatedAt, expiresAt);
    }

    if (this.parent) {
      await this.parent.put(DIRECTORY_VALUE, updatedAt);
      const childName = this.id.split('/').pop()!;
      if (!this.parent.children.has(childName)) {
        this.parent.children.set(childName, this);
      }
      for (const [id, { callback, recursion }] of this.parent.forEachSubscriptions) {
        if (!isDirectory(value) || recursion === 0) {
          // TODO callback with the npub path instead of this.id?
          callback(value, this.id, updatedAt, () => {
            this.parent?.forEachSubscriptions.delete(id);
          });
        } else if (recursion > 0) {
          // TODO fix
          //this.open(callback, recursion - 1);
        }
      }
    }
  }

  /**
   * Subscribe to all child nodes, returned in the same object
   */
  open<T = JsonValue>(
    callback: Callback<T>,
    recursion = 0,
    typeGuard = (value: Record<string, JsonValue>) => value as T,
  ): Unsubscribe {
    const aggregated: Record<string, JsonValue> = {};
    let latestTime: number | undefined;
    return this.forEach((childValue, path, updatedAt) => {
      if (updatedAt !== undefined && (!latestTime || latestTime < updatedAt)) {
        latestTime = updatedAt;
      }
      const childName = path.split('/').pop()!;
      aggregated[childName] = childValue;
      callback(typeGuard(aggregated), path.split('/').slice(0, -1).join('/'), latestTime, () => {});
    }, recursion);
  }

  /**
   * Subscribe to the node's value
   */
  on<T = JsonValue>(
    callback: Callback<T>,
    returnIfUndefined: boolean = false,
    recursion = 1,
    typeGuard: TypeGuard<T> = (value: JsonValue) => value as T,
    latestOnly = true,
  ): Unsubscribe {
    let latestValue: NodeValue | null = null;
    const latestByPath = new Map<string, NodeValue>();
    let openUnsubscribe: Unsubscribe | undefined;
    const uniqueId = this.counter++;

    const localCallback: Callback = (value, path, updatedAt, unsubscribe) => {
      const olderThanLatest =
        latestValue !== null && updatedAt !== undefined && latestValue.updatedAt >= updatedAt;
      const noReturnUndefined = !returnIfUndefined && value === undefined;
      if (noReturnUndefined) {
        return;
      }

      if (latestOnly && olderThanLatest) {
        return;
      }

      if (!latestOnly && updatedAt !== undefined) {
        const existing = latestByPath.get(path);
        if (existing && existing.updatedAt >= updatedAt) {
          return;
        }
        latestByPath.set(path, { value, updatedAt });
      }

      const returnUndefined = !latestValue && returnIfUndefined && value === undefined;
      if (returnUndefined) {
        callback(value, path, updatedAt, unsubscribe);
        return;
      }

      if (value !== undefined && updatedAt !== undefined) {
        latestValue = { value, updatedAt };
      }

      if (isDirectory(value) && recursion > 0 && !openUnsubscribe) {
        openUnsubscribe = this.open<T>(callback, recursion - 1, typeGuard);
      }

      if (!isDirectory(value) || recursion === 0) {
        callback(typeGuard(value), path, updatedAt, unsubscribe);
      }
    };

    this.onSubscriptions.set(uniqueId, { callback: localCallback, recursion });

    const adapterUnsubscribes = this.adapters.map((adapter) => adapter.get(this.id, localCallback));

    const unsubscribeAll = () => {
      this.onSubscriptions.delete(uniqueId);
      adapterUnsubscribes.forEach((unsub) => unsub());
      openUnsubscribe?.();
    };

    return unsubscribeAll;
  }

  private notifyChange(value: JsonValue, updatedAt?: number) {
    this.onSubscriptions.forEach(({ callback, recursion }) => {
      if (recursion > 0 && isDirectory(value)) return;
      callback(
        value && typeof value === 'object' ? { ...value } : value, // clone the value if it's an object
        this.id,
        updatedAt,
        () => {},
      );
    });
    // Notify forEachSubscriptions similarly if needed.
  }

  /**
   * Subscribe to child nodes
   * @param callback
   */
  forEach<T = JsonValue>(
    callback: Callback<T>,
    recursion: number = 0,
    typeGuard: TypeGuard<T> = (value: JsonValue) => value as T,
  ): Unsubscribe {
    // should map be called list? on the other hand, map calls back for each change of child node separately
    const id = this.counter++;
    const typedCallback: Callback = (value, path, updatedAt, unsubscribe) => {
      callback(typeGuard(value), path, updatedAt, unsubscribe);
    };
    this.forEachSubscriptions.set(id, { callback: typedCallback, recursion });
    const latestMap = new Map<string, NodeValue<T | undefined>>();

    let adapterSubs: Unsubscribe[] = [];
    const openUnsubs: Record<string, Unsubscribe> = {}; // Changed to a dictionary

    const unsubscribeFromAdapters = () => {
      adapterSubs.forEach((unsub) => unsub());
    };

    const cb: Callback<T> = (value, path, updatedAt) => {
      const latest = latestMap.get(path);
      if (updatedAt !== undefined && latest && latest.updatedAt >= updatedAt) {
        return;
      }

      if (updatedAt !== undefined) {
        latestMap.set(path, { value, updatedAt });
      }

      const childName = path.split('/').pop()!;

      if (recursion > 0 && value && isDirectory(value)) {
        if (!openUnsubs[childName]) {
          // Check if an Unsubscribe exists for this child
          openUnsubs[childName] = this.get(childName).open(callback, recursion - 1);
        }
      } else {
        callback(value, path, updatedAt, () => {
          this.forEachSubscriptions.delete(id);
          unsubscribeFromAdapters();
          Object.values(openUnsubs).forEach((unsub) => unsub()); // Unsubscribe all
        });
      }
    };

    adapterSubs = this.adapters.map((adapter) =>
      adapter.list(this.id, (value, path, updatedAt, unsubscribe) => {
        cb(typeGuard(value), path, updatedAt, unsubscribe);
        return () => {};
      }),
    );

    const unsubscribe = () => {
      this.forEachSubscriptions.delete(id);
      unsubscribeFromAdapters();
      Object.values(openUnsubs).forEach((unsub) => unsub()); // Unsubscribe all
    };

    return unsubscribe;
  }

  /**
   * Same as on(), but will unsubscribe after the first callback
   * @param callback
   */
  once<T = JsonValue>(
    callback?: Callback<T>,
    returnIfUndefined = false,
    recursion = 1,
    typeGuard = (value: JsonValue) => value as T,
  ): Promise<T | undefined> {
    return new Promise((resolve) => {
      let resolved = false;
      const cb: Callback<T> = (value, updatedAt, path, unsub) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
        callback?.(value, updatedAt, path, () => {});
        unsub();
      };
      this.on(cb, returnIfUndefined, recursion, typeGuard);
    });
  }
}

export type NodeProps = {
  id?: string;
  adapters?: Adapter[];
  parent?: Node | null;
};
