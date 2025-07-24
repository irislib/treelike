import { useCallback, useEffect, useState } from 'react';

import { JsonValue, Node, TypeGuard, Unsubscribe } from '../../treelike/src';

function useNodeStateBase<T = JsonValue>(
  node: Node,
  key: string,
  initialValue: T,
  typeGuard: TypeGuard<T> = (value: JsonValue) => value as T,
  once = false,
  recursion = 1,
  latestOnly = true,
): [T | Map<string, T>, (value: JsonValue) => void] {
  useEffect(() => {
    if (latestOnly && !initialValue) {
      node.get(key).once(
        (val: JsonValue) => {
          initialValue = typeGuard(val);
        },
        undefined,
        recursion,
      );
    }
  }, [node, key, initialValue]);
  const [value, setValue] = useState(latestOnly ? initialValue : new Map<string, T>());
  useEffect(() => {
    const unsub = node.get(key).on(
      (
        new_value: JsonValue,
        _key: string,
        _updatedAt: number | undefined,
        unsubscribe: Unsubscribe,
      ) => {
        if (latestOnly) {
          setValue(typeGuard(new_value));
        } else {
          setValue((prev) => {
            const newMap = new Map<string, T>(prev as Map<string, T>);
            newMap.set(_key, typeGuard(new_value));
            return newMap;
          });
        }
        if (once) {
          unsubscribe();
        }
      },
      undefined,
      recursion,
      undefined,
      latestOnly,
    );
    return unsub;
  }, [node, key, once]);
  const setter = useCallback(
    (new_value: JsonValue) => {
      node.get(key).put(new_value);
    },
    [node, key],
  );
  return [value, setter];
}

/**
 * Similar to React's useState, but for a Node's value. Lets you easily persist your application state locally or sync it over the network.
 * @param node
 * @param key
 * @param initialValue
 * @param once
 * @example const [value, setValue] = useNodeState(publicState, 'apps/canvas/documents/test/name', 'Untitled Canvas'})
 */
export function useNodeState<T = JsonValue>(
  node: Node,
  key: string,
  initialValue: T,
  typeGuard?: TypeGuard<T>,
  once = false,
  recursion = 1,
): [T, (value: JsonValue) => void] {
  return useNodeStateBase(node, key, initialValue, typeGuard, once, recursion, true) as [
    T,
    (value: JsonValue) => void,
  ];
}

export function useGroupNodeState<T = JsonValue>(
  node: Node,
  key: string,
  typeGuard?: TypeGuard<T>,
  once = false,
  recursion = 1,
): [Map<string, T>, (value: JsonValue) => void] {
  return useNodeStateBase(node, key, undefined, typeGuard, once, recursion, false) as [
    Map<string, T>,
    (value: JsonValue) => void,
  ];
}
