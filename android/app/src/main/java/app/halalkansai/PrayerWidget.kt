package app.halalkansai

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Widget de pantalla de inicio: el próximo rezo, sin abrir la app.
 *
 * Por qué en Kotlin y no en la web: un widget vive en el lanzador de Android,
 * fuera del navegador y fuera de la aplicación. No hay forma de dibujarlo con
 * HTML. Es el único sitio de este proyecto donde otro lenguaje no es una
 * preferencia, sino la única opción.
 *
 * Por qué importa: mirar la hora del rezo es lo que más veces al día hace un
 * usuario de esta app. Que tenga que desbloquear, buscar el icono y esperar a
 * que cargue —cinco veces al día, todos los días— es exactamente el tipo de
 * fricción que hace que la gente deje de usar algo.
 *
 * Los horarios NO se recalculan aquí. Los calcula la app (TypeScript, con sus
 * tests) y los deja guardados; el widget solo los pinta. Duplicar el algoritmo
 * astronómico en dos lenguajes sería garantizar que un día discrepen, y ese
 * día el widget diría una hora de rezo equivocada.
 */
class PrayerWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        manager: AppWidgetManager,
        ids: IntArray,
    ) {
        for (id in ids) render(context, manager, id)
    }

    companion object {
        const val PREFS = "hk_widget"
        private const val KEY_NAME = "next_name"
        private const val KEY_TIME = "next_time"
        private const val KEY_CITY = "city"

        /** Lo llama el puente cuando la app recalcula los horarios. */
        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, PrayerWidget::class.java))
            for (id in ids) render(context, manager, id)
        }

        private fun render(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val views = RemoteViews(context.packageName, R.layout.prayer_widget)

            // Sin datos todavía: se dice, no se inventa una hora.
            val name = prefs.getString(KEY_NAME, null)
            val time = prefs.getString(KEY_TIME, null)

            if (name.isNullOrBlank() || time.isNullOrBlank()) {
                views.setTextViewText(R.id.widget_name, context.getString(R.string.widget_empty))
                views.setTextViewText(R.id.widget_time, "—")
                views.setTextViewText(R.id.widget_city, "")
            } else {
                views.setTextViewText(R.id.widget_name, name)
                views.setTextViewText(R.id.widget_time, time)
                views.setTextViewText(R.id.widget_city, prefs.getString(KEY_CITY, "") ?: "")
            }

            // Tocar el widget abre la app: es lo que espera cualquiera.
            val abrir = Intent(context, MainActivity::class.java)
            views.setOnClickPendingIntent(
                R.id.widget_root,
                PendingIntent.getActivity(
                    context,
                    0,
                    abrir,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
                ),
            )

            manager.updateAppWidget(id, views)
        }
    }
}
