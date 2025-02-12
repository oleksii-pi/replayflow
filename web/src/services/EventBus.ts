// web/src/services/EventBus.ts
type Handler = (...args: any[]) => void;

class EventBus {
  private events: { [key: string]: Handler[] } = {};

  on(event: string, handler: Handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  off(event: string, handler?: Handler) {
    if (!this.events[event]) return;
    if (handler) {
      this.events[event] = this.events[event].filter(h => h !== handler);
    } else {
      delete this.events[event];
    }
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(handler => handler(...args));
  }
}

export const eventBus = new EventBus(); 