import { Adapter, Callback, NodeValue, Unsubscribe } from '../types';

/**
 * Sync between browser tabs over a [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).
 */
export class BroadcastChannelAdapter implements Adapter {
  channel: BroadcastChannel;

  constructor(channelName: string) {
    this.channel = new BroadcastChannel(channelName);
  }

  get(path: string, callback: Callback): Unsubscribe {
    const listener = (event: MessageEvent) => {
      const { path: eventPath, value, updatedAt } = JSON.parse(event.data);
      if (eventPath === path) {
        callback(value, path, updatedAt, () =>
          this.channel.removeEventListener('message', listener),
        );
      }
    };

    this.channel.addEventListener('message', listener);

    return () => this.channel.removeEventListener('message', listener);
  }

  async set(path: string, value: NodeValue) {
    if (value && value.updatedAt === undefined) {
      throw new Error(`Invalid value: ${JSON.stringify(value)}`);
    }

    const message = JSON.stringify({
      path,
      value: value.value,
      updatedAt: value.updatedAt,
    });

    this.channel.postMessage(message);
  }

  list(path: string, callback: Callback): Unsubscribe {
    const listener = (event: MessageEvent) => {
      const { path: eventPath, value, updatedAt } = JSON.parse(event.data);
      // Assuming path is a prefix to identify children in this simple example
      if (eventPath.startsWith(`${path}/`)) {
        const childPath = eventPath.substring(path.length + 1);
        if (!childPath.includes('/')) {
          // Direct child check
          callback(value, childPath, updatedAt, () =>
            this.channel.removeEventListener('message', listener),
          );
        }
      }
    };

    this.channel.addEventListener('message', listener);

    return () => this.channel.removeEventListener('message', listener);
  }
}
