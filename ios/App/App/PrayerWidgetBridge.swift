import Capacitor
import Foundation
import WidgetKit

/**
 Puente entre la app web y el widget de pantalla de inicio.

 Deliberadamente tonto: recibe un nombre y una hora ya calculados, los deja en
 el grupo compartido y le pide al sistema que repinte el widget. Ni un cálculo
 aquí — el algoritmo de los horarios vive en un solo sitio (`calculator.ts`,
 con sus tests) y desde ahí alimenta la pantalla, el widget de Android y este.
 */
@objc(PrayerWidgetPlugin)
public class PrayerWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrayerWidgetPlugin"
    public let jsName = "PrayerWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)
    ]

    /// El mismo grupo que declara el widget en sus entitlements.
    private let appGroup = "group.app.halalkansai"

    @objc func update(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), !name.isEmpty,
              let time = call.getString("time"), !time.isEmpty
        else {
            call.reject("name y time son obligatorios")
            return
        }

        guard let defaults = UserDefaults(suiteName: appGroup) else {
            // Sin grupo compartido no hay canal: se falla claro en vez de
            // fingir que se guardó algo.
            call.reject("no hay acceso al grupo compartido")
            return
        }

        defaults.set(name, forKey: "next_name")
        defaults.set(time, forKey: "next_time")
        defaults.set(call.getString("city") ?? "", forKey: "city")

        WidgetCenter.shared.reloadTimelines(ofKind: "PrayerWidget")
        call.resolve()
    }
}
