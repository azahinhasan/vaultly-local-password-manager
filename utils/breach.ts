import * as Crypto from "expo-crypto";
import { countInRange, splitHash } from "./pwned-range";

const RANGE_URL = "https://api.pwnedpasswords.com/range/";

// In-memory only: passwords are never written anywhere by this module.
const cache = new Map<string, number>();

/**
 * How many times `password` appears in known breaches (0 = not found), via
 * HIBP Pwned Passwords k-anonymity: only the first 5 chars of the SHA-1 hash
 * leave the device. Throws if the service can't be reached.
 */
export async function pwnedCount(password: string): Promise<number> {
  const cached = cache.get(password);
  if (cached !== undefined) return cached;

  const sha1 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    password,
  );
  const { prefix, suffix } = splitHash(sha1);

  const res = await fetch(RANGE_URL + prefix, {
    headers: { "Add-Padding": "true", "User-Agent": "Vaultly" },
  });
  if (!res.ok) throw new Error(`Breach service returned ${res.status}`);

  const count = countInRange(await res.text(), suffix);
  cache.set(password, count);
  return count;
}
