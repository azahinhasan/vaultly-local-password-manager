import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { DEFAULT_PIN_EVERY_HOURS, isPinEveryHours, isPinRecent } from "./pin-policy";

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

const LAST_PIN_KEY = "lastPinAt";
export const PIN_EVERY_KEY = "pinEveryHours"; // also used by SecurityContext

/** Call after the user types their PIN correctly (not after a biometric unlock). */
export async function markPinEntered(): Promise<void> {
  await SecureStore.setItemAsync(LAST_PIN_KEY, String(Date.now()));
}

/**
 * Biometric unlock is only allowed within the chosen window after the last
 * manual PIN entry. Reads the setting itself so it never races the settings
 * context loading.
 */
export async function isBiometricAllowed(): Promise<boolean> {
  const stored = Number(await AsyncStorage.getItem(PIN_EVERY_KEY));
  const hours = isPinEveryHours(stored) ? stored : DEFAULT_PIN_EVERY_HOURS;
  const last = await SecureStore.getItemAsync(LAST_PIN_KEY);
  return isPinRecent(last === null ? null : Number(last), hours);
}
