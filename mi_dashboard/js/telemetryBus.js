// Patrón Observer: los paneles se suscriben y la fuente de datos publica.
// Ningún panel conoce de dónde vienen los datos (WebSocket, polling o robot real).

export class TelemetryBus {
  #suscriptores = new Set();
  #ultimo = null;

  subscribe(fn) {
    this.#suscriptores.add(fn);
    return () => this.#suscriptores.delete(fn);   // devuelve la función para desuscribirse
  }

  publish(telemetria) {
    this.#ultimo = telemetria;
    for (const fn of this.#suscriptores) {
      try {
        fn(telemetria);
      } catch (err) {
        // Un panel roto no tiene que frenar a los demás.
        console.error("Error en suscriptor de telemetría:", err);
      }
    }
  }

  get ultimo() {
    return this.#ultimo;
  }
}
