import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEncryptedStorage, EncryptedStorageProvider } from '../src/components/useEncryptedStorage';

// Test component that uses the hook
const TestComponent = ({ key, initialValue, options = {} }) => {
  const [value, setValue, remove, reencrypt] = useEncryptedStorage(key, initialValue, options);
  
  return (
    <div>
      <div data-testid="value">{String(value)}</div>
      <input 
        data-testid="input" 
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value"
      />
      <button data-testid="save" onClick={() => setValue('test-value')}>
        Save Test Value
      </button>
      <button data-testid="remove" onClick={remove}>
        Remove
      </button>
      <button data-testid="reencrypt" onClick={() => reencrypt('new-secret')}>
        Re-encrypt
      </button>
    </div>
  );
};

describe('Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Basic Integration', () => {
    it('should save and retrieve values across component re-renders', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent key="test-key" initialValue="" />
        </EncryptedStorageProvider>
      );

      const input = screen.getByTestId('input');
      const saveButton = screen.getByTestId('save');

      // Save a value
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('test-value');
      });

      // Check that value persists in storage
      expect(localStorage.getItem('test-key')).toBeTruthy();
    });

    it('should handle different storage types', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent 
            key="session-key" 
            initialValue="" 
            options={{ storage: 'session' }}
          />
        </EncryptedStorageProvider>
      );

      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Should use sessionStorage instead of localStorage
      expect(sessionStorage.getItem('session-key')).toBeTruthy();
      expect(localStorage.getItem('session-key')).toBeFalsy();
    });
  });

  describe('TTL Integration', () => {
    it('should respect TTL settings', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent 
            key="ttl-key" 
            initialValue="default" 
            options={{ ttl: 100 }} // 100ms TTL
          />
        </EncryptedStorageProvider>
      );

      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Value should be saved
      expect(screen.getByTestId('value')).toHaveTextContent('test-value');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Re-render component to trigger storage check
      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent 
            key="ttl-key" 
            initialValue="default" 
            options={{ ttl: 100 }}
          />
        </EncryptedStorageProvider>
      );

      // Should revert to default value after TTL expires
      expect(screen.getByTestId('value')).toHaveTextContent('default');
    });
  });

  describe('Cross-tab Synchronization', () => {
    it('should sync changes across tabs', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent key="sync-key" initialValue="default" />
        </EncryptedStorageProvider>
      );

      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Simulate storage event from another tab
      const storedData = localStorage.getItem('sync-key');
      fireEvent(window, new StorageEvent('storage', {
        key: 'sync-key',
        newValue: storedData,
        oldValue: null,
        storageArea: localStorage
      }));

      // Component should update to reflect the change
      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('test-value');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle storage quota exceeded', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      
      // Mock storage quota exceeded
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent 
            key="quota-key" 
            initialValue="default" 
            options={{ onError }}
          />
        </EncryptedStorageProvider>
      );

      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Should call error handler
      expect(onError).toHaveBeenCalled();

      // Restore original function
      localStorage.setItem = originalSetItem;
    });

    it('should handle encryption errors gracefully', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      
      // Mock crypto API to fail
      const originalCrypto = window.crypto;
      delete window.crypto;

      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent 
            key="crypto-key" 
            initialValue="default" 
            options={{ onError, fallback: 'xor' }}
          />
        </EncryptedStorageProvider>
      );

      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Should still work with XOR fallback
      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('test-value');
      });

      // Restore crypto API
      window.crypto = originalCrypto;
    });
  });

  describe('Key Rotation Integration', () => {
    it('should re-encrypt data with new secret', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="old-secret">
          <TestComponent key="rotate-key" initialValue="default" />
        </EncryptedStorageProvider>
      );

      // Save initial value
      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Re-encrypt with new secret
      const reencryptButton = screen.getByTestId('reencrypt');
      await user.click(reencryptButton);

      // Data should still be accessible
      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('test-value');
      });

      // Storage should contain re-encrypted data
      expect(localStorage.getItem('rotate-key')).toBeTruthy();
    });
  });

  describe('Multiple Instances', () => {
    it('should handle multiple instances with different keys', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent key="key1" initialValue="default1" />
          <TestComponent key="key2" initialValue="default2" />
        </EncryptedStorageProvider>
      );

      const saveButtons = screen.getAllByTestId('save');
      
      // Save values in both instances
      await user.click(saveButtons[0]);
      await user.click(saveButtons[1]);

      // Both should have their values
      const values = screen.getAllByTestId('value');
      expect(values[0]).toHaveTextContent('test-value');
      expect(values[1]).toHaveTextContent('test-value');

      // Storage should contain both keys
      expect(localStorage.getItem('key1')).toBeTruthy();
      expect(localStorage.getItem('key2')).toBeTruthy();
    });

    it('should handle multiple instances with same key', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="test-secret">
          <TestComponent key="shared-key" initialValue="default1" />
          <TestComponent key="shared-key" initialValue="default2" />
        </EncryptedStorageProvider>
      );

      const saveButtons = screen.getAllByTestId('save');
      
      // Save value in first instance
      await user.click(saveButtons[0]);

      // Both instances should reflect the change
      const values = screen.getAllByTestId('value');
      expect(values[0]).toHaveTextContent('test-value');
      expect(values[1]).toHaveTextContent('test-value');
    });
  });

  describe('Provider Context', () => {
    it('should use global secret from provider', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="global-secret">
          <TestComponent key="context-key" initialValue="default" />
        </EncryptedStorageProvider>
      );

      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Data should be encrypted with global secret
      const storedData = localStorage.getItem('context-key');
      expect(storedData).toBeTruthy();
      
      // The stored data should be different from plain text
      expect(storedData).not.toContain('test-value');
    });

    it('should override global secret with local secret', async () => {
      const user = userEvent.setup();
      
      render(
        <EncryptedStorageProvider secret="global-secret">
          <TestComponent 
            key="override-key" 
            initialValue="default" 
            options={{ secret: 'local-secret' }}
          />
        </EncryptedStorageProvider>
      );

      const saveButton = screen.getByTestId('save');
      await user.click(saveButton);

      // Data should be encrypted with local secret, not global
      const storedData = localStorage.getItem('override-key');
      expect(storedData).toBeTruthy();
    });
  });
});
