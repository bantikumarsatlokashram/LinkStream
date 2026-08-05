/**
 * End-to-End Encryption (E2EE) utilities using Web Crypto API (AES-256-GCM + PBKDF2 + SHA-256)
 */

export const SALT_BYTES = 16;
export const IV_BYTES = 12;

// Utility to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Utility to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-256-GCM key from passphrase / room PIN
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Calculate SHA-256 hash of file buffer for checksum verification
export async function calculateSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Encrypt chunk using AES-256-GCM
export async function encryptChunk(
  chunk: ArrayBuffer,
  key: CryptoKey
): Promise<{ iv: string; encryptedData: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    chunk
  );

  return {
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    encryptedData: arrayBufferToBase64(encryptedBuffer),
  };
}

// Decrypt chunk using AES-256-GCM
export async function decryptChunk(
  encryptedDataB64: string,
  ivB64: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  const encryptedBuffer = base64ToArrayBuffer(encryptedDataB64);

  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBuffer
  );
}

// Generate random salt
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}
