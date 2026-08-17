import { bytesToHex } from "@noble/ciphers/utils.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import * as Crypto from "expo-crypto";

const PBKDF2_ITERATIONS = 10000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

// Consecutive failed PIN attempts allowed before a lockout delay kicks in,
// followed by the escalating delay (seconds) for each attempt beyond that.
const LOCKOUT_FREE_ATTEMPTS = 3;
const LOCKOUT_SCHEDULE_SECONDS = [5, 15, 30, 60, 120];

/**
 * Generate a random salt for PIN hashing
 */
export function generateSalt(): string {
  return bytesToHex(Crypto.getRandomBytes(SALT_LENGTH));
}

/**
 * Derive a 256-bit key from a PIN and salt using real PBKDF2-HMAC-SHA256.
 * Runs synchronously in JS (no native bridge crossings), unlike a naive
 * "hash N times" loop, so this is both correct and fast.
 */
export function deriveKeyFromPin(pin: string, salt: string): Uint8Array {
  return pbkdf2(sha256, pin, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LENGTH });
}

/**
 * Hash a PIN with salt for storage
 */
export function hashPin(pin: string, salt: string): string {
  return bytesToHex(deriveKeyFromPin(pin, salt));
}

/**
 * Verify a PIN against a stored hash
 */
export function verifyPin(pin: string, salt: string, storedHash: string): boolean {
  return hashPin(pin, salt) === storedHash;
}

/**
 * Derive a 256-bit AES key for vault encryption from the PIN + stored salt.
 * Domain-separated from `hashPin` (adds a ":vault" suffix) so the stored PIN
 * verification hash and the vault encryption key are never the same value.
 */
export function deriveVaultKey(pin: string, salt: string): Uint8Array {
  return deriveKeyFromPin(pin, `${salt}:vault`);
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
