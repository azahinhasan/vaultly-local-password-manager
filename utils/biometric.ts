import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const KEY = "biometricVaultKey";
// Plain (no-prompt) marker. Reading KEY itself always shows the biometric prompt,
// even just to check it exists, so "is it enabled?" must not read KEY.
const FLAG = "biometricEnabled";
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

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(FLAG)) === "1";
}

/** Stores the vault key behind the OS biometric gate (enabled from Settings, while unlocked). */
export async function enableBiometric(vaultKey: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(KEY, bytesToHex(vaultKey), OPTS);
  await SecureStore.setItemAsync(FLAG, "1");
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
  await SecureStore.deleteItemAsync(FLAG);
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
