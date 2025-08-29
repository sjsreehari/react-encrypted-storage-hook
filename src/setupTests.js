import '@testing-library/jest-dom';

// Polyfill TextEncoder and TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock crypto API for testing
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      generateKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      importKey: jest.fn(),
      exportKey: jest.fn(),
    },
    getRandomValues: jest.fn(),
  },
});

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
global.sessionStorage = localStorageMock;

// Mock window.StorageEvent
global.StorageEvent = class StorageEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.key = options.key || null;
    this.newValue = options.newValue || null;
    this.oldValue = options.oldValue || null;
    this.storageArea = options.storageArea || null;
  }
};
