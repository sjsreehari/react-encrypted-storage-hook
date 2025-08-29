import React from 'react';
import { renderHook, act, render } from '@testing-library/react';
import { useEncryptedStorage, EncryptedStorageProvider } from '../src/components/useEncryptedStorage';
import { encryptAES, decryptAES, encryptXOR, decryptXOR } from '../src/components/utils/crypto';

// Mock crypto functions
jest.mock('../src/components/utils/crypto', () => ({
  encryptAES: jest.fn(),
  decryptAES: jest.fn(),
  encryptXOR: jest.fn(),
  decryptXOR: jest.fn(),
}));

describe('useEncryptedStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  const wrapper = ({ children }) => (
    <EncryptedStorageProvider secret="test-secret">
      {children}
    </EncryptedStorageProvider>
  );

  describe('Basic functionality', () => {
    it('should initialize with initial value', () => {
      const { result } = renderHook(
        () => useEncryptedStorage('test-key', 'initial-value'),
        { wrapper }
      );

      expect(result.current[0]).toBe('initial-value');
    });

    it('should save and retrieve values', async () => {
      const mockEncrypted = 'encrypted-data';
      encryptXOR.mockReturnValue(mockEncrypted);
      decryptXOR.mockReturnValue('"test-value"');

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', ''),
        { wrapper }
      );

      await act(async () => {
        await result.current[1]('test-value');
      });

      expect(result.current[0]).toBe('test-value');
      expect(encryptXOR).toHaveBeenCalledWith('test-secret', '"test-value"');
      expect(localStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String));
    });
  });

  describe('Storage options', () => {
    it('should use sessionStorage when specified', async () => {
      const mockEncrypted = 'encrypted-data';
      encryptXOR.mockReturnValue(mockEncrypted);

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', '', { storage: 'session' }),
        { wrapper }
      );

      await act(async () => {
        await result.current[1]('test-value');
      });

      expect(sessionStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String));
    });

    it('should use custom storage object', async () => {
      const customStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };

      const mockEncrypted = 'encrypted-data';
      encryptXOR.mockReturnValue(mockEncrypted);

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', '', { storage: customStorage }),
        { wrapper }
      );

      await act(async () => {
        await result.current[1]('test-value');
      });

      expect(customStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String));
    });
  });

  describe('TTL functionality', () => {
    it('should set expiration when TTL is provided', async () => {
      const mockEncrypted = 'encrypted-data';
      encryptXOR.mockReturnValue(mockEncrypted);

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', '', { ttl: 1000 }),
        { wrapper }
      );

      await act(async () => {
        await result.current[1]('test-value');
      });

      const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      expect(savedData.expires).toBeGreaterThan(Date.now());
      expect(savedData.expires).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('should not load expired data', () => {
      const expiredData = {
        data: 'encrypted-data',
        expires: Date.now() - 1000,
      };

      // Mock localStorage.getItem to return expired data
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(expiredData));

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', 'default-value'),
        { wrapper }
      );

      expect(result.current[0]).toBe('default-value');
      expect(localStorage.removeItem).toHaveBeenCalledWith('test-key');

      // Restore original function
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Error handling', () => {
    it('should handle encryption errors gracefully', async () => {
      const onError = jest.fn();
      encryptXOR.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', 'default', { onError }),
        { wrapper }
      );

      await act(async () => {
        await result.current[1]('test-value');
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current[0]).toBe('test-value'); // Value should still be set locally
    });

    it('should handle decryption errors with fallback', () => {
      const onFallback = jest.fn();
      const onError = jest.fn();

      decryptXOR.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const storedData = {
        data: 'encrypted-data',
      };

      // Mock localStorage.getItem
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(storedData));

      renderHook(
        () => useEncryptedStorage('test-key', 'default', { onFallback, onError }),
        { wrapper }
      );

      expect(onFallback).toHaveBeenCalled();

      // Restore original function
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Key rotation', () => {
    it('should re-encrypt data with new secret', async () => {
      const mockEncrypted = 'encrypted-data';
      const mockDecrypted = '"test-value"';
      
      encryptXOR.mockReturnValue(mockEncrypted);
      decryptXOR.mockReturnValue(mockDecrypted);

      const storedData = {
        data: mockEncrypted,
      };

      // Mock localStorage.getItem
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(storedData));

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', 'default'),
        { wrapper }
      );

      await act(async () => {
        await result.current[3]('new-secret');
      });

      expect(decryptXOR).toHaveBeenCalledWith('test-secret', mockEncrypted);
      expect(encryptXOR).toHaveBeenCalledWith('new-secret', mockDecrypted);
      expect(localStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String));

      // Restore original function
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Cross-tab synchronization', () => {
    it('should update when storage changes in other tabs', () => {
      const mockEncrypted = 'encrypted-data';
      decryptXOR.mockReturnValue('"new-value"');

      const { result } = renderHook(
        () => useEncryptedStorage('test-key', 'default'),
        { wrapper }
      );

      // Simulate storage event from another tab
      act(() => {
        const storageEvent = new StorageEvent('storage', {
          key: 'test-key',
          newValue: JSON.stringify({ data: mockEncrypted }),
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current[0]).toBe('new-value');
    });
  });

  describe('Remove functionality', () => {
    it('should remove stored value', () => {
      const { result } = renderHook(
        () => useEncryptedStorage('test-key', 'default'),
        { wrapper }
      );

      act(() => {
        result.current[2]();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('test-key');
      expect(result.current[0]).toBe('default');
    });
  });
});

describe('EncryptedStorageProvider', () => {
  it('should provide global secret to children', () => {
    const TestComponent = () => {
      const [value] = useEncryptedStorage('test-key', 'default');
      return <div>{value}</div>;
    };

    const { container } = render(
      <EncryptedStorageProvider secret="global-secret">
        <TestComponent />
      </EncryptedStorageProvider>
    );

    expect(container.textContent).toBe('default');
  });
});
