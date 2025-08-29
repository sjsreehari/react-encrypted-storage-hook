// src/components/utils/crypto.js

// AES helpers
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function encryptAES(secret, data) {
  const key = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret.padEnd(32).slice(0, 32)), // ensure 256-bit
    "AES-GCM",
    false,
    ["encrypt"]
  );

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
  const key = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret.padEnd(32).slice(0, 32)),
    "AES-GCM",
    false,
    ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );
  return textDecoder.decode(decrypted);
}

// Weak fallback XOR
export function encryptXOR(secret, data) {
  const out = data
    .split("")
    .map((ch, i) =>
      String.fromCharCode(ch.charCodeAt(0) ^ secret.charCodeAt(i % secret.length))
    )
    .join("");
  return btoa(out);
}

export function decryptXOR(secret, payload) {
  const raw = atob(payload);
  return raw
    .split("")
    .map((ch, i) =>
      String.fromCharCode(ch.charCodeAt(0) ^ secret.charCodeAt(i % secret.length))
    )
    .join("");
}
