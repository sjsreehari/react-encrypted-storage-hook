# Encypher

A lightweight React hook for encrypted localStorage/sessionStorage with a useState-like API. Securely store sensitive data in the browser using AES-GCM (Web Crypto API), with an optional (insecure) XOR fallback for legacy environments.

---

## Features

-  AES-GCM encryption (Web Crypto API)
-  Custom secret per hook or via context provider
-  Optional TTL (time-to-live) for expiring data
-  Works with localStorage, sessionStorage, or custom storage
-  Syncs across tabs/windows
-  XOR fallback for legacy browsers (not secure)
-  Easy API: `[value, setValue, remove, reencrypt]`
-  Tested with React 17/18

---

## Installation

```bash
# npm install encypher
# or
# yarn add encypher
```

---

## Usage

### Basic Example

```jsx
import { useEncryptedStorage } from "encypher";

function MyComponent() {
  const [user, setUser, removeUser] = useEncryptedStorage("user", null, {
    secret: "my-strong-secret",
    storage: "local", // or "session"
    ttl: 3600 * 1000, // 1 hour (optional)
  });

  // ...
}
```

### With Provider (global secret)

```jsx
import { EncryptedStorageProvider, useEncryptedStorage } from "encypher";

function App() {
  return (
    <EncryptedStorageProvider secret="my-global-secret">
      <MyComponent />
    </EncryptedStorageProvider>
  );
}
```

### Custom Storage

```js
const customStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

const [data, setData] = useEncryptedStorage("key", {}, { secret, storage: customStorage });
```

---

## API

### `useEncryptedStorage(key, initialValue, options)`

- `key` (string): Storage key
- `initialValue` (any): Initial value if not present
- `options` (object):
  - `secret` (string): Encryption secret (required)
  - `storage` ("local" | "session" | object): Storage backend (default: "local")
  - `ttl` (number): Time-to-live in ms (optional)
  - `fallback` ("xor"): Use XOR fallback if AES unavailable (default: "xor")
  - `onFallback` (function): Called if fallback is used
  - `onError` (function): Called on error
  - `onReencrypt` (function): Called after re-encryption

**Returns:**  
`[value, setValue, remove, reencrypt]`

- `value`: Current value
- `setValue(val)`: Set and encrypt value (async)
- `remove()`: Remove value from storage
- `reencrypt(newSecret)`: Re-encrypt with a new secret (async)

---

## Security Notes

- **Always use a strong, unique secret.**
- The XOR fallback is insecure and should only be used for non-sensitive data or legacy support.
- The secret is derived using PBKDF2 for AES-256, but you must still use a cryptographically strong secret.
- Data is only as secure as the environment and the strength of your secret.

---

## Limitations

- Only works in browsers with the Web Crypto API for AES-GCM.
- Only JSON-serializable values are supported.
- Not suitable for highly sensitive or regulated data.

---

## License

MIT

---

## Contributing

PRs and issues welcome!

---

## Author

[Sreehari S J](mailto:sjsreehari@gmail.com)
