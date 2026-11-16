package expo.modules.vaultlyautofill

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.service.autofill.Dataset
import android.util.Log
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Hosts the "VaultlyAutofill" React component (unlock, then pick a login) and
 * hands the chosen username/password back to Android as the autofill result.
 */
@RequiresApi(Build.VERSION_CODES.O)
class VaultlyAutofillActivity : ReactActivity() {
  var targetPackage: String? = null
    private set
  var targetDomain: String? = null
    private set
  private var usernameId: AutofillId? = null
  private var passwordId: AutofillId? = null

  override fun getMainComponentName(): String = "VaultlyAutofill"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, "VaultlyAutofill", true)

  override fun onCreate(savedInstanceState: Bundle?) {
    targetPackage = intent.getStringExtra(EXTRA_PACKAGE)
    targetDomain = intent.getStringExtra(EXTRA_DOMAIN)
    @Suppress("DEPRECATION")
    usernameId = intent.getParcelableExtra(EXTRA_USERNAME_ID)
    @Suppress("DEPRECATION")
    passwordId = intent.getParcelableExtra(EXTRA_PASSWORD_ID)
    Log.d(VaultlyAutofillService.TAG, "activity created pkg=$targetPackage domain=$targetDomain user=$usernameId pass=$passwordId")
    // null: never restore a previous state (it could hold a decrypted vault).
    super.onCreate(null)
  }

  fun finishWithCredentials(username: String, password: String) {
    Log.d(VaultlyAutofillService.TAG, "finish: userId=$usernameId passId=$passwordId usernameLen=${username.length} passwordLen=${password.length}")
    val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
      setTextViewText(android.R.id.text1, "Vaultly")
    }
    val dataset = Dataset.Builder(presentation)
    usernameId?.let { dataset.setValue(it, AutofillValue.forText(username)) }
    passwordId?.let { dataset.setValue(it, AutofillValue.forText(password)) }

    runOnUiThread {
      setResult(
        RESULT_OK,
        Intent().putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, dataset.build())
      )
      finish()
    }
  }

  fun cancelAutofill() {
    runOnUiThread {
      setResult(RESULT_CANCELED)
      finish()
    }
  }

  companion object {
    const val EXTRA_PACKAGE = "vaultly.targetPackage"
    const val EXTRA_DOMAIN = "vaultly.targetDomain"
    const val EXTRA_USERNAME_ID = "vaultly.usernameId"
    const val EXTRA_PASSWORD_ID = "vaultly.passwordId"
  }
}
