import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_PLATFORMS,
  MAX_PLATFORM_NAME_LENGTH,
  PlatformEntry,
} from "../constants/platforms";

const STORAGE_KEY = "managedPlatforms";

interface MutationResult {
  success: boolean;
  error?: string;
}

interface PlatformsContextType {
  platforms: PlatformEntry[];
  isLoading: boolean;
  addPlatform: (name: string, color: string) => Promise<MutationResult>;
  updatePlatform: (
    originalName: string,
    name: string,
    color: string,
  ) => Promise<MutationResult>;
  removePlatform: (name: string) => Promise<void>;
}

const PlatformsContext = createContext<PlatformsContextType | undefined>(
  undefined,
);

function validateName(
  name: string,
  platforms: PlatformEntry[],
  ignoreName?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Platform name is required.";
  }
  if (trimmed.length > MAX_PLATFORM_NAME_LENGTH) {
    return `Platform name must be ${MAX_PLATFORM_NAME_LENGTH} characters or fewer.`;
  }
  const isDuplicate = platforms.some(
    (p) =>
      p.name.toLowerCase() === trimmed.toLowerCase() &&
      p.name !== ignoreName,
  );
  if (isDuplicate) {
    return "A platform with that name already exists.";
  }
  return null;
}

export function PlatformsProvider({ children }: { children: ReactNode }) {
  const [platforms, setPlatforms] = useState<PlatformEntry[]>(DEFAULT_PLATFORMS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setPlatforms(JSON.parse(stored));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persist = async (next: PlatformEntry[]) => {
    setPlatforms(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addPlatform = async (
    name: string,
    color: string,
  ): Promise<MutationResult> => {
    const trimmed = name.trim();
    const error = validateName(trimmed, platforms);
    if (error) {
      return { success: false, error };
    }

    await persist([...platforms, { name: trimmed, color }]);
    return { success: true };
  };

  const updatePlatform = async (
    originalName: string,
    name: string,
    color: string,
  ): Promise<MutationResult> => {
    const trimmed = name.trim();
    const error = validateName(trimmed, platforms, originalName);
    if (error) {
      return { success: false, error };
    }

    await persist(
      platforms.map((p) =>
        p.name === originalName ? { name: trimmed, color } : p,
      ),
    );
    return { success: true };
  };

  const removePlatform = async (name: string): Promise<void> => {
    await persist(platforms.filter((p) => p.name !== name));
  };

  return (
    <PlatformsContext.Provider
      value={{ platforms, isLoading, addPlatform, updatePlatform, removePlatform }}
    >
      {children}
    </PlatformsContext.Provider>
  );
}

export function usePlatforms() {
  const context = useContext(PlatformsContext);
  if (!context) {
    throw new Error("usePlatforms must be used within PlatformsProvider");
  }
  return context;
}
