// setupTests.ts

class MockBroadcastChannel {
  name: string;
  listeners: Array<(event: { data: any }) => void> = [];

  constructor(name: string) {
    this.name = name;
  }

  postMessage(message: any) {
    this.listeners.forEach((listener) => listener({ data: message }));
  }

  addEventListener(event: string, listener: (event: { data: any }) => void) {
    if (event === 'message') {
      this.listeners.push(listener);
    }
  }

  close() {
    this.listeners = [];
  }
}

// Make MockBroadcastChannel available globally in the testing environment
global.BroadcastChannel = MockBroadcastChannel as any;
