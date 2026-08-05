package com.turbogit.turboos

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebResourceErrorCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.turbogit.turboos.obd.Elm327Client
import com.turbogit.turboos.obd.ObdDeviceCandidate
import com.turbogit.turboos.obd.ObdDiagnosticsService
import com.turbogit.turboos.obd.ObdException
import com.turbogit.turboos.web.TurboOsAndroidBridge
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

/**
 * Host WebView aplikacji TurboOS.
 *
 * ZMIANY WZGLĘDEM 0.2.0
 * ---------------------
 * 1. [KRYTYCZNE — konfiguracja wydania] Artefakt 0.2.0 był zbudowany jako
 *    `BUILD_TYPE = "debug"`, z `android:debuggable="true"` i podpisany kluczem
 *    „Android Debug". Konsekwencje: możliwość podpięcia debuggera do procesu i
 *    odczytu VIN/DTC, brak R8/ProGuard, brak możliwości aktualizacji przez Google
 *    Play (klucz debug). Poprawna konfiguracja `buildTypes` — patrz
 *    `turboos-audit/android/build.gradle.kts.sample`.
 * 2. [BŁĄD — Android 15] `targetSdkVersion 35` wymusza tryb edge-to-edge. 0.2.0
 *    ustawiał `setContentView(webView)` bez obsługi wstawek systemowych, więc na
 *    Androidzie 15 górna część interfejsu chowała się pod paskiem stanu, a dolna
 *    pod paskiem nawigacji. Teraz `WindowCompat` + jawna obsługa wstawek.
 * 3. [BŁĄD — utrata sesji] Brak `android:configChanges` powodował odtworzenie
 *    aktywności przy obrocie ekranu lub zmianie motywu, co niszczyło `WebView`
 *    i zrywało aktywne połączenie OBD w trakcie pomiaru drogowego.
 * 4. [STABILNOŚĆ] `pendingTextExport` był chroniony przez `synchronized`, ale
 *    czytany również z `onDestroy` bez tej blokady. Zastąpione [AtomicReference].
 * 5. [OBSŁUGA BŁĘDÓW] Dodany `onReceivedError` — 0.2.0 przy nieudanym załadowaniu
 *    zasobu pokazywał pustą, białą stronę bez żadnej informacji.
 */
class MainActivity : Activity() {

    private companion object {
        const val BRIDGE_NAME = "TurboOSAndroid"
        const val LOCAL_APP_HOST = "appassets.androidplatform.net"
        const val LOCAL_APP_URL = "https://$LOCAL_APP_HOST/index.html"
        const val HOST_STOPPED_EVENT = "window.dispatchEvent(new Event('turboos-obd-host-stopped'));"
        const val BLUETOOTH_PERMISSION_REQUEST = 1201
        const val TEXT_EXPORT_REQUEST = 2301
    }

    private lateinit var webView: WebView
    private lateinit var bridge: TurboOsAndroidBridge
    private lateinit var elmClient: Elm327Client

    private val documentExecutor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "turboos-document-export").apply { isDaemon = true }
    }

    private val pendingTextExport = AtomicReference<PendingTextExport?>(null)

    @Volatile private var trustedLocalPageLoaded = false
    @Volatile private var systemDocumentFlowActive = false
    private var notifyObdStopOnStart = false

    private data class PendingTextExport(val fileName: String, val content: ByteArray)

    // ------------------------------------------------------------ cykl życia

    override fun onCreate(savedInstanceState: Bundle?) {
        // Tryb edge-to-edge jest wymuszony przez targetSdk 35; wstawki obsługuje
        // `wrapWithInsets` poniżej.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        super.onCreate(savedInstanceState)

        elmClient = Elm327Client(applicationContext)
        webView = WebView(this)

        val diagnostics = ObdDiagnosticsService(
            classicClient = elmClient,
            preferences = getSharedPreferences("obd", MODE_PRIVATE),
            ensureBluetoothPermission = ::ensureBluetoothPermission,
        )
        bridge = TurboOsAndroidBridge(this, webView, diagnostics)

        configureWebView()
        setContentView(wrapWithInsets(webView))
        webView.loadUrl(LOCAL_APP_URL)
    }

    /**
     * Kontener honorujący wstawki systemowe. Bez tego (Android 15, targetSdk 35)
     * treść WebView rysuje się pod paskiem stanu i nawigacji.
     */
    private fun wrapWithInsets(child: WebView): ViewGroup {
        val container = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#080a0d"))
            addView(
                child,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                ),
            )
        }
        ViewCompat.setOnApplyWindowInsetsListener(container) { view, windowInsets ->
            val insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
            )
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom)
            WindowInsetsCompat.CONSUMED
        }
        return container
    }

    private fun configureWebView() {
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = false
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = false
            blockNetworkLoads = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            safeBrowsingEnabled = true
            // Aplikacja ma własne skalowanie — blokujemy systemowe, żeby układ
            // raportu diagnostycznego był identyczny na ekranie i w PDF.
            textZoom = 100
        }

        // Debugowanie zawartości WebView WYŁĄCZNIE w kompilacjach debug.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView.addJavascriptInterface(bridge, BRIDGE_NAME)
        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean = !isTrustedLocalUrl(request.url)

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                trustedLocalPageLoaded = url
                    ?.let { runCatching { Uri.parse(it) }.getOrNull() }
                    ?.let(::isTrustedLocalUrl) == true
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceErrorCompat,
            ) {
                if (!request.isForMainFrame) return
                trustedLocalPageLoaded = false
                Toast.makeText(
                    applicationContext,
                    "Nie udało się załadować interfejsu TurboOS.",
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
    }

    override fun onStart() {
        super.onStart()
        if (!::bridge.isInitialized) return

        bridge.onHostStart()
        webView.onResume()
        webView.resumeTimers()

        if (notifyObdStopOnStart) {
            notifyObdStopOnStart = false
            webView.evaluateJavascript(HOST_STOPPED_EVENT, null)
        }
        systemDocumentFlowActive = false
    }

    override fun onStop() {
        setObdScreenAwake(false)
        if (::bridge.isInitialized) {
            bridge.onHostStop()
            notifyObdStopOnStart = true
        }
        // Systemowy selektor plików / podgląd wydruku technicznie zatrzymuje
        // aktywność — nie pauzujemy wtedy WebView, bo po powrocie strona musi
        // odebrać wynik operacji.
        if (::webView.isInitialized && !systemDocumentFlowActive) {
            webView.onPause()
            webView.pauseTimers()
        }
        super.onStop()
    }

    override fun onDestroy() {
        setObdScreenAwake(false)
        if (::bridge.isInitialized) bridge.close()
        documentExecutor.shutdownNow()
        pendingTextExport.set(null)

        if (::webView.isInitialized) {
            webView.stopLoading()
            webView.removeJavascriptInterface(BRIDGE_NAME)
            // Odpięcie od hierarchii przed `destroy()` — bez tego WebView
            // potrafi utrzymać referencję do zniszczonej aktywności.
            (webView.parent as? ViewGroup)?.removeView(webView)
            webView.destroy()
        }
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) systemDocumentFlowActive = false
    }

    // ------------------------------------------------------------ zaufanie

    fun isTrustedLocalPageLoaded(): Boolean = trustedLocalPageLoaded

    private fun isTrustedLocalUrl(uri: Uri): Boolean =
        uri.scheme == "https" && uri.host == LOCAL_APP_HOST

    // ---------------------------------------------------------- uprawnienia

    fun hasBluetoothConnectPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED

    fun hasBluetoothScanPermission(): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        checkSelfPermission(android.Manifest.permission.BLUETOOTH_SCAN) ==
            PackageManager.PERMISSION_GRANTED
    } else {
        checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }

    /**
     * Wywoływane z warstwy domenowej. Rzuca [ObdException], które most zamienia
     * na kod błędu dla UI — dzięki temu strona wie, że ma poprosić o ponowienie
     * po przyznaniu uprawnienia.
     */
    private fun ensureBluetoothPermission() {
        if (hasBluetoothConnectPermission()) return
        requestBluetoothPermissions()
        throw ObdException(
            "BLUETOOTH_PERMISSION_REQUIRED",
            "Zezwól aplikacji na łączenie z urządzeniami Bluetooth, a potem naciśnij Połącz ponownie.",
        )
    }

    private fun requestBluetoothPermissions() = runOnUiThread {
        val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                android.Manifest.permission.BLUETOOTH_SCAN,
                android.Manifest.permission.BLUETOOTH_CONNECT,
            )
        } else {
            arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION)
        }
        requestPermissions(permissions, BLUETOOTH_PERMISSION_REQUEST)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != BLUETOOTH_PERMISSION_REQUEST) return

        val granted = grantResults.isNotEmpty() &&
            grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        val message = if (granted) {
            "Dostęp do adaptera przyznany. Naciśnij Połącz ponownie."
        } else {
            "Bez dostępu do Bluetooth aplikacja nie połączy się z OBD."
        }
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    // ------------------------------------------------------------- dokumenty

    fun setObdScreenAwake(enabled: Boolean) = runOnUiThread {
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    fun printLocalReport(documentName: String) {
        if (!trustedLocalPageLoaded) {
            throw ObdException(
                "UNTRUSTED_CONTENT",
                "Druk jest dostępny wyłącznie dla lokalnego raportu TurboOS.",
            )
        }
        val printManager = getSystemService(PrintManager::class.java)
            ?: throw ObdException("PRINT_UNAVAILABLE", "Systemowa usługa druku jest niedostępna.")

        runOnUiThread {
            runCatching {
                val adapter = webView.createPrintDocumentAdapter(documentName)
                systemDocumentFlowActive = true
                printManager.print(
                    documentName,
                    adapter,
                    PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                        .build(),
                )
            }.onFailure {
                systemDocumentFlowActive = false
                Toast.makeText(
                    applicationContext,
                    "Nie udało się otworzyć systemowego zapisu lub druku PDF.",
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
    }

    fun requestTextFileExport(fileName: String, mimeType: String, content: ByteArray) {
        if (!trustedLocalPageLoaded) {
            throw ObdException(
                "UNTRUSTED_CONTENT",
                "Eksport jest dostępny wyłącznie dla lokalnego raportu TurboOS.",
            )
        }
        // `compareAndSet` zastępuje blok `synchronized` z 0.2.0 — jedna operacja
        // atomowa zamiast sprawdzenia i przypisania pod blokadą.
        val pending = PendingTextExport(fileName, content.copyOf())
        if (!pendingTextExport.compareAndSet(null, pending)) {
            throw ObdException(
                "EXPORT_IN_PROGRESS",
                "Dokończ lub anuluj bieżący zapis pliku przed rozpoczęciem kolejnego.",
            )
        }

        runOnUiThread {
            runCatching {
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = mimeType
                    putExtra(Intent.EXTRA_TITLE, fileName)
                }
                systemDocumentFlowActive = true
                startActivityForResult(intent, TEXT_EXPORT_REQUEST)
            }.onFailure {
                systemDocumentFlowActive = false
                pendingTextExport.set(null)
                Toast.makeText(
                    applicationContext,
                    "Nie udało się otworzyć systemowego zapisu pliku.",
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != TEXT_EXPORT_REQUEST) {
            super.onActivityResult(requestCode, resultCode, data)
            return
        }

        val pending = pendingTextExport.getAndSet(null)
        val uri = data?.data

        if (resultCode != RESULT_OK || pending == null || uri == null) {
            Toast.makeText(applicationContext, "Anulowano zapis pliku CSV.", Toast.LENGTH_SHORT).show()
            return
        }
        if (uri.scheme != "content") {
            Toast.makeText(applicationContext, "Odrzucono niebezpieczne miejsce zapisu.", Toast.LENGTH_LONG)
                .show()
            return
        }

        documentExecutor.execute {
            val result = runCatching {
                contentResolver.openOutputStream(uri, "wt")
                    ?.use { stream ->
                        stream.write(pending.content)
                        stream.flush()
                    }
                    ?: error("System nie udostępnił strumienia zapisu.")
            }
            runOnUiThread {
                val message = if (result.isSuccess) {
                    "Zapisano ${pending.fileName}."
                } else {
                    "Nie udało się zapisać pliku CSV."
                }
                Toast.makeText(applicationContext, message, Toast.LENGTH_LONG).show()
            }
        }
    }

    // -------------------------------------------------------- wybór adaptera

    fun showDevicePicker(devices: List<ObdDeviceCandidate>, onSelected: (ObdDeviceCandidate) -> Unit) =
        runOnUiThread {
            val labels = devices.map { device ->
                buildString {
                    append(device.name ?: "Adapter bez nazwy")
                    append(" · ").append(device.linkType.displayName)
                    if (device.rssi != 0) append(" · ${device.rssi} dBm")
                    append("\n").append(maskBluetoothAddress(device.address))
                }
            }.toTypedArray()

            AlertDialog.Builder(this)
                .setTitle("Wybierz adapter OBD")
                .setItems(labels) { _, index -> onSelected(devices[index]) }
                .setNegativeButton("Anuluj", null)
                .show()
        }

    private fun maskBluetoothAddress(address: String): String {
        val parts = address.split(':')
        return if (parts.size == 6) "**:**:**:**:${parts[4]}:${parts[5]}" else "adres ukryty"
    }
}
