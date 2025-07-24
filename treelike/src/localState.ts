import { BroadcastChannelAdapter } from './adapters/BroadcastChannelAdapter.ts';
import { LocalStorageMemoryAdapter } from './adapters/LocalStorageMemoryAdapter.ts';
import { Node } from './Node.ts';

const NAME = 'localState';

/**
 * Local state is a node that uses local storage and broadcast channel to store and share state.
 */
const localState = new Node({
  id: NAME,
  adapters: [new LocalStorageMemoryAdapter(), new BroadcastChannelAdapter(NAME)],
});

export { localState };
