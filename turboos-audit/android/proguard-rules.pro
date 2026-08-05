# Reguły R8 dla wydania TurboOS.
#
# W 0.2.0 minifikacja była całkowicie wyłączona (build typu debug), więc pełne
# nazwy klas, metod i wszystkie komunikaty diagnostyczne były czytelne wprost
# z APK. Po włączeniu `isMinifyEnabled = true` konieczne jest zachowanie mostu
# JavaScript — R8 nie widzi wywołań z warstwy webowej i bez tych reguł usunąłby
# lub przemianował metody `@JavascriptInterface`, co objawia się błędem
# „TypeError: window.TurboOSAndroid.connect is not a function" dopiero w runtime.

-keepclasseswithmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Nazwa klasy mostu bywa logowana przy diagnozowaniu zgłoszeń z warsztatów.
-keepnames class com.turbogit.turboos.web.TurboOsAndroidBridge

# Kody błędów przekazywane do UI muszą pozostać stabilne — trzymamy pole `code`.
-keepclassmembers class com.turbogit.turboos.obd.ObdException {
    java.lang.String code;
}

# Czytelne ślady stosu w raportach awarii.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Usunięcie logów debug z wydania — komunikaty ELM327 mogą zawierać VIN.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
