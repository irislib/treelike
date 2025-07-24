import { JsonValue } from 'treelike/src';
import { publicState } from 'treelike-nostr/src';
import { NostrPublish, NostrSubscribe } from 'treelike-nostr/src/types';
import { useMemo } from 'react';

import { useGroupNodeState, useNodeState } from './useNodeState.ts';

/**
 * React hook to get a public state node with the given authors. A bit similar to React's useState.
 *
 * treelike-nostr peer dependency is required for this hook to work.
 *
 * @param authors
 * @param path
 * @param initialValue
 */
export function usePublicState<T = JsonValue>(
  publish: NostrPublish,
  subscribe: NostrSubscribe,
  authors: string[],
  path: string,
  initialValue: T,
  typeGuard?: (value: JsonValue) => T,
  recursion = 1,
) {
  const node = useMemo(() => publicState(publish, subscribe, authors), [authors]);
  return useNodeState<T>(node, path, initialValue, typeGuard, false, recursion);
}

/**
 * Get the value of a node separately from each author. Returns a Map of authors to values.
 * @param authors
 * @param path
 * @param typeGuard
 * @param recursion
 */
export function usePublicGroupState<T = JsonValue>(
  publish: NostrPublish,
  subscribe: NostrSubscribe,
  authors: string[],
  path: string,
  typeGuard?: (value: JsonValue) => T,
  recursion = 1,
) {
  const node = useMemo(() => publicState(publish, subscribe, authors), [authors]);
  return useGroupNodeState<T>(node, path, typeGuard, false, recursion);
}
