/**
 * Recoge el audio del micrófono en el hilo de audio, no en el de la pantalla.
 *
 * Por qué existe. Esto se hacía con ScriptProcessorNode, que corre en el hilo
 * principal. Mientras Whisper transcribía la frase anterior —que es justo
 * cuando hay carga— ese hilo iba apretado y se perdían bloques de audio. El
 * resultado no era un corte limpio sino algo peor: la frase llegaba al modelo
 * con agujeros, y Whisper, que rellena lo que no entiende, devolvía letras
 * repetidas («ونننننننن…») y palabras inventadas. Se veía como si el modelo
 * fuera malo; era el audio lo que llegaba roto.
 *
 * Un AudioWorklet corre en el hilo de audio, con prioridad de tiempo real, y
 * no se entera de lo que haga la pantalla.
 */
class VadCollector extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    // Sin entrada todavía: devolver true mantiene vivo el nodo.
    if (!channel || channel.length === 0) return true;

    let sum = 0;
    for (let i = 0; i < channel.length; i++) sum += channel[i] * channel[i];

    // Copia: el búfer que da el worklet se reutiliza en el bloque siguiente.
    this.port.postMessage(
      { audio: new Float32Array(channel), rms: Math.sqrt(sum / channel.length) },
    );
    return true;
  }
}

registerProcessor('vad-collector', VadCollector);
