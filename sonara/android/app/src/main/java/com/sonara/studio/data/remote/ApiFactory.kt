package com.sonara.studio.data.remote

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.sonara.studio.data.prefs.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

/** Normalises whatever the user typed into a usable base URL. */
fun parseServerUrl(raw: String): HttpUrl? {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return null
    val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        trimmed
    } else {
        "http://$trimmed"
    }
    return withScheme.toHttpUrlOrNull()
}

/**
 * Retrofit fixes its base URL at construction time, but the user can change the backend
 * address at runtime from Settings. This interceptor rewrites every outgoing request onto
 * the currently configured host, so a single long-lived OkHttp/Retrofit pair is enough.
 */
class DynamicHostInterceptor(private val settings: SettingsRepository) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val config = runBlocking { settings.snapshot() }
        val original = chain.request()
        val builder = original.newBuilder()
        val target = parseServerUrl(config.serverUrl)
        if (target != null) {
            val prefix = target.encodedPath.trim('/')
            val newPath = if (prefix.isEmpty()) {
                original.url.encodedPath
            } else {
                "/$prefix${original.url.encodedPath}"
            }
            val rewritten = original.url.newBuilder()
                .scheme(target.scheme)
                .host(target.host)
                .port(target.port)
                .encodedPath(newPath)
                .build()
            builder.url(rewritten)
        }
        if (config.apiKey.isNotBlank()) {
            builder.header("Authorization", "Bearer " + config.apiKey)
        }
        if (config.engine.isNotBlank()) {
            builder.header("X-Sonara-Engine", config.engine)
        }
        builder.header("Accept", "application/json")
        return chain.proceed(builder.build())
    }
}

object ApiFactory {

    val json: Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
        encodeDefaults = true
        coerceInputValues = true
    }

    fun okHttp(settings: SettingsRepository): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(DynamicHostInterceptor(settings))
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(180, TimeUnit.SECONDS)
        .writeTimeout(180, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    fun api(client: OkHttpClient): SonaraApi = Retrofit.Builder()
        .baseUrl("http://127.0.0.1:8000/")
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(SonaraApi::class.java)
}
