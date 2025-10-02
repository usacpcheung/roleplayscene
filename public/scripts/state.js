// Simple store with pub/sub
import { createProject } from './model.js';

export class Store {
  constructor() {
    this.state = defaultState();
    this.listeners = new Set();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  set(partial) {
    this.state = { ...this.state, ...partial };
    for (const fn of this.listeners) fn(this.state);
  }
  get() { return this.state; }
}

function defaultState() {
  return {
    project: createProject(),
    audioGate: false, // set to true after user gesture
  };
}
