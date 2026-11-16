package expo.modules.vaultlyautofill

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VaultlyAutofillModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VaultlyAutofill")

    // True when Vaultly is the phone's selected autofill service.
    Function("isEnabled") {
      val context = appContext.reactContext ?: return@Function false
      val selected = Settings.Secure.getString(context.contentResolver, "autofill_service")
      val ours = ComponentName(context, VaultlyAutofillService::class.java)
      selected != null &&
        (selected == ours.flattenToString() || selected == ours.flattenToShortString())
    }

    // Opens the system screen where the user picks Vaultly as autofill service.
    Function("openSettings") {
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(
        Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE,
        Uri.parse("package:${context.packageName}")
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    }

    // Which app/site asked for a login; null when not launched by autofill.
    Function("getRequest") {
      val activity = appContext.currentActivity as? VaultlyAutofillActivity
        ?: return@Function null
      mapOf(
        "mode" to activity.mode,
        "packageName" to activity.targetPackage,
        "webDomain" to activity.targetDomain,
        "usernameKind" to activity.usernameKind,
        "username" to activity.saveUsername,
        "password" to activity.savePassword
      )
    }

    Function("finishWithCredentials") { username: String, password: String ->
      (appContext.currentActivity as? VaultlyAutofillActivity)
        ?.finishWithCredentials(username, password)
    }

    Function("cancel") {
      (appContext.currentActivity as? VaultlyAutofillActivity)?.cancelAutofill()
    }
  }
}
