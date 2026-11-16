import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const KEY = "biometricVaultKey";
const OPTS = {
  requireAuthentication: true,
  authenticationPrompt: "Unlock your vault",
};

export async function isBiometricAvailable(): Promise<boolean> {
  return (
    (await LocalAuthentication.hasHardwareAsync()) &&
    (await LocalAuthentication.isEnrolledAsync())
  );
}

// Reading metadata-free: plain check without triggering the biometric prompt.
export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) !== null;
}

/** Stores the vault key behind the OS biometric gate (enabled from Settings, while unlocked). */
export async function enableBiometric(vaultKey: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(KEY, bytesToHex(vaultKey), OPTS);
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

/** Prompts the user; returns the vault key, or null if cancelled/failed/invalidated. */
export async function unlockWithBiometricKey(): Promise<Uint8Array | null> {
  try {
    const hex = await SecureStore.getItemAsync(KEY, OPTS);
    return hex ? hexToBytes(hex) : null;
  } catch {
    return null;
  }
}
