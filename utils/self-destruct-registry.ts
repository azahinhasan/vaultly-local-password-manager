import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildRegistry, Registry } from "./self-destruct-policy";

const REGISTRY_KEY = "selfDestructRegistry";

/** Rewritten on every vault save, so it always matches the entries. */
export async function syncSelfDestructRegistry(
  entries: Parameters<typeof buildRegistry>[0],
): Promise<void> {
  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(buildRegistry(entries)));
}

export async function readSelfDestructRegistry(): Promise<Registry> {
  try {
    return JSON.parse((await AsyncStorage.getItem(REGISTRY_KEY)) ?? "{}");
  } catch {
    return {};
  }
}
