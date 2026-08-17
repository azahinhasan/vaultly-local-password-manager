import AsyncStorage from "@react-native-async-storage/async-storage";
import { gcm } from "@noble/ciphers/aes.js";
import {
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  utf8ToBytes,
} from "@noble/ciphers/utils.js";
import * as Crypto from "expo-crypto";

export interface VaultEntry {
  id: string;
  platform: string;
  username: string;
  password: string;
  notes?: string;
}

interface EncryptedVault {
  ciphertext: string;
  iv: string;
}

const VAULT_STORAGE_KEY = "encryptedVault";
const IV_LENGTH = 12;

export async function encryptVault(
  vault: VaultEntry[],
  key: Uint8Array,
): Promise<EncryptedVault> {
  const iv = Crypto.getRandomBytes(IV_LENGTH);
  const plaintext = utf8ToBytes(JSON.stringify(vault));
  const ciphertext = gcm(key, iv).encrypt(plaintext);

  return {
    ciphertext: bytesToHex(ciphertext),
    iv: bytesToHex(iv),
  };
}

export async function decryptVault(
  ciphertext: string,
  iv: string,
  key: Uint8Array,
): Promise<VaultEntry[]> {
  const plaintext = gcm(key, hexToBytes(iv)).decrypt(hexToBytes(ciphertext));
  return JSON.parse(bytesToUtf8(plaintext));
}

export async function saveEncryptedVault(
  vault: VaultEntry[],
  key: Uint8Array,
): Promise<void> {
  const encrypted = await encryptVault(vault, key);
  await AsyncStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(encrypted));
}

export async function loadEncryptedVault(
  key: Uint8Array,
): Promise<VaultEntry[]> {
  const raw = await AsyncStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const { ciphertext, iv }: EncryptedVault = JSON.parse(raw);
  return decryptVault(ciphertext, iv, key);
}
