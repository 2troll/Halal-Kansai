import SwiftUI
import WidgetKit

/**
 Widget de pantalla de inicio para iPhone: el próximo rezo, sin abrir la app.

 Por qué en Swift y no en la web: un widget de iOS lo dibuja el sistema con
 SwiftUI, en su propio proceso y fuera de la app. No hay WebView ahí. Igual
 que en Android, es de los pocos sitios donde otro lenguaje no es preferencia
 sino la única opción.

 Los horarios NO se calculan aquí. Los calcula la app (`calculator.ts`, con
 sus tests) y los deja en el grupo compartido; el widget solo los pinta. Un
 solo algoritmo: duplicarlo en TypeScript, Kotlin y Swift sería garantizar
 que algún día discrepen, y ese día alguien reza a la hora equivocada.
 */

/// Grupo compartido entre la app y el widget. Es el único canal entre los dos.
let appGroup = "group.app.halalkansai"

struct PrayerEntry: TimelineEntry {
    let date: Date
    let name: String
    let time: String
    let city: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), name: "Fajr", time: "04:11", city: "")
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        completion(read())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        // Media hora: el sistema decide cuándo refrescar de verdad, y pedir
        // más a menudo solo gasta batería sin cambiar lo que se ve.
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [read()], policy: .after(next)))
    }

    /// Lee lo que la app dejó escrito. Sin datos, se dice; no se inventa una hora.
    private func read() -> PrayerEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        return PrayerEntry(
            date: Date(),
            name: defaults?.string(forKey: "next_name") ?? "",
            time: defaults?.string(forKey: "next_time") ?? "",
            city: defaults?.string(forKey: "city") ?? ""
        )
    }
}

struct PrayerWidgetView: View {
    var entry: PrayerEntry

    var body: some View {
        VStack(spacing: 2) {
            if entry.name.isEmpty || entry.time.isEmpty {
                // Primer arranque: el widget existe antes de que la app haya
                // calculado nada. Decirlo es mejor que un hueco en blanco.
                Text("Halal Kansai")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color(red: 0.88, green: 0.78, blue: 0.52))
                Text("—")
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(Color(red: 0.96, green: 0.95, blue: 0.90))
            } else {
                Text(entry.name)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color(red: 0.88, green: 0.78, blue: 0.52))
                    .lineLimit(1)
                Text(entry.time)
                    .font(.system(size: 30, weight: .bold))
                    .foregroundStyle(Color(red: 0.96, green: 0.95, blue: 0.90))
                if !entry.city.isEmpty {
                    Text(entry.city)
                        .font(.system(size: 11))
                        .foregroundStyle(Color(red: 0.62, green: 0.70, blue: 0.67))
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .fondoDeWidget()
    }
}

/**
 Fondo del widget, compatible con iOS 16.

 `containerBackground` llegó en iOS 17 y es obligatorio a partir de ahí: sin
 él, el widget sale con el fondo del sistema. Pero subir el mínimo a 17 dejaría
 fuera al iPhone 8 y al X, que siguen en muchas manos de esta comunidad. Así
 que se usa cuando existe y se pinta a mano cuando no.
 */
private extension View {
    @ViewBuilder
    func fondoDeWidget() -> some View {
        let verde = Color(red: 0.06, green: 0.13, blue: 0.11)
        if #available(iOS 17.0, *) {
            containerBackground(verde, for: .widget)
        } else {
            background(verde)
        }
    }
}

@main
struct PrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PrayerWidget", provider: Provider()) { entry in
            PrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("Próximo rezo")
        .description("La hora del próximo rezo, sin abrir la app.")
        .supportedFamilies([.systemSmall])
    }
}
