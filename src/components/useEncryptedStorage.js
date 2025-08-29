
/**
 * useEncryptedStorage React hook
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @param {object} options
 * @param {string} options.secret
 * @param {"local"|"session"|object} [options.storage]
 * @param {number} [options.ttl]
 * @param {string} [options.fallback]
 * @returns {[T, (val: T) => Promise<void>, () => void]}
 */
import React from "react";
import { useState, useEffect, useCallback, useRef, useContext, createContext } from "react";
import { encryptAES, decryptAES, encryptXOR, decryptXOR } from "./utils/crypto";

const GlobalSecretContext = createContext();

function hasAES() {
  return typeof window !== "undefined" && window.crypto && window.crypto.subtle;
}

function getStorage(storage) {
  if (typeof storage === "object" && storage !== null) return storage;
  if (storage === "session") return sessionStorage;
  return localStorage;
}

export function useEncryptedStorage(key, initialValue, options) {
  const globalSecret = useContext(GlobalSecretContext);
  const { secret = globalSecret, storage = "local", ttl, fallback = "xor", onFallback, onError, onReencrypt } = options || {};
  const storageObj = getStorage(storage);
  const [value, setValue] = useState(initialValue);
  const isMounted = useRef(true);
  const lock = useRef(false);

  // Helper: robust parse
  function safeParse(val) {
    try { return JSON.parse(val); } catch { return undefined; }
  }

  // Load stored value on mount (async)
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      if (!storageObj) return;
      try {
        const raw = storageObj.getItem(key);
        if (!raw) return;
        const parsed = safeParse(raw);
        if (!parsed) return;
        if (ttl && parsed.expires && Date.now() > parsed.expires) {
          storageObj.removeItem(key);
          return;
        }
        let decrypted;
        try {
          if (hasAES()) {
            decrypted = await decryptAES(secret, parsed.data);
          } else if (fallback === "xor") {
            if (onFallback) onFallback();
            decrypted = decryptXOR(secret, parsed.data);
          } else {
            throw new Error("No crypto available");
          }
        } catch (e) {
          if (fallback === "xor") {
            if (onFallback) onFallback();
            decrypted = decryptXOR(secret, parsed.data);
          } else {
            if (onError) onError(e);
            throw e;
          }
        }
        if (isMounted.current) setValue(safeParse(decrypted));
      } catch (err) {
        if (isMounted.current) setValue(initialValue);
        if (onError) onError(err);
      }
    })();
    return () => { isMounted.current = false; };
  }, [key, secret]);

  // Sync across tabs
  useEffect(() => {
    if (!storageObj) return;
    const handler = (e) => {
      if (e.key === key) {
        if (!e.newValue) {
          if (isMounted.current) setValue(initialValue);
          return;
        }
        (async () => {
          try {
            const parsed = safeParse(e.newValue);
            if (!parsed) return;
            let decrypted;
            if (hasAES()) {
              decrypted = await decryptAES(secret, parsed.data);
            } else if (fallback === "xor") {
              if (onFallback) onFallback();
              decrypted = decryptXOR(secret, parsed.data);
            }
            if (isMounted.current) setValue(safeParse(decrypted));
          } catch (err) {
            if (isMounted.current) setValue(initialValue);
            if (onError) onError(err);
          }
        })();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key, secret, initialValue]);

  // Save value (async, handles crypto, TTL, serialization, quota, lock)
  const save = useCallback(
    async (val) => {
      if (lock.current) return; // prevent race
      lock.current = true;
      setValue(val);
      let encrypted;
      try {
        if (hasAES()) {
          encrypted = await encryptAES(secret, JSON.stringify(val));
        } else if (fallback === "xor") {
          if (onFallback) onFallback();
          encrypted = encryptXOR(secret, JSON.stringify(val));
        } else {
          throw new Error("No crypto available");
        }
      } catch (err) {
        if (fallback === "xor") {
          if (onFallback) onFallback();
          encrypted = encryptXOR(secret, JSON.stringify(val));
        } else {
          if (onError) onError(err);
          lock.current = false;
          return;
        }
      }
      const payload = {
        data: encrypted,
        ...(ttl ? { expires: Date.now() + ttl } : {}),
      };
      try {
        storageObj.setItem(key, JSON.stringify(payload));
        // Manual event for same-tab listeners
        window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(payload) }));
      } catch (err) {
        if (onError) onError(err);
        // Storage quota exceeded or unavailable
      }
      lock.current = false;
    },
    [key, secret, ttl, fallback, onFallback, onError]
  );

  // Remove value
  const remove = useCallback(() => {
    if (!storageObj) return;
    storageObj.removeItem(key);
    setValue(initialValue);
    // Manual event for same-tab listeners
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: null }));
  }, [key, initialValue]);

  // Manual re-encrypt/rotate
  const reencrypt = useCallback(async (newSecret) => {
    if (!storageObj) return;
    const raw = storageObj.getItem(key);
    if (!raw) return;
    const parsed = safeParse(raw);
    if (!parsed) return;
    let decrypted;
    try {
      if (hasAES()) {
        decrypted = await decryptAES(secret, parsed.data);
      } else if (fallback === "xor") {
        decrypted = decryptXOR(secret, parsed.data);
      }
      // re-encrypt with new secret
      let encrypted;
      if (hasAES()) {
        encrypted = await encryptAES(newSecret, decrypted);
      } else if (fallback === "xor") {
        encrypted = encryptXOR(newSecret, decrypted);
      }
      const payload = {
        data: encrypted,
        ...(ttl ? { expires: Date.now() + ttl } : {}),
      };
      storageObj.setItem(key, JSON.stringify(payload));
      if (onReencrypt) onReencrypt();
    } catch (err) {
      if (onError) onError(err);
    }
  }, [key, secret, ttl, fallback, onReencrypt, onError]);

  return [value, save, remove, reencrypt];
}

// Provider for global secret
export function EncryptedStorageProvider({ secret, children }) {
  return <GlobalSecretContext.Provider value={secret}>{children}</GlobalSecretContext.Provider>;
}
