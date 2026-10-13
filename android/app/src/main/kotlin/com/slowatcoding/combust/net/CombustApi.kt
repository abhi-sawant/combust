package com.slowatcoding.combust.net

import com.slowatcoding.combust.core.SyncApi
import com.slowatcoding.combust.core.SyncRequest
import com.slowatcoding.combust.core.SyncResponse
import com.slowatcoding.combust.data.AuthUser
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Non-2xx API response; [status] is 0 when the request never reached the server. */
class ApiException(message: String, val status: Int, val details: Map<String, String> = emptyMap()) : Exception(message)

@Serializable
private data class AuthUserDto(val id: Int = 0, val name: String = "", val email: String = "")

data class AuthResult(val token: String, val user: AuthUser)

/**
 * Talks to the same PHP backend as the web app. Auth is a Bearer JWT; the public auth endpoints
 * send no token. Android sends no Origin header, so the backend's CORS rules don't apply.
 */
class CombustApi(
    private val baseUrl: String,
    private val tokenProvider: () -> String?,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build(),
) : SyncApi {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; explicitNulls = true }
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    private suspend fun call(path: String, method: String, body: String?, auth: Boolean): JsonObject = withContext(Dispatchers.IO) {
        val url = baseUrl.trimEnd('/').plus("/").plus(path.trimStart('/')).toHttpUrl()
        val builder = Request.Builder().url(url).header("Accept", "application/json")
        if (auth) tokenProvider()?.let { builder.header("Authorization", "Bearer $it") }
        builder.method(method, body?.toRequestBody(jsonType) ?: if (method == "GET") null else "".toRequestBody(jsonType))

        val response = try {
            client.newCall(builder.build()).await()
        } catch (e: IOException) {
            throw ApiException(e.message ?: "Network error", 0)
        }
        response.use {
            val text = it.body.string()
            val parsed = runCatching { json.parseToJsonElement(text).jsonObject }.getOrNull()
            if (!it.isSuccessful) {
                val details = (parsed?.get("details") as? JsonObject)
                    ?.mapValues { (_, v) -> v.jsonPrimitive.contentOrNull ?: "" } ?: emptyMap()
                throw ApiException(parsed?.get("error")?.jsonPrimitive?.contentOrNull ?: "Request failed", it.code, details)
            }
            parsed ?: JsonObject(emptyMap())
        }
    }

    private suspend fun Call.await(): Response = suspendCancellableCoroutine { cont ->
        enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { if (!cont.isCancelled) cont.resumeWithException(e) }
            override fun onResponse(call: Call, response: Response) { cont.resume(response) }
        })
        cont.invokeOnCancellation { runCatching { cancel() } }
    }

    private fun obj(build: kotlinx.serialization.json.JsonObjectBuilder.() -> Unit) = buildJsonObject(build).toString()

    private fun JsonObject.toAuthResult(): AuthResult {
        val user = json.decodeFromJsonElement(AuthUserDto.serializer(), this["user"]!!.jsonObject)
        return AuthResult(this["token"]!!.jsonPrimitive.content, AuthUser(user.id, user.name, user.email))
    }

    suspend fun me(): AuthUser {
        val user = json.decodeFromJsonElement(AuthUserDto.serializer(), call("/me", "GET", null, auth = true)["user"]!!.jsonObject)
        return AuthUser(user.id, user.name, user.email)
    }

    suspend fun signUpSendOtp(email: String) {
        call("/auth/signup/send-otp", "POST", obj { put("email", email) }, auth = false)
    }

    suspend fun signUpVerify(name: String, email: String, password: String, otp: String): AuthResult =
        call(
            "/auth/signup/verify", "POST",
            obj { put("name", name); put("email", email); put("password", password); put("otp", otp) },
            auth = false,
        ).toAuthResult()

    suspend fun signIn(email: String, password: String): AuthResult =
        call("/auth/login", "POST", obj { put("email", email); put("password", password) }, auth = false).toAuthResult()

    suspend fun forgotPasswordSendOtp(email: String) {
        call("/auth/forgot-password/send-otp", "POST", obj { put("email", email) }, auth = false)
    }

    suspend fun forgotPasswordReset(email: String, otp: String, newPassword: String) {
        call(
            "/auth/forgot-password/reset", "POST",
            obj { put("email", email); put("otp", otp); put("newPassword", newPassword) },
            auth = false,
        )
    }

    override suspend fun sync(request: SyncRequest): SyncResponse {
        val body = json.encodeToString(SyncRequest.serializer(), request)
        val result = call("/sync", "POST", body, auth = true)
        return json.decodeFromJsonElement(SyncResponse.serializer(), result)
    }
}
