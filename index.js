import "expo-router/entry";
import { AppRegistry } from "react-native";
import AutofillApp from "./autofill/AutofillApp";

// Second root, started by the native VaultlyAutofillActivity when Android asks
// Vaultly to fill a login in another app or browser.
AppRegistry.registerComponent("VaultlyAutofill", () => AutofillApp);
