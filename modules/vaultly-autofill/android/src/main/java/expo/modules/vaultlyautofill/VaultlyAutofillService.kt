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
import android.service.autofill.SaveRequest
import android.text.InputType
import android.util.Log
import android.view.autofill.AutofillId
import android.widget.RemoteViews
import androidx.annotation.RequiresApi

/**
 * The vault is encrypted and locked here, so this service never sees any
 * credentials. It only finds the login fields and offers one "Unlock Vaultly"
 * suggestion; the unlock + pick happens in [VaultlyAutofillActivity].
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

    callback.onSuccess(FillResponse.Builder().addDataset(dataset.build()).build())
  }

  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    callback.onSuccess()
  }

  companion object {
    private const val REQUEST_CODE = 4217
    const val TAG = "VaultlyAutofill"
  }
}

private class Parsed {
  var packageName: String? = null
  var webDomain: String? = null
  var usernameId: AutofillId? = null
  var passwordId: AutofillId? = null
}

/** Finds the first password field and the username/email field before it. */
@RequiresApi(Build.VERSION_CODES.O)
private class FieldParser {
  private val result = Parsed()
  private var lastUserCandidate: AutofillId? = null
  private var firstUserCandidate: AutofillId? = null

  fun parse(structure: AssistStructure): Parsed {
    result.packageName = structure.activityComponent?.packageName
    for (i in 0 until structure.windowNodeCount) {
      visit(structure.getWindowNodeAt(i).rootViewNode)
    }
    if (result.usernameId == null) result.usernameId = firstUserCandidate
    return result
  }

  private fun visit(node: AssistStructure.ViewNode) {
    if (result.webDomain == null && !node.webDomain.isNullOrEmpty()) {
      result.webDomain = node.webDomain
    }

    val id = node.autofillId
    if (id != null && node.autofillType == android.view.View.AUTOFILL_TYPE_TEXT) {
      when (classify(node)) {
        Kind.PASSWORD -> if (result.passwordId == null) {
          result.passwordId = id
          if (result.usernameId == null) result.usernameId = lastUserCandidate
        }
        Kind.USERNAME -> {
          lastUserCandidate = id
          if (firstUserCandidate == null) firstUserCandidate = id
        }
        Kind.OTHER -> {}
      }
    }

    for (i in 0 until node.childCount) visit(node.getChildAt(i))
  }

  private enum class Kind { USERNAME, PASSWORD, OTHER }

  private fun classify(node: AssistStructure.ViewNode): Kind {
    val hints = node.autofillHints?.map { it.lowercase() } ?: emptyList()
    val input = node.inputType
    val variation = input and InputType.TYPE_MASK_VARIATION
    val isTextClass = (input and InputType.TYPE_MASK_CLASS) == InputType.TYPE_CLASS_TEXT
    val html = node.htmlInfo?.attributes?.associate { it.first.lowercase() to it.second.lowercase() }

    val isPassword = hints.any { it.contains("password") } ||
      (isTextClass && (variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD)) ||
      html?.get("type") == "password"
    if (isPassword) return Kind.PASSWORD

    val label = listOfNotNull(node.idEntry, node.hint, html?.get("name"), html?.get("autocomplete"))
      .joinToString(" ").lowercase()
    val isUser = hints.any { it == "username" || it == "emailaddress" || it.contains("email") } ||
      (isTextClass && (variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS ||
        variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS)) ||
      html?.get("type") == "email" ||
      USER_WORDS.any { label.contains(it) }
    return if (isUser) Kind.USERNAME else Kind.OTHER
  }

  companion object {
    private val USER_WORDS = listOf("user", "email", "login", "identifier", "account")
  }
}
