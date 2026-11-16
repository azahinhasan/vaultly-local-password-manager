package expo.modules.vaultlyautofill

import android.app.PendingIntent
import android.app.assist.AssistStructure
import android.content.Intent
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.Dataset
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.FillResponse
import android.service.autofill.SaveCallback
import android.service.autofill.SaveInfo
import android.service.autofill.SaveRequest
import android.text.InputType
import android.util.Log
import android.view.autofill.AutofillId
import android.widget.RemoteViews
import androidx.annotation.RequiresApi

/**
 * The vault is encrypted and locked here, so this service never reads saved
 * credentials. Filling: it finds the login fields and offers one "Unlock
 * Vaultly" suggestion; the unlock + pick happens in [VaultlyAutofillActivity].
 * Saving: when a login/registration form is submitted, Android shows its
 * "Save to Vaultly?" prompt and hands the typed values to [onSaveRequest],
 * which passes them to the same activity to be stored in the encrypted vault.
 */
@RequiresApi(Build.VERSION_CODES.O)
class VaultlyAutofillService : AutofillService() {

  override fun onFillRequest(
    request: FillRequest,
    cancellationSignal: CancellationSignal,
    callback: FillCallback
  ) {
    val structure = request.fillContexts.lastOrNull()?.structure
    if (structure == null) {
      callback.onSuccess(null)
      return
    }

    val parsed = FieldParser().parse(structure)
    Log.d(TAG, "fill request pkg=${parsed.packageName} domain=${parsed.webDomain} user=${parsed.usernameId} pass=${parsed.passwordId}")
    // Nothing to fill, or it's our own app (the PIN screen must not autofill).
    if ((parsed.usernameId == null && parsed.passwordId == null) || parsed.packageName == packageName) {
      callback.onSuccess(null)
      return
    }

    val authIntent = Intent(this, VaultlyAutofillActivity::class.java)
      .putExtra(VaultlyAutofillActivity.EXTRA_PACKAGE, parsed.packageName)
      .putExtra(VaultlyAutofillActivity.EXTRA_DOMAIN, parsed.webDomain)
      .putExtra(VaultlyAutofillActivity.EXTRA_USERNAME_ID, parsed.usernameId)
      .putExtra(VaultlyAutofillActivity.EXTRA_PASSWORD_ID, parsed.passwordId)
      .putExtra(VaultlyAutofillActivity.EXTRA_USERNAME_KIND, parsed.usernameKind)

    // Mutable: the system adds its own extras before launching the activity.
    val sender = PendingIntent.getActivity(
      this,
      REQUEST_CODE,
      authIntent,
      PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_MUTABLE
    ).intentSender

    val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
      setTextViewText(android.R.id.text1, "Unlock Vaultly")
    }

    val dataset = Dataset.Builder(presentation).setAuthentication(sender)
    // Values are placeholders; the real ones come back from the activity.
    parsed.usernameId?.let { dataset.setValue(it, null) }
    parsed.passwordId?.let { dataset.setValue(it, null) }

    val response = FillResponse.Builder().addDataset(dataset.build())

    // Ask Android to offer "Save to Vaultly?" once this form is submitted. A
    // form without a password field (e.g. a username-only first step) isn't
    // worth saving.
    parsed.passwordId?.let { passwordId ->
      val save = SaveInfo.Builder(
        SaveInfo.SAVE_DATA_TYPE_USERNAME or SaveInfo.SAVE_DATA_TYPE_PASSWORD,
        arrayOf(passwordId)
      )
      parsed.usernameId?.let { save.setOptionalIds(arrayOf(it)) }
      // Many apps close the login screen on success instead of submitting.
      save.setFlags(SaveInfo.FLAG_SAVE_ON_ALL_VIEWS_INVISIBLE)
      response.setSaveInfo(save.build())
    }

    callback.onSuccess(response.build())
  }

  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    val structure = request.fillContexts.lastOrNull()?.structure
    val parsed = structure?.let { FieldParser().parse(it) }
    val password = parsed?.passwordText
    if (parsed == null || password.isNullOrEmpty() || parsed.packageName == packageName) {
      callback.onSuccess()
      return
    }
    Log.d(TAG, "save request pkg=${parsed.packageName} domain=${parsed.webDomain} hasUser=${!parsed.usernameText.isNullOrEmpty()}")

    // The vault is locked, so hand the values to the unlock screen, which
    // stores them once you authenticate. Needs API 28; older phones skip it.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
      callback.onSuccess()
      return
    }
    val saveIntent = Intent(this, VaultlyAutofillActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      .putExtra(VaultlyAutofillActivity.EXTRA_MODE, VaultlyAutofillActivity.MODE_SAVE)
      .putExtra(VaultlyAutofillActivity.EXTRA_PACKAGE, parsed.packageName)
      .putExtra(VaultlyAutofillActivity.EXTRA_DOMAIN, parsed.webDomain)
      .putExtra(VaultlyAutofillActivity.EXTRA_SAVE_USERNAME, parsed.usernameText)
      .putExtra(VaultlyAutofillActivity.EXTRA_SAVE_PASSWORD, password)
      .putExtra(VaultlyAutofillActivity.EXTRA_USERNAME_KIND, parsed.usernameKind)
    val sender = PendingIntent.getActivity(
      this,
      SAVE_REQUEST_CODE,
      saveIntent,
      PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_IMMUTABLE
    ).intentSender
    callback.onSuccess(sender)
  }

  companion object {
    private const val REQUEST_CODE = 4217
    private const val SAVE_REQUEST_CODE = 4218
    const val TAG = "VaultlyAutofill"
  }
}

private class Parsed {
  var packageName: String? = null
  var webDomain: String? = null
  var usernameId: AutofillId? = null
  var passwordId: AutofillId? = null
  var usernameText: String? = null
  /** "phone", "email", "username" or "any" (e.g. "Mobile number or email"). */
  var usernameKind: String? = null
  var passwordText: String? = null
}

/** Finds the first password field and the username/email field before it. */
@RequiresApi(Build.VERSION_CODES.O)
private class FieldParser {
  private val result = Parsed()
  private class Candidate(val id: AutofillId, val text: String?, val kind: String)

  private var lastUser: Candidate? = null
  private var firstUser: Candidate? = null

  fun parse(structure: AssistStructure): Parsed {
    result.packageName = structure.activityComponent?.packageName
    for (i in 0 until structure.windowNodeCount) {
      visit(structure.getWindowNodeAt(i).rootViewNode)
    }
    if (result.usernameId == null) {
      firstUser?.let { useAsUsername(it) }
    }
    return result
  }

  private fun visit(node: AssistStructure.ViewNode) {
    if (result.webDomain == null && !node.webDomain.isNullOrEmpty()) {
      result.webDomain = node.webDomain
    }

    val id = node.autofillId
    if (id != null && node.autofillType == android.view.View.AUTOFILL_TYPE_TEXT) {
      val kind = classify(node)
      when (kind.first) {
        Kind.PASSWORD -> if (result.passwordId == null) {
          result.passwordId = id
          result.passwordText = textOf(node)
          if (result.usernameId == null) {
            lastUser?.let { useAsUsername(it) }
          }
        }
        Kind.USERNAME -> {
          lastUser = Candidate(id, textOf(node), kind.second ?: "username")
          if (firstUser == null) firstUser = lastUser
        }
        Kind.OTHER -> {}
      }
    }

    for (i in 0 until node.childCount) visit(node.getChildAt(i))
  }

  private fun useAsUsername(c: Candidate) {
    result.usernameId = c.id
    result.usernameText = c.text
    result.usernameKind = c.kind
  }

  // What the user typed (only present in save requests).
  private fun textOf(node: AssistStructure.ViewNode): String? =
    node.autofillValue?.takeIf { it.isText }?.textValue?.toString()
      ?: node.text?.toString()

  private enum class Kind { USERNAME, PASSWORD, OTHER }

  private fun classify(node: AssistStructure.ViewNode): Pair<Kind, String?> {
    val hints = node.autofillHints?.map { it.lowercase() } ?: emptyList()
    val input = node.inputType
    val variation = input and InputType.TYPE_MASK_VARIATION
    val inputClass = input and InputType.TYPE_MASK_CLASS
    val isTextClass = inputClass == InputType.TYPE_CLASS_TEXT
    val html = node.htmlInfo?.attributes?.associate { it.first.lowercase() to it.second.lowercase() }

    val isPassword = hints.any { it.contains("password") } ||
      (isTextClass && (variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD)) ||
      html?.get("type") == "password"
    if (isPassword) return Kind.PASSWORD to null

    val label = listOfNotNull(node.idEntry, node.hint, html?.get("name"), html?.get("autocomplete"))
      .joinToString(" ").lowercase()

    // Strong signals first: autofill hints, input type, HTML type.
    val phoneSignal = hints.any { it.contains("phone") } ||
      inputClass == InputType.TYPE_CLASS_PHONE || html?.get("type") == "tel"
    val emailSignal = hints.any { it.contains("email") } ||
      (isTextClass && (variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS)) ||
      html?.get("type") == "email"
    // Then the field's label ("Mobile number or email address" accepts both).
    val labelPhone = PHONE_WORDS.any { label.contains(it) }
    val labelEmail = label.contains("email")

    val kind = when {
      phoneSignal && emailSignal -> "any"
      phoneSignal -> "phone"
      emailSignal -> "email"
      hints.any { it == "username" } -> "username"
      labelPhone && labelEmail -> "any"
      labelPhone -> "phone"
      labelEmail -> "email"
      USER_WORDS.any { label.contains(it) } -> "username"
      else -> null
    }
    return if (kind != null) Kind.USERNAME to kind else Kind.OTHER to null
  }

  companion object {
    private val USER_WORDS = listOf("user", "login", "identifier", "account")
    private val PHONE_WORDS = listOf("phone", "mobile", "msisdn")
  }
}
