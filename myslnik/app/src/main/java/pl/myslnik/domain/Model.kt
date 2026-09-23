package pl.myslnik.domain

enum class EntryType { TASK, THOUGHT }

enum class EntryStatus { INBOX, ACTIVE, DONE, ARCHIVED, TRASH }

enum class Priority { NORMAL, IMPORTANT, URGENT }

/**
 * Reguła powtarzania zakodowana tekstowo (stabilny format do bazy):
 *  - "DAILY"            codziennie
 *  - "WORKDAYS"         dni robocze (pn-pt)
 *  - "WEEKDAYS:1,3,5"   wybrane dni tygodnia (ISO: 1=pn ... 7=nd)
 *  - "MONTHLY"          co miesiąc (ten sam dzień miesiąca)
 *  - "EVERY_N:5"        co N dni
 */
data class RepeatRule(val encoded: String) {
    companion object {
        const val DAILY = "DAILY"
        const val WORKDAYS = "WORKDAYS"
        const val MONTHLY = "MONTHLY"
        fun weekdays(days: Set<Int>) = "WEEKDAYS:" + days.sorted().joinToString(",")
        fun everyN(n: Int) = "EVERY_N:$n"
    }
}
