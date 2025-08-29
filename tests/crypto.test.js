import { encryptAES, decryptAES, encryptXOR, decryptXOR } from '../src/components/utils/crypto';

// Mock crypto API
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

Object.defineProperty(window, 'crypto', {
  value: mockCrypto,
});

describe('Crypto Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('XOR Encryption', () => {
    it('should encrypt and decrypt text correctly', () => {
      const secret = 'my-secret-key';
      const text = 'Hello, World!';
      
      const encrypted = encryptXOR(secret, text);
      const decrypted = decryptXOR(secret, encrypted);
      
      expect(encrypted).not.toBe(text);
      expect(decrypted).toBe(text);
    });

    it('should handle empty strings', () => {
      const secret = 'my-secret-key';
      const text = '';
      
      const encrypted = encryptXOR(secret, text);
      const decrypted = decryptXOR(secret, encrypted);
      
      expect(decrypted).toBe(text);
    });

    it('should handle special characters', () => {
      const secret = 'my-secret-key';
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      const encrypted = encryptXOR(secret, text);
      const decrypted = decryptXOR(secret, encrypted);
      
      expect(decrypted).toBe(text);
    });

    it('should handle unicode characters', () => {
      const secret = 'my-secret-key';
      const text = 'Hello 世界 🌍';
      
      const encrypted = encryptXOR(secret, text);
      const decrypted = decryptXOR(secret, encrypted);
      
      expect(decrypted).toBe(text);
    });

    it('should produce different output for same input with different secrets', () => {
      const text = 'Hello, World!';
      const secret1 = 'secret1';
      const secret2 = 'secret2';
      
      const encrypted1 = encryptXOR(secret1, text);
      const encrypted2 = encryptXOR(secret2, text);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('AES Encryption', () => {
    beforeEach(() => {
      // Mock successful AES operations
      mockCrypto.subtle.generateKey.mockResolvedValue('mock-key');
      mockCrypto.subtle.importKey.mockResolvedValue('mock-imported-key');
      mockCrypto.subtle.encrypt.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
      mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('decrypted-text'));
    });

    it('should encrypt and decrypt text correctly', async () => {
      const secret = 'my-secret-key';
      const text = 'Hello, World!';
      
      const encrypted = await encryptAES(secret, text);
      const decrypted = await decryptAES(secret, encrypted);
      
      expect(encrypted).not.toBe(text);
      expect(decrypted).toBe(text);
    });

    it('should handle empty strings', async () => {
      const secret = 'my-secret-key';
      const text = '';
      
      const encrypted = await encryptAES(secret, text);
      const decrypted = await decryptAES(secret, encrypted);
      
      expect(decrypted).toBe(text);
    });

    it('should handle JSON objects', async () => {
      const secret = 'my-secret-key';
      const data = { name: 'John', age: 30, city: 'New York' };
      const text = JSON.stringify(data);
      
      const encrypted = await encryptAES(secret, text);
      const decrypted = await decryptAES(secret, encrypted);
      
      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should throw error when crypto API is not available', async () => {
      // Temporarily remove crypto API
      const originalCrypto = window.crypto;
      delete window.crypto;
      
      const secret = 'my-secret-key';
      const text = 'Hello, World!';
      
      await expect(encryptAES(secret, text)).rejects.toThrow();
      await expect(decryptAES(secret, 'encrypted-data')).rejects.toThrow();
      
      // Restore crypto API
      window.crypto = originalCrypto;
    });

    it('should handle encryption errors', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));
      
      const secret = 'my-secret-key';
      const text = 'Hello, World!';
      
      await expect(encryptAES(secret, text)).rejects.toThrow('Encryption failed');
    });

    it('should handle decryption errors', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));
      
      const secret = 'my-secret-key';
      const encryptedData = 'invalid-encrypted-data';
      
      await expect(decryptAES(secret, encryptedData)).rejects.toThrow('Decryption failed');
    });
  });

  describe('Fallback behavior', () => {
    it('should use XOR when AES is not available', async () => {
      // Remove crypto API
      const originalCrypto = window.crypto;
      delete window.crypto;
      
      const secret = 'my-secret-key';
      const text = 'Hello, World!';
      
      // These should not throw and should use XOR
      const encrypted = await encryptAES(secret, text);
      const decrypted = await decryptAES(secret, encrypted);
      
      expect(decrypted).toBe(text);
      
      // Restore crypto API
      window.crypto = originalCrypto;
    });
  });

  describe('Performance and security', () => {
    it('should produce consistent results for same input', () => {
      const secret = 'my-secret-key';
      const text = 'Hello, World!';
      
      const encrypted1 = encryptXOR(secret, text);
      const encrypted2 = encryptXOR(secret, text);
      
      expect(encrypted1).toBe(encrypted2);
    });

    it('should handle large text', () => {
      const secret = 'my-secret-key';
      const text = 'A'.repeat(10000); // 10KB of text
      
      const encrypted = encryptXOR(secret, text);
      const decrypted = decryptXOR(secret, encrypted);
      
      expect(decrypted).toBe(text);
    });
  });
});
