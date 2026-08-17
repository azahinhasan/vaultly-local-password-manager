import * as SecureStore from "expo-secure-store";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    deriveVaultKey,
    generateSalt,
    getLockoutDelayMs,
    hashPin,
    verifyPin,
} from "../utils/pin-utils";
import { saveEncryptedVault } from "../utils/vault-storage";

interface UnlockResult {
  success: boolean;
  lockedUntil: number | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isPinSetup: boolean;
  setupPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<UnlockResult>;
  isLoading: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  vaultKey: Uint8Array | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [vaultKey, setVaultKey] = useState<Uint8Array | null>(null);

  // Check if PIN is already set up, and restore any active lockout, on app launch
  useEffect(() => {
    checkPinSetup();
  }, []);

  const checkPinSetup = async () => {
    try {
      const pinHash = await SecureStore.getItemAsync("pinHash");
      const pinSalt = await SecureStore.getItemAsync("pinSalt");
      setIsPinSetup(!!(pinHash && pinSalt));

      const storedAttempts = await SecureStore.getItemAsync(
        "pinFailedAttempts",
      );
      const storedLockedUntil = await SecureStore.getItemAsync(
        "pinLockedUntil",
      );
      setFailedAttempts(storedAttempts ? parseInt(storedAttempts, 10) : 0);
      setLockedUntil(
        storedLockedUntil ? parseInt(storedLockedUntil, 10) : null,
      );
    } catch (error) {
      console.error("Error checking PIN setup:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupPin = async (pin: string) => {
    try {
      if (pin.length < 4) {
        throw new Error("PIN must be at least 4 digits");
      }

      // Generate salt
      const salt = await generateSalt();

      // Hash the PIN
      const hash = await hashPin(pin, salt);

      // Store hash and salt in secure storage
      await SecureStore.setItemAsync("pinHash", hash);
      await SecureStore.setItemAsync("pinSalt", salt);

      // Derive the vault encryption key and seed an empty encrypted vault
      const key = await deriveVaultKey(pin, salt);
      await saveEncryptedVault([], key);

      setVaultKey(key);
      setIsPinSetup(true);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error setting up PIN:", error);
      throw error;
    }
  };

  const unlockWithPin = async (pin: string): Promise<UnlockResult> => {
    const now = Date.now();
    if (lockedUntil && now < lockedUntil) {
      return { success: false, lockedUntil };
    }

    try {
      const pinHash = await SecureStore.getItemAsync("pinHash");
      const pinSalt = await SecureStore.getItemAsync("pinSalt");

      if (!pinHash || !pinSalt) {
        throw new Error("PIN not set up");
      }

      const isValid = await verifyPin(pin, pinSalt, pinHash);

      if (isValid) {
        const key = await deriveVaultKey(pin, pinSalt);
        setVaultKey(key);
        setIsAuthenticated(true);
        setFailedAttempts(0);
        setLockedUntil(null);
        await SecureStore.deleteItemAsync("pinFailedAttempts");
        await SecureStore.deleteItemAsync("pinLockedUntil");
        return { success: true, lockedUntil: null };
      }

      const nextAttempts = failedAttempts + 1;
      const delayMs = getLockoutDelayMs(nextAttempts);
      const nextLockedUntil = delayMs > 0 ? Date.now() + delayMs : null;

      setFailedAttempts(nextAttempts);
      setLockedUntil(nextLockedUntil);
      await SecureStore.setItemAsync(
        "pinFailedAttempts",
        String(nextAttempts),
      );
      if (nextLockedUntil) {
        await SecureStore.setItemAsync(
          "pinLockedUntil",
          String(nextLockedUntil),
        );
      } else {
        await SecureStore.deleteItemAsync("pinLockedUntil");
      }

      return { success: false, lockedUntil: nextLockedUntil };
    } catch (error) {
      console.error("Error unlocking with PIN:", error);
      return { success: false, lockedUntil: null };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isPinSetup,
        setupPin,
        unlockWithPin,
        isLoading,
        failedAttempts,
        lockedUntil,
        vaultKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
