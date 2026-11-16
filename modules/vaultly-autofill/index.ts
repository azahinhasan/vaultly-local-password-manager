import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import type { FillTarget } from "../../utils/autofill-match";

/** What Android asked Vaultly to do: fill a login, or save a submitted one. */
export interface AutofillRequest extends FillTarget {
  mode: "fill" | "save";
  /** Save mode only: the values that were typed into the form. */
  username: string | null;
  password: string | null;
}

interface NativeAutofill {
  isEnabled(): boolean;
  openSettings(): boolean;
  getRequest(): AutofillRequest | null;
  finishWithCredentials(username: string, password: string): void;
  cancel(): void;
}

// Missing on iOS, web and Expo Go: every helper then degrades to a no-op.
const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<NativeAutofill>("VaultlyAutofill")
    : null;

export const autofillAvailable = native !== null;

/** Is Vaultly the phone's selected autofill service? */
export const isAutofillEnabled = (): boolean => native?.isEnabled() ?? false;

/** Opens Android's "pick your autofill service" screen. */
export const openAutofillSettings = (): void => {
  native?.openSettings();
};

/** The site/app that asked for a login, or null outside an autofill request. */
export const getAutofillRequest = (): AutofillRequest | null =>
  native?.getRequest() ?? null;

export const finishWithCredentials = (username: string, password: string) =>
  native?.finishWithCredentials(username, password);

export const cancelAutofill = () => native?.cancel();
