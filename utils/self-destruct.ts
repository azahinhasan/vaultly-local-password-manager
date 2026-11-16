import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { mainPinVictims } from "./self-destruct-policy";
import { readSelfDestructRegistry } from "./self-destruct-registry";
import {
  loadEncryptedVault,
  saveEncryptedVault,
  type VaultEntry,
} from "./vault-storage";

// Wrong-PIN bookkeeping for entries set to "delete after N wrong PINs".
// Everything here is silent on purpose: no message, no attempts-left count.

const MAIN_FAILS_KEY = "selfDestructMainFails";
const PENDING_KEY = "selfDestructPending";
const customFailsKey = (id: string) => `selfDestructFails_${id}`;

const deleted = new Set<string>();
const listeners = new Set<(ids: string[]) => void>();

/** True once an entry was self-destructed (so a stale in-memory copy can't be used). */
export const wasDeleted = (id: string): boolean => deleted.has(id);

/** Screens use this to drop deleted entries from what they show. */
export function subscribeEntriesDeleted(fn: (ids: string[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const readNumber = async (key: string): Promise<number> =>
  Number(await SecureStore.getItemAsync(key)) || 0;

async function deleteEntries(ids: string[], vaultKey: Uint8Array): Promise<void> {
  if (ids.length === 0) return;
  const vault = await loadEncryptedVault(vaultKey);
  const kept = vault.filter((e) => !ids.includes(e.id));
  if (kept.length !== vault.length) await saveEncryptedVault(kept, vaultKey);
  for (const id of ids) {
    deleted.add(id);
    SecureStore.deleteItemAsync(customFailsKey(id)).catch(() => {});
  }
  listeners.forEach((fn) => fn(ids));
}

/**
 * A wrong MAIN PIN was typed (lock screen or a PIN prompt). Entries whose limit
 * is reached are deleted now if the vault is open, otherwise queued and
 * deleted the moment the vault is next unlocked — before anything is shown.
 */
export async function onMainPinWrong(vaultKey: Uint8Array | null): Promise<void> {
  const count = (await readNumber(MAIN_FAILS_KEY)) + 1;
  await SecureStore.setItemAsync(MAIN_FAILS_KEY, String(count));
  const victims = mainPinVictims(await readSelfDestructRegistry(), count);
  if (victims.length === 0) return;
  if (vaultKey) {
    await deleteEntries(victims, vaultKey);
  } else {
    const pending: string[] = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? "[]");
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify([...new Set([...pending, ...victims])]));
  }
}

/** The correct main PIN was typed: the count starts over. */
export async function onMainPinOk(vaultKey: Uint8Array): Promise<void> {
  await SecureStore.deleteItemAsync(MAIN_FAILS_KEY);
  await applyPendingDeletions(vaultKey);
}

/** Carries out deletions queued while the vault was locked. Call on every unlock. */
export async function applyPendingDeletions(vaultKey: Uint8Array): Promise<void> {
  const pending: string[] = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? "[]");
  if (pending.length === 0) return;
  await deleteEntries(pending, vaultKey);
  await AsyncStorage.removeItem(PENDING_KEY);
}

/** A wrong PIN was typed for one entry's own PIN. Deletes the entry at its limit. */
export async function onCustomPinWrong(
  entry: Pick<VaultEntry, "id" | "deleteAfterWrong">,
  vaultKey: Uint8Array,
): Promise<void> {
  if (!entry.deleteAfterWrong) return;
  const count = (await readNumber(customFailsKey(entry.id))) + 1;
  if (count >= entry.deleteAfterWrong) {
    await deleteEntries([entry.id], vaultKey);
  } else {
    await SecureStore.setItemAsync(customFailsKey(entry.id), String(count));
  }
}

export const onCustomPinOk = (id: string): Promise<void> =>
  SecureStore.deleteItemAsync(customFailsKey(id));
