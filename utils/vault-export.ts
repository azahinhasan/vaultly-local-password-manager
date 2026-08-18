import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { deriveVaultKey } from "./pin-utils";
import { decryptVault, encryptVault, VaultEntry } from "./vault-storage";

interface EncryptedVaultFile {
  ciphertext: string;
  iv: string;
  salt: string;
}

function isValidEntryShape(value: unknown): value is VaultEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.platform === "string" &&
    typeof entry.username === "string" &&
    typeof entry.password === "string" &&
    (entry.notes === undefined || typeof entry.notes === "string") &&
    (entry.color === undefined || typeof entry.color === "string")
  );
}

async function shareAndCleanup(file: File): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("Sharing isn't available on this device.");
  }

  try {
    await Sharing.shareAsync(file.uri);
  } finally {
    if (file.exists) {
      file.delete();
    }
  }
}

export async function exportVaultDecrypted(
  entries: VaultEntry[],
): Promise<void> {
  const file = new File(
    Paths.cache,
    `vault-export-decrypted-${Date.now()}.json`,
  );
  file.create({ overwrite: true });
  file.write(JSON.stringify(entries, null, 2));
  await shareAndCleanup(file);
}

export async function exportVaultEncrypted(
  entries: VaultEntry[],
  key: Uint8Array,
): Promise<void> {
  // The salt isn't secret (that's the point of a salt) — embedding it lets
  // this file be decrypted with just the PIN later, even after a reinstall
  // regenerates a new salt for the current installation.
  const salt = await SecureStore.getItemAsync("pinSalt");
  if (!salt) {
    throw new Error("PIN salt not found — set up a PIN first.");
  }

  const encrypted = await encryptVault(entries, key);
  const file = new File(
    Paths.cache,
    `vault-export-encrypted-${Date.now()}.json`,
  );
  file.create({ overwrite: true });
  file.write(JSON.stringify({ ...encrypted, salt }, null, 2));
  await shareAndCleanup(file);
}

/** Opens a file picker for a JSON file and returns its text content, or null if cancelled. */
export async function pickJsonFileContent(): Promise<string | null> {
  let picked;
  try {
    picked = await File.pickFileAsync(undefined, "application/json");
  } catch {
    return null;
  }

  const file = Array.isArray(picked) ? picked[0] : picked;
  if (!file) {
    return null;
  }

  return file.text();
}

export function parseDecryptedImport(content: string): VaultEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isValidEntryShape)) {
    throw new Error("That file doesn't look like a decrypted vault export.");
  }

  return parsed.map((entry) => ({ ...entry, id: Crypto.randomUUID() }));
}

/**
 * Decrypts an encrypted export using the PIN it was exported with (not the
 * current installation's PIN/key) — the salt travels with the file, so the
 * key is derived fresh from `pin` + that salt, regardless of what salt this
 * device currently has.
 */
export async function parseEncryptedImport(
  content: string,
  pin: string,
): Promise<VaultEntry[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  const blob = parsed as Partial<EncryptedVaultFile>;
  if (
    typeof blob.ciphertext !== "string" ||
    typeof blob.iv !== "string" ||
    typeof blob.salt !== "string"
  ) {
    throw new Error("That file doesn't look like an encrypted vault export.");
  }

  const key = deriveVaultKey(pin, blob.salt);

  let decrypted: VaultEntry[];
  try {
    decrypted = await decryptVault(blob.ciphertext, blob.iv, key);
  } catch {
    throw new Error(
      "Couldn't decrypt this file — check you entered the PIN it was exported with.",
    );
  }

  if (!Array.isArray(decrypted) || !decrypted.every(isValidEntryShape)) {
    throw new Error("Decrypted content doesn't look like a valid vault.");
  }

  return decrypted.map((entry) => ({ ...entry, id: Crypto.randomUUID() }));
}
