package com.slowatcoding.combust.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slowatcoding.combust.AppController
import com.slowatcoding.combust.net.ApiException
import com.slowatcoding.combust.ui.components.BrandMark
import com.slowatcoding.combust.ui.components.ButtonSize
import com.slowatcoding.combust.ui.components.ButtonStyle
import com.slowatcoding.combust.ui.components.Divider
import com.slowatcoding.combust.ui.components.EmberTextField
import com.slowatcoding.combust.ui.components.LocalToaster
import com.slowatcoding.combust.ui.components.PillButton
import com.slowatcoding.combust.ui.components.TextLink
import com.slowatcoding.combust.ui.components.emberCard
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType
import com.slowatcoding.combust.ui.theme.Radii
import kotlinx.coroutines.launch

private enum class AuthView { SignIn, SignUp, Forgot }

private val EMAIL = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

private fun errorText(e: Throwable, fallback: String) = if (e is ApiException) e.message ?: fallback else fallback

/** Page shell shared by sign-in, sign-up, forgot-password and vehicle onboarding. */
@Composable
fun AuthShell(
    title: String,
    description: String,
    embedded: Boolean = false,
    footer: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val c = Ember.colors
    if (embedded) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, style = EmberType.sheetTitle.copy(fontSize = 24.sp, color = c.foreground))
                Text(description, style = EmberType.body14.copy(color = c.mutedForeground))
            }
            content()
            if (footer != null) Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { footer() }
        }
        return
    }
    Box(
        Modifier.fillMaxSize().background(c.background).statusBarsPadding().navigationBarsPadding().imePadding(),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            Modifier.widthIn(max = 384.dp).fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        ) {
            Column(Modifier.fillMaxWidth().background(c.field, RoundedCornerShape(Radii.hero)).padding(28.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    BrandMark(size = 40.dp)
                    Text("Combust", style = EmberType.authBrand.copy(color = c.foreground))
                }
                Text(
                    "Fuel, mileage and cost for your bike.",
                    style = EmberType.body15.copy(color = c.mutedForeground),
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
            Column(
                Modifier.fillMaxWidth().emberCard().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(title, style = EmberType.sheetTitle.copy(fontSize = 30.sp, color = c.foreground))
                    Text(description, style = EmberType.body14.copy(color = c.mutedForeground))
                }
                content()
                if (footer != null) Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { footer() }
            }
        }
    }
}

/**
 * Sign in / sign up / forgot password. [onContinueLocal] adds "Continue without an account"
 * (login page only); [embedded] renders just the form for use inside a dialog.
 */
@Composable
fun AuthPage(controller: AppController, onContinueLocal: (() -> Unit)? = null, embedded: Boolean = false) {
    var view by remember { mutableStateOf(AuthView.SignIn) }
    val toast = LocalToaster.current
    val c = Ember.colors

    when (view) {
        AuthView.SignUp -> AuthShell(
            "Create an account", "Sign up to start tracking your fuel entries.", embedded,
            footer = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Already have an account?", style = EmberType.body14.copy(color = c.mutedForeground))
                    TextLink("Sign in", { view = AuthView.SignIn })
                }
            },
        ) { SignUpForm(controller) { toast("Account created!") } }

        AuthView.Forgot -> AuthShell(
            "Reset your password", "Enter your email and we'll send you a one-time code.", embedded,
            footer = { TextLink("Back to sign in", { view = AuthView.SignIn }) },
        ) { ForgotPasswordForm(controller) { toast("Password updated. Please sign in."); view = AuthView.SignIn } }

        AuthView.SignIn -> AuthShell(
            "Sign in", "Welcome back. Enter your details to continue.", embedded,
            footer = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Don't have an account?", style = EmberType.body14.copy(color = c.mutedForeground))
                    TextLink("Sign up", { view = AuthView.SignUp })
                }
            },
        ) {
            SignInForm(controller, onForgot = { view = AuthView.Forgot })
            if (onContinueLocal != null) {
                Divider()
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PillButton("Continue without an account", onContinueLocal, Modifier.fillMaxWidth(), style = ButtonStyle.Outline, size = ButtonSize.Lg)
                    Text(
                        "Your data stays on this device and works offline. You can add a cloud account later in Settings.",
                        style = EmberType.small12.copy(color = c.mutedForeground),
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
private fun SignInForm(controller: AppController, onForgot: () -> Unit) {
    val toast = LocalToaster.current
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun submit() {
        emailError = when {
            email.isBlank() -> "Email is required"
            !EMAIL.matches(email.trim()) -> "Enter a valid email"
            else -> null
        }
        passwordError = if (password.isEmpty()) "Password is required" else null
        if (emailError != null || passwordError != null || busy) return
        busy = true
        scope.launch {
            try {
                controller.signIn(email, password)
            } catch (e: Exception) {
                toast(errorText(e, "Failed to sign in"))
            } finally {
                busy = false
            }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        EmberTextField(
            email, { email = it }, label = "Email", error = emailError,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Password", style = EmberType.label13Bold.copy(color = Ember.colors.mutedForeground))
                TextLink("Forgot password?", onForgot)
            }
            EmberTextField(
                password, { password = it }, error = passwordError,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                visualTransformation = PasswordVisualTransformation(),
            )
        }
        PillButton("Sign in", ::submit, Modifier.fillMaxWidth(), size = ButtonSize.Lg, enabled = !busy)
    }
}

@Composable
private fun SignUpForm(controller: AppController, onSignedUp: () -> Unit) {
    val toast = LocalToaster.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var otpSent by remember { mutableStateOf(false) }
    var errors by remember { mutableStateOf(emptyMap<String, String>()) }
    var busy by remember { mutableStateOf(false) }

    fun emailError(): String? = when {
        email.isBlank() -> "Email is required"
        !EMAIL.matches(email.trim()) -> "Enter a valid email"
        else -> null
    }

    fun sendOtp() {
        val err = emailError()
        errors = if (err != null) errors + ("email" to err) else errors - "email"
        if (err != null) return
        scope.launch {
            try {
                controller.signUpSendOtp(email)
                otpSent = true
                toast("OTP sent to ${email.trim()}")
            } catch (e: Exception) {
                toast(errorText(e, "Failed to send OTP"))
            }
        }
    }

    fun submit() {
        val e = mutableMapOf<String, String>()
        if (name.isBlank()) e["name"] = "Name is required"
        emailError()?.let { e["email"] = it }
        if (password.length < 8) e["password"] = "Password must be at least 8 characters"
        if (otp.isBlank()) e["otp"] = "Enter the code sent to your email"
        else if (otp.trim().length != 6) e["otp"] = "Code must be 6 digits"
        errors = e
        if (e.isNotEmpty() || busy) return
        busy = true
        scope.launch {
            try {
                controller.signUpVerify(name, email, password, otp)
                onSignedUp()
            } catch (ex: Exception) {
                toast(errorText(ex, "Failed to create account"))
            } finally {
                busy = false
            }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        EmberTextField(name, { name = it }, label = "Name", error = errors["name"], keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text))
        EmberTextField(
            email, { email = it }, label = "Email", error = errors["email"],
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            trailing = { TextLink(if (otpSent) "Resend" else "Send OTP", ::sendOtp, Modifier.padding(horizontal = 8.dp)) },
        )
        OtpField(otp, { otp = it.filter(Char::isDigit).take(6) }, enabled = otpSent, error = errors["otp"], sent = otpSent)
        EmberTextField(
            password, { password = it }, label = "Password", error = errors["password"],
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            visualTransformation = PasswordVisualTransformation(),
        )
        PillButton("Create account", ::submit, Modifier.fillMaxWidth(), size = ButtonSize.Lg, enabled = !busy)
    }
}

@Composable
private fun OtpField(value: String, onChange: (String) -> Unit, enabled: Boolean, error: String?, sent: Boolean) {
    EmberTextField(
        value, onChange, label = "OTP", enabled = enabled, error = error,
        helper = if (sent) "Enter the 6-digit code we emailed you." else "Send a code to your email first.",
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        textStyle = EmberType.body15.copy(fontSize = 18.sp, letterSpacing = 8.sp, textAlign = TextAlign.Center),
        height = 48.dp,
    )
}

@Composable
private fun ForgotPasswordForm(controller: AppController, onReset: () -> Unit) {
    val toast = LocalToaster.current
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var otpSent by remember { mutableStateOf(false) }
    var errors by remember { mutableStateOf(emptyMap<String, String>()) }
    var busy by remember { mutableStateOf(false) }

    fun emailError(): String? = when {
        email.isBlank() -> "Email is required"
        !EMAIL.matches(email.trim()) -> "Enter a valid email"
        else -> null
    }

    fun sendOtp() {
        val err = emailError()
        errors = if (err != null) errors + ("email" to err) else errors - "email"
        if (err != null) return
        scope.launch {
            try {
                controller.forgotPasswordSendOtp(email)
                otpSent = true
                toast("OTP sent to ${email.trim()}")
            } catch (e: Exception) {
                toast(errorText(e, "Failed to send OTP"))
            }
        }
    }

    fun submit() {
        val e = mutableMapOf<String, String>()
        emailError()?.let { e["email"] = it }
        if (otp.isBlank()) e["otp"] = "Enter the code sent to your email"
        else if (otp.trim().length != 6) e["otp"] = "Code must be 6 digits"
        if (newPassword.length < 8) e["newPassword"] = "Password must be at least 8 characters"
        errors = e
        if (e.isNotEmpty() || busy) return
        busy = true
        scope.launch {
            try {
                controller.forgotPasswordReset(email, otp, newPassword)
                onReset()
            } catch (ex: Exception) {
                toast(errorText(ex, "Failed to reset password"))
            } finally {
                busy = false
            }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        EmberTextField(
            email, { email = it }, label = "Email", error = errors["email"],
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            trailing = { TextLink(if (otpSent) "Resend" else "Send OTP", ::sendOtp, Modifier.padding(horizontal = 8.dp)) },
        )
        OtpField(otp, { otp = it.filter(Char::isDigit).take(6) }, enabled = otpSent, error = errors["otp"], sent = otpSent)
        EmberTextField(
            newPassword, { newPassword = it }, label = "New password", enabled = otpSent, error = errors["newPassword"],
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            visualTransformation = PasswordVisualTransformation(),
        )
        PillButton("Reset password", ::submit, Modifier.fillMaxWidth(), size = ButtonSize.Lg, enabled = !busy)
    }
}

/** First-run screen: name (and optional plate) for the first vehicle. */
@Composable
fun AddVehicleOnboarding(controller: AppController) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var plate by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    AuthShell("Add your vehicle", "Track fuel and mileage for a vehicle to get started.") {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            EmberTextField(name, { name = it }, label = "Name", placeholder = "e.g. Honda Activa 6G", error = error)
            EmberTextField(plate, { plate = it }, label = "Plate (optional)", placeholder = "e.g. GJ 06 KL 4412")
            PillButton(
                "Add vehicle",
                {
                    if (name.isBlank()) { error = "Name is required"; return@PillButton }
                    error = null
                    busy = true
                    scope.launch {
                        try { controller.addVehicle(name, plate.ifBlank { null }) } finally { busy = false }
                    }
                },
                Modifier.fillMaxWidth(), size = ButtonSize.Lg, enabled = !busy,
            )
        }
    }
}
