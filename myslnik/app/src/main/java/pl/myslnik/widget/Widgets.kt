package pl.myslnik.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import pl.myslnik.MyslnikApp
import pl.myslnik.ui.QuickAddActivity
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object WidgetUpdater {
    /** Odświeżenie widżetów po każdej zmianie w bazie. */
    suspend fun refreshAll(context: Context) {
        try {
            TodayWidget().updateAll(context)
            QuickAddWidget().updateAll(context)
        } catch (_: Exception) {
            // Brak widżetów na pulpicie — nic do zrobienia.
        }
    }
}

private val bgColor = ColorProvider(Color(0xEE101418))
private val textColor = ColorProvider(Color(0xFFECEFF1))
private val accentColor = ColorProvider(Color(0xFF8AB4F8))

/** Widżet „Szybkie dodawanie": duże przyciski „+" i „🎤". */
class QuickAddWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            Row(
                modifier = GlanceModifier.fillMaxSize().background(bgColor).cornerRadius(24.dp).padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                BigButton("＋", Intent(context, QuickAddActivity::class.java).setAction(QuickAddActivity.ACTION_QUICK_ADD))
                Spacer(GlanceModifier.width(8.dp))
                BigButton("🎤", Intent(context, QuickAddActivity::class.java).setAction(QuickAddActivity.ACTION_DICTATE))
            }
        }
    }

    @Composable
    private fun androidx.glance.layout.RowScope.BigButton(label: String, intent: Intent) {
        Box(
            modifier = GlanceModifier.defaultWeight().fillMaxSize()
                .background(ColorProvider(Color(0xFF1F2937)))
                .cornerRadius(20.dp)
                .clickable(actionStartActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))),
            contentAlignment = Alignment.Center
        ) {
            Text(label, style = TextStyle(color = textColor, fontSize = 28.sp, fontWeight = FontWeight.Bold))
        }
    }
}

class QuickAddWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = QuickAddWidget()
}

/** Akcja odhaczenia wpisu prosto z widżetu „Dziś". */
class CheckOffAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val entryId = parameters[keyEntryId] ?: return
        MyslnikApp.container(context).repository.markDone(entryId)
    }
    companion object {
        val keyEntryId = ActionParameters.Key<String>("entryId")
    }
}

/** Widżet „Dziś": lista na dziś z odhaczaniem. */
class TodayWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val container = MyslnikApp.container(context)
        val zone = ZoneId.systemDefault()
        val endOfDay = java.time.ZonedDateTime.now(zone).toLocalDate().plusDays(1)
            .atStartOfDay(zone).toInstant().toEpochMilli()
        val entries = container.database.entryDao().todayOnce(endOfDay)
        val fmt = DateTimeFormatter.ofPattern("HH:mm")
        val now = System.currentTimeMillis()

        provideContent {
            Column(
                modifier = GlanceModifier.fillMaxSize().background(bgColor).cornerRadius(24.dp).padding(12.dp)
            ) {
                Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Dziś",
                        style = TextStyle(color = accentColor, fontSize = 16.sp, fontWeight = FontWeight.Bold),
                        modifier = GlanceModifier.defaultWeight()
                    )
                    Text(
                        "＋",
                        style = TextStyle(color = accentColor, fontSize = 22.sp, fontWeight = FontWeight.Bold),
                        modifier = GlanceModifier.clickable(
                            actionStartActivity(
                                Intent(context, QuickAddActivity::class.java)
                                    .setAction(QuickAddActivity.ACTION_QUICK_ADD)
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            )
                        ).padding(horizontal = 8.dp)
                    )
                }
                Spacer(GlanceModifier.height(6.dp))
                if (entries.isEmpty()) {
                    Text("Nic na dziś 🎉", style = TextStyle(color = textColor, fontSize = 14.sp))
                } else {
                    entries.take(8).forEach { e ->
                        val overdue = (e.dueAt ?: 0) < now
                        Row(
                            modifier = GlanceModifier.fillMaxWidth().padding(vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "☐ ",
                                style = TextStyle(color = accentColor, fontSize = 18.sp),
                                modifier = GlanceModifier.clickable(
                                    actionRunCallback<CheckOffAction>(
                                        actionParametersOf(CheckOffAction.keyEntryId to e.id)
                                    )
                                )
                            )
                            val time = e.dueAt?.let { fmt.format(Instant.ofEpochMilli(it).atZone(zone)) } ?: ""
                            Text(
                                text = (if (overdue) "⚠ " else "") + "$time ${e.content}".trim(),
                                style = TextStyle(color = textColor, fontSize = 14.sp),
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }
    }
}

class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayWidget()
}
