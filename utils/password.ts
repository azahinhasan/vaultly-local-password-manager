// No look-alike characters (0/O, 1/l/I).
export const GENERATOR_CHARS =
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
export const GENERATED_LENGTH = 16;

export const STRENGTH_LABELS = ["", "Weak", "Okay", "Good", "Strong"];

/** 0 for empty, otherwise 1-4. */
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(1, score);
}

/** `randomBytes` must be cryptographically secure (e.g. expo-crypto's getRandomBytes). */
export function generatePassword(
  randomBytes: (n: number) => Uint8Array,
  length = GENERATED_LENGTH,
): string {
  const n = GENERATOR_CHARS.length;
  const limit = 256 - (256 % n); // rejection sampling avoids modulo bias
  let out = "";
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < limit && out.length < length) out += GENERATOR_CHARS[b % n];
    }
  }
  return out;
}
