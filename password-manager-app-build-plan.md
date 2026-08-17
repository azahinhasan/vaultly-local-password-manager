# Local Password Manager App — Build Plan (React Native / Expo)

## Overview
A fully offline, local-only password manager for Android (React Native + Expo). No cloud backup or sync. Data is encrypted at rest and protected by a user-set PIN. Supports viewing, adding, editing entries, and exporting the vault as decrypted JSON on demand.

Each entry has 3 fields: **Platform Name**, **Username**, **Password**.

---

## Step 1: Project Setup
- Initialize a new Expo project (`npx create-expo-app password-manager`)
- Install core dependencies:
  - `@react-native-async-storage/async-storage` — encrypted vault storage
  - `expo-secure-store` — PIN hash + salt storage
  - `expo-crypto` — random salt/IV generation, PBKDF2 key derivation
  - A crypto library for AES-256-GCM encryption (e.g. `react-native-quick-crypto`, or check current Expo SDK support for Web Crypto `subtle-crypto`)
  - `expo-file-system` and `expo-sharing` — for JSON export
  - `@react-navigation/native` + `@react-navigation/native-stack` — screen navigation
- Set up basic navigation structure with placeholder screens

## Step 2: PIN Setup Flow (First Launch)
- On app launch, check `expo-secure-store` for an existing PIN hash
- If none exists, show the **PIN Setup screen**:
  - User enters and confirms a PIN (decide on length, e.g. 4 or 6 digits)
  - Generate a random salt (`expo-crypto`)
  - Derive a key from PIN + salt using PBKDF2 (10,000+ iterations)
  - Store only the **hash** of the PIN (never the raw PIN) + the salt in `expo-secure-store`
- After setup, route to the Vault List screen (empty state)

## Step 3: PIN Unlock Flow (Every Subsequent Launch)
- Show the **PIN Unlock screen** on every app open
- On submit: re-derive the key from entered PIN + stored salt, compare hash to stored hash
- If match: use the derived key to decrypt the vault into memory, route to Vault List
- If no match: show error, increment a failed-attempt counter
  - Add increasing delay after repeated failures (basic brute-force protection)
  - Optional: add a "wipe vault after N failed attempts" setting later

## Step 4: Encrypted Vault Storage Layer
- Design the vault as a single JSON object: an array of `{ id, platform, username, password }` entries
- Write helper functions:
  - `encryptVault(vaultObject, key)` → returns ciphertext + IV
  - `decryptVault(ciphertext, iv, key)` → returns vault object
- Store the encrypted blob (ciphertext + IV) in `AsyncStorage`
- Never write plaintext vault data to storage at any point

## Step 5: Vault List Screen (Read)
- After unlock, decrypt vault into React state
- Display each entry showing Platform, Username, and Password
- Mask passwords by default (`••••••`) with a per-row tap-to-reveal toggle
- Tapping an entry (outside the reveal toggle) opens it in the Edit screen

## Step 6: Add Entry Screen (Create)
- Form with 3 fields: Platform Name, Username, Password
- On save: append new entry to the in-memory vault array, re-encrypt the full vault, write to `AsyncStorage`
- Return to Vault List, showing the new entry

## Step 7: Edit Entry Screen (Update)
- Same form as Add, pre-filled with the selected entry's current values
- User can change any of the 3 fields
- On save: update that entry in the in-memory vault array, re-encrypt the full vault, write to `AsyncStorage`

## Step 8: Delete Entry
- Add swipe-to-delete or long-press-to-delete on Vault List rows
- Confirm before deleting
- On confirm: remove entry from in-memory vault array, re-encrypt, save

## Step 9: JSON Export
- Add an "Export" option (e.g. in a Settings screen or app bar)
- On trigger: decrypt the current vault, write it as plaintext JSON to a temp file via `expo-file-system`
- Open the share sheet via `expo-sharing` so the user can save/send the file
- Show a confirmation dialog before exporting, since this is the one point plaintext leaves protected storage
- Delete the temp file immediately after the share sheet closes

## Step 10: Auto-Lock
- Listen for `AppState` changes
- When the app goes to background (or after an idle timeout), clear the decrypted vault from memory and require PIN re-entry on return

## Step 11: Settings Screen (Optional but Recommended)
- Change PIN (requires entering current PIN first)
- Trigger JSON export
- Configure auto-lock timeout
- Configure failed-attempt lockout behavior

## Step 12: Testing & Polish
- Test PIN setup, unlock, wrong-PIN handling, and lockout behavior
- Test add/edit/delete across app restarts (confirm persistence)
- Test export on a real device (share sheet behavior varies by Android version)
- Confirm no plaintext password data is ever logged or cached outside the encrypted flow

---

## Notes on Security Trade-offs
- A short numeric PIN has limited entropy — PBKDF2 with a high iteration count and a lockout/delay policy are what make brute-forcing impractical, not the PIN alone.
- Since there's no cloud backup, losing the device or PIN means losing the vault — worth deciding if you want any local backup mechanism (e.g. manual encrypted export) beyond the plaintext JSON export.
- The plaintext JSON export is inherently unencrypted by design (that's the point of the feature) — treat exported files as sensitive and delete/secure them after use.
