treelike
======
treelike is a simple treelike data structure with subscribable nodes. It can be easily synced over different transports.
 
For example, it provides a very simple way for local state management in React applications. The state can be optionally persisted in localStorage or synced between browser tabs.

Similarly, it can be used for "public state" management to synchronize with other users and devices. You can easily build all kinds of decentralized applications where accounts are public keys.

See it in action on [docs.iris.to](https://docs.iris.to/).

It's inspired by [GunDB](https://github.com/amark/gun) and has a similar API.

[Documentation](https://treelike.iris.to/)

## Installation

Just treelike, e.g. local use: 
```
npm install treelike
```

With Nostr: 
```
npm install @nostr-dev-kit/ndk @nostr-dev-kit/ndk-cache-dexie nostr-tools treelike treelike-nostr
```

React hooks:
```
npm install @nostr-dev-kit/ndk @nostr-dev-kit/ndk-cache-dexie nostr-tools treelike treelike-nostr treelike-hooks
```

(non-treelike libs are peer dependencies)

## Examples

### Persist React app local state in localStorage and sync between tabs

```tsx
import { useLocalState } from 'treelike-hooks';

function LoginDialog() {
  const [myPrivateKey, setMyPrivateKey] = useLocalState('user/privateKey', '');
  
  function onChange(e) {
    const val = e.target.value;
    if (val.length === 64) {
      setMyPrivateKey(val);
    }
  }

  if (!myPrivateKey) {
    return (
      <div>
        <input type="password" onChange={onChange} placeholder="Paste private key" />
      </div>
    );
  }
    
  return (
    <div>
      <p>Logged in</p>
      <button onClick={() => setMyPrivateKey('')}>Log out</button>
    </div>
  );
}
```


### Collaborative document editing

Uses the `treelike-nostr` adapter to sync over [Nostr](https://nostr.com).

```tsx
import { usePublicState, useAuthors } from 'treelike-hooks';

function DocumentTitle() {
  // List of users you follow on Nostr.
  // Alternatively, provide an array of public keys.
  const authors =  useAuthors('follows');
  
  const titlePath = 'apps/canvas/documents/myDocument1/title';
  const [docName, setDocName] = usePublicState(authors, titlePath, 'Untitled Document');
    
  return (
    <div>
      <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Document title" />
    </div>
  );
}
```
