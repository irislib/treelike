import { JsonValue, localState, TypeGuard } from '../../treelike/src';
import { useNodeState } from './useNodeState.ts';

export function useLocalState<T>(
  key: string,
  initialValue: T,
  typeGuard: TypeGuard<T> = (value: JsonValue) => value as T,
  recursion = 1,
): [T, (value: JsonValue) => void] {
  return useNodeState(localState, key, initialValue, typeGuard, false, recursion);
}
