import AsyncStorage from "@react-native-async-storage/async-storage";

export const REVIEW_BEFORE_SAVING_KEY = "reviewBeforeSaving";

/**
 * Off by default: after Android's "Save to Vaultly?" popup and the unlock, the
 * login is saved right away. On: the save form is shown first. Read straight
 * from storage so the choice can never race the settings context loading.
 */
export async function getReviewBeforeSaving(): Promise<boolean> {
  return (await AsyncStorage.getItem(REVIEW_BEFORE_SAVING_KEY)) === "true";
}
