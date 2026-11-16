import { generateSalt, hashPin, verifyPin } from "./pin-utils";
import { onCustomPinOk, onCustomPinWrong, wasDeleted } from "./self-destruct";
import type { VaultEntry } from "./vault-storage";

/** Salted hash of a PIN chosen for a single entry (stored inside the encrypted vault). */
export function makeEntryPin(pin: string): { salt: string; hash: string } {
  const salt = generateSalt();
  return { salt, hash: hashPin(pin, salt) };
}

/**
 * Checks a PIN for a protected entry: its own PIN when it has one, otherwise
 * the main PIN (via `verifyMain`, which does its own wrong-PIN counting).
 * A self-destructed entry never passes, even with the right PIN, so a stale
 * copy still held by a screen can't be used.
 */
export async function verifyEntryPin(
  entry: Pick<VaultEntry, "id" | "customPin" | "deleteAfterWrong">,
  pin: string,
  verifyMain: (pin: string) => Promise<boolean>,
  vaultKey: Uint8Array,
): Promise<boolean> {
  if (wasDeleted(entry.id)) return false;
  if (!entry.customPin) return verifyMain(pin);

  if (verifyPin(pin, entry.customPin.salt, entry.customPin.hash)) {
    await onCustomPinOk(entry.id);
    return true;
  }
  await onCustomPinWrong(entry, vaultKey);
  return false;
}
