// src/components/utils/crypto.js


// AES helpers
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Use PBKDF2 for key derivation (more secure than pad/truncate)
async function deriveKey(secret) {
  if (!secret || typeof secret !== "string" || secret.length < 8) {
    throw new Error("Secret must be a non-empty string of at least 8 characters");
  }
  const salt = textEncoder.encode("Encypher");
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptAES(secret, data) {
  const key = await deriveKey(secret);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(data);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return btoa(
    JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(cipherBuffer)),
    })
  );
}

export async function decryptAES(secret, payload) {
  const { iv, data } = JSON.parse(atob(payload));
  const key = await deriveKey(secret);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );
  return textDecoder.decode(decrypted);
}

// Weak fallback XOR (warn on use)
export function encryptXOR(secret, data) {
  if (typeof window !== "undefined" && window && window.console) {
  window.console.warn && window.console.warn("[Encypher] XOR fallback is insecure and should not be used for sensitive data!");
  }
  if (!secret || typeof secret !== "string" || secret.length < 1) {
    throw new Error("Secret required for XOR fallback");
  }
  const out = data
    .split("")
    .map((ch, i) =>
      String.fromCharCode(ch.charCodeAt(0) ^ secret.charCodeAt(i % secret.length))
    )
    .join("");
  return btoa(out);
}

export function decryptXOR(secret, payload) {
  if (typeof window !== "undefined" && window && window.console) {
  window.console.warn && window.console.warn("[Encypher] XOR fallback is insecure and should not be used for sensitive data!");
  }
  if (!secret || typeof secret !== "string" || secret.length < 1) {
    throw new Error("Secret required for XOR fallback");
  }
  const raw = atob(payload);
  return raw
    .split("")
    .map((ch, i) =>
      String.fromCharCode(ch.charCodeAt(0) ^ secret.charCodeAt(i % secret.length))
    )
    .join("");
}
