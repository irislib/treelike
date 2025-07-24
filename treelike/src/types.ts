export type Unsubscribe = () => void;
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonValue = JsonPrimitive | JsonObject | JsonArray | undefined;
export type NodeValue<T = JsonValue> = {
  updatedAt: number;
  value: T;
  expiresAt?: number;
};
export type Callback<T = JsonValue> = (
  value: T | undefined,
  path: string,
  updatedAt: number | undefined,
  unsubscribe: Unsubscribe,
) => void;

export interface Adapter {
  get(path: string, callback: Callback): Unsubscribe;
  set(path: string, data: NodeValue): Promise<void>;
  list(path: string, callback: Callback): Unsubscribe;
}

export type Subscription = {
  callback: Callback;
  recursion: number;
};

/**
 * Converts a JsonValue to a specific type
 */
export type TypeGuard<T> = (value: JsonValue) => T;
