package app.halalkansai

import android.content.Context
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Puente entre la app web y el widget.
 *
 * La app calcula los horarios (un solo algoritmo, en TypeScript, con tests) y
 * aquí solo se guardan y se repinta el widget. Deliberadamente tonto: toda la
 * lógica vive en un sitio.
 */
@CapacitorPlugin(name = "PrayerWidget")
class WidgetBridge : Plugin() {

    @PluginMethod
    fun update(call: PluginCall) {
        val name = call.getString("name")
        val time = call.getString("time")
        if (name.isNullOrBlank() || time.isNullOrBlank()) {
            call.reject("name y time son obligatorios")
            return
        }

        context
            .getSharedPreferences(PrayerWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString("next_name", name)
            .putString("next_time", time)
            .putString("city", call.getString("city") ?: "")
            .apply()

        PrayerWidget.refreshAll(context)
        call.resolve()
    }
}
