import { hexToBytes } from "@noble/ciphers/utils.js";
import * as Crypto from "expo-crypto";

const PBKDF2_ITERATIONS = 10000;
const SALT_LENGTH = 16;

// Consecutive failed PIN attempts allowed before a lockout delay kicks in,
// followed by the escalating delay (seconds) for each attempt beyond that.
const LOCKOUT_FREE_ATTEMPTS = 3;
const LOCKOUT_SCHEDULE_SECONDS = [5, 15, 30, 60, 120];

/**
 * Generate a random salt for PIN hashing
 */
export async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytes(SALT_LENGTH);
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    randomBytes.toString(),
  );
}

/**
 * Derive a key from PIN and salt using PBKDF2
 * Note: For a production app, consider using native modules for PBKDF2
 * This implementation uses SHA256 as a workaround
 */
export async function deriveKeyFromPin(
  pin: string,
  salt: string,
): Promise<string> {
  let hash = pin + salt;

  // Simple PBKDF2-like iteration using SHA256
  for (let i = 0; i < PBKDF2_ITERATIONS; i++) {
    hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hash,
    );
  }

  return hash;
}

/**
 * Hash a PIN with salt for storage
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await deriveKeyFromPin(pin, salt);
  return key;
}

/**
 * Verify a PIN against a stored hash
 */
export async function verifyPin(
  pin: string,
  salt: string,
  storedHash: string,
): Promise<boolean> {
  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}

/**
 * Derive a 256-bit AES key for vault encryption from the PIN + stored salt.
 * Domain-separated from `hashPin` (adds a ":vault" suffix) so the stored PIN
 * verification hash and the vault encryption key are never the same value.
 */
export async function deriveVaultKey(
  pin: string,
  salt: string,
): Promise<Uint8Array> {
  const hex = await deriveKeyFromPin(pin, `${salt}:vault`);
  return hexToBytes(hex);
}

/**
 * How long (in ms) to lock out PIN entry after `failedAttempts` consecutive
 * wrong PINs. Returns 0 while under the free-attempt threshold.
 */
export function getLockoutDelayMs(failedAttempts: number): number {
  if (failedAttempts < LOCKOUT_FREE_ATTEMPTS) {
    return 0;
  }

  const index = Math.min(
    failedAttempts - LOCKOUT_FREE_ATTEMPTS,
    LOCKOUT_SCHEDULE_SECONDS.length - 1,
  );
  return LOCKOUT_SCHEDULE_SECONDS[index] * 1000;
}
