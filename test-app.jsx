import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { useEncryptedStorage, EncryptedStorageProvider } from "./src/components/useEncryptedStorage";

function Demo() {
  const [input, setInput] = useState("");
  const [ttl, setTtl] = useState(0);
  const [secret, setSecret] = useState("mySecret");
  const [storageType, setStorageType] = useState("local");
  const [value, setValue, remove, reencrypt] = useEncryptedStorage("testKey", "", { 
    secret, 
    ttl: ttl ? parseInt(ttl) : undefined,
    storage: storageType
  });

  const [newSecret, setNewSecret] = useState("");
  const [status, setStatus] = useState("");

  const handleSave = async () => {
    try {
      await setValue(input);
      setStatus("✅ Value saved successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleRemove = () => {
    remove();
    setStatus("🗑️ Value removed!");
    setTimeout(() => setStatus(""), 3000);
  };

  const handleReencrypt = async () => {
    if (!newSecret) {
      setStatus("❌ Please enter a new secret");
      return;
    }
    try {
      await reencrypt(newSecret);
      setSecret(newSecret);
      setNewSecret("");
      setStatus("🔄 Data re-encrypted with new secret!");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      setStatus(`❌ Re-encryption failed: ${error.message}`);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <div className="demo-section">
        <h3>🔧 Configuration</h3>
        <div className="form-group">
          <label>Secret Key:</label>
          <input 
            value={secret} 
            onChange={e => setSecret(e.target.value)}
            placeholder="Enter encryption secret"
          />
        </div>
        <div className="form-group">
          <label>Storage Type:</label>
          <select 
            value={storageType} 
            onChange={e => setStorageType(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="local">Local Storage</option>
            <option value="session">Session Storage</option>
          </select>
        </div>
        <div className="form-group">
          <label>TTL (Time To Live) in milliseconds:</label>
          <input 
            type="number" 
            value={ttl} 
            onChange={e => setTtl(e.target.value)}
            placeholder="0 = no expiration"
          />
        </div>
      </div>

      <div className="demo-section">
        <h3>💾 Save & Retrieve</h3>
        <div className="form-group">
          <label>Value to Store:</label>
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            placeholder="Enter any value to encrypt and store"
          />
        </div>
        <div className="button-group">
          <button onClick={handleSave}>Save Value</button>
          <button onClick={handleRemove}>Remove Value</button>
        </div>
        <div className="result">
          <strong>Current Value:</strong> {String(value) || "(empty)"}
        </div>
      </div>

      <div className="demo-section">
        <h3>🔄 Key Rotation</h3>
        <div className="form-group">
          <label>New Secret Key:</label>
          <input 
            value={newSecret} 
            onChange={e => setNewSecret(e.target.value)}
            placeholder="Enter new secret to re-encrypt data"
          />
        </div>
        <button onClick={handleReencrypt}>Re-encrypt with New Secret</button>
      </div>

      <div className="demo-section">
        <h3>📊 Status</h3>
        <div className="result" style={{ background: status.includes('❌') ? '#ffe6e6' : '#e8f5e8' }}>
          {status || "Ready for testing"}
        </div>
      </div>

      <div className="demo-section">
        <h3>🧪 Testing Tips</h3>
        <ul>
          <li><strong>Test Persistence:</strong> Save a value, refresh the page, and see it restored</li>
          <li><strong>Test TTL:</strong> Set TTL to 1000ms, save a value, wait 1 second, refresh - value should be gone</li>
          <li><strong>Test Cross-tab:</strong> Open this page in two tabs, save in one, see it appear in the other</li>
          <li><strong>Test Encryption:</strong> Open Dev Tools → Application → Storage to see encrypted data</li>
          <li><strong>Test Key Rotation:</strong> Save data, change secret, re-encrypt, verify data is still accessible</li>
        </ul>
      </div>
    </div>
  );
}

function App() {
  return (
    <EncryptedStorageProvider secret="mySecret">
      <Demo />
    </EncryptedStorageProvider>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
