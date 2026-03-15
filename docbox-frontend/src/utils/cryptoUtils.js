/**
 * cryptoUtils.js
 * src/utils/cryptoUtils.js
 *
 * AES-256-GCM encryption helpers for secure offline document storage.
 *
 * Keys are derived from the user's auth token via PBKDF2 — the key is
 * NEVER stored anywhere. When the token is removed on logout, all cached
 * documents become permanently undecryptable even if someone dumps the
 * raw IndexedDB files from disk.
 *
 * Supports every binary format stored offline:
 *   PDF, JPG, JPEG, PNG, GIF, WEBP, SVG, BMP, TIFF
 */

const ALGO        = { name: 'AES-GCM', length: 256 };
const PBKDF2_ITER = 100_000;
const SALT        = 'docbox-offline-v1';

/**
 * Derives an AES-256-GCM CryptoKey from the user's auth token.
 * Deterministic: same token → same key every call.
 *
 * @param   {string}     token   JWT access token from localStorage
 * @returns {Promise<CryptoKey>}
 */
export const deriveKey = async (token) => {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(token),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt:       encoder.encode(SALT),
      iterations: PBKDF2_ITER,
      hash:       'SHA-256',
    },
    keyMaterial,
    ALGO,
    false,           // not extractable — key can never be exported
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts any ArrayBuffer (PDF bytes, image bytes, etc.) with AES-256-GCM.
 *
 * @param   {CryptoKey}    key     From deriveKey()
 * @param   {ArrayBuffer}  buffer  Raw file bytes (any format)
 * @returns {Promise<{ iv: Uint8Array, ciphertext: Uint8Array }>}
 */
export const encryptBuffer = async (key, buffer) => {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer
  );

  return { iv, ciphertext: new Uint8Array(ciphertext) };
};

/**
 * Decrypts AES-256-GCM ciphertext back to raw ArrayBuffer bytes.
 * Works for any file format — result is the original file bytes.
 * Throws automatically if the key is wrong or data is tampered
 * (AES-GCM has a built-in authentication tag).
 *
 * @param   {CryptoKey}   key
 * @param   {Uint8Array}  iv
 * @param   {Uint8Array}  ciphertext
 * @returns {Promise<ArrayBuffer>}
 */
export const decryptBuffer = async (key, iv, ciphertext) => {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
};