import React from 'react';
import { renderHook } from '@testing-library/react';
import { useEncryptedStorage, EncryptedStorageProvider } from '../src/components/useEncryptedStorage';

// Simple test to verify the hook can be used
describe('Simple Hook Test', () => {
  it('should initialize with default value', () => {
    const wrapper = ({ children }) => (
      <EncryptedStorageProvider secret="test-secret">
        {children}
      </EncryptedStorageProvider>
    );

    const { result } = renderHook(
      () => useEncryptedStorage('test-key', 'default-value'),
      { wrapper }
    );

    expect(result.current[0]).toBe('default-value');
  });

  it('should return an array with 4 elements', () => {
    const wrapper = ({ children }) => (
      <EncryptedStorageProvider secret="test-secret">
        {children}
      </EncryptedStorageProvider>
    );

    const { result } = renderHook(
      () => useEncryptedStorage('test-key', 'default-value'),
      { wrapper }
    );

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current).toHaveLength(4);
  });

  it('should have the expected function names', () => {
    const wrapper = ({ children }) => (
      <EncryptedStorageProvider secret="test-secret">
        {children}
      </EncryptedStorageProvider>
    );

    const { result } = renderHook(
      () => useEncryptedStorage('test-key', 'default-value'),
      { wrapper }
    );

    const [value, setValue, remove, reencrypt] = result.current;
    
    expect(typeof value).toBe('string');
    expect(typeof setValue).toBe('function');
    expect(typeof remove).toBe('function');
    expect(typeof reencrypt).toBe('function');
  });
});
