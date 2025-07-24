import { Adapters, Node } from 'treelike';

import { PublicKey } from './Hex/PublicKey.ts';
import NDKAdapter from './NDKAdapter';
import { NostrPublish, NostrSubscribe } from './types.ts';

/**
 * Create a public state node with the given authors
 * @param authors
 */
const publicState = (
  publish: NostrPublish,
  subscribe: NostrSubscribe,
  authors: string | Array<string | PublicKey>,
) => {
  let pks;
  if (typeof authors === 'string') {
    pks = [new PublicKey(authors)];
  } else {
    pks = authors.map((a) => {
      if (a instanceof PublicKey) {
        return a;
      } else {
        return new PublicKey(a);
      }
    });
  }
  return new Node({
    adapters: [new Adapters.MemoryAdapter(), new NDKAdapter(publish, subscribe, pks)],
  });
};

export default publicState;
