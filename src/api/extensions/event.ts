class Event {
  listeners: Function[];

  constructor() {
    this.listeners = [];
  }

  addListener(callback: Function): void {
    this.listeners.push(callback);
  }

  removeListener(callback: Function): void {
    this.listeners = this.listeners.filter(c => (c !== callback));
  }

  emit(...args): void {
    for (const listener of this.listeners) {
      try {
        listener(...args);
      } catch (err) {
        // (TODO) we got here becase we didn't clear all listeners related to certain extension
        // tslint:disable-next-line:no-console
        // console.error(err);
        this.removeListener(listener);
      }
    }
  }
}

export default Event;
