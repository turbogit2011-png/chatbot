package com.pulse.studio.util

fun formatDuration(seconds: Float): String {
    if (seconds <= 0f) return "0:00"
    val total = seconds.toInt()
    return "${total / 60}:${(total % 60).toString().padStart(2, '0')}"
}

fun formatBytes(bytes: Long): String {
    if (bytes <= 0) return "0 MB"
    val mb = bytes / 1024.0 / 1024.0
    return if (mb < 1024) String.format("%.1f MB", mb) else String.format("%.2f GB", mb / 1024)
}
