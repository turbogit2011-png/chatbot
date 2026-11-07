package com.sonara.studio.util

fun formatDuration(millis: Long): String {
    if (millis <= 0) return "--:--"
    val totalSeconds = millis / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "$minutes:${seconds.toString().padStart(2, '0')}"
}

fun formatBytes(bytes: Long): String {
    if (bytes <= 0) return "0 MB"
    val mb = bytes / 1024.0 / 1024.0
    return if (mb < 1024) String.format("%.1f MB", mb) else String.format("%.2f GB", mb / 1024)
}
