// Patrón Facade: un único punto de entrada que esconde transporte, adaptación,
// distribución a paneles y captura. La UI (main.js) sólo habla con esta clase.

import { CONFIG } from "./config.js";
import { fetchInfo, PollingSource, WebSocketSource } from "./api.js";
import { adaptarInfo, adaptarTelemetria } from "./adapter.js";
import { TelemetryBus } from "./telemetryBus.js";
import { CaptureStore } from "./capture.js";

export class Dashboard {
  bus = new TelemetryBus();
  capturas = new CaptureStore();

  #panels;
  #eventos;
  #fuente = null;
  #baseUrl = "";
  #info = null;
  #intento = 0;
  #desuscribirGrabacion = null;

  /**
   * @param panels  objetos con init(info) y update(telemetria)
   * @param eventos callbacks opcionales: onStatus(estado, detalle), onInfo(info), onCaptura(cantidad)
   */
  constructor(panels, eventos = {}) {
    this.#panels = panels;
    this.#eventos = { onStatus() {}, onInfo() {}, onCaptura() {}, ...eventos };
    for (const panel of panels) this.bus.subscribe((t) => panel.update(t));
  }

  get info() {
    return this.#info;
  }

  get grabando() {
    return this.#desuscribirGrabacion !== null;
  }

  async conectar(baseUrl, transporte = "auto") {
    this.desconectar();
    const intento = ++this.#intento;
    this.#baseUrl = baseUrl;
    this.#info = null;
    this.#panels.forEach((p) => p.init(adaptarInfo({})));
    await this.#cargarInfo();
    if (intento !== this.#intento) return;   // hubo otro conectar() mientras esperábamos

    if (transporte === "poll") this.#usar(new PollingSource(baseUrl));
    else this.#usar(new WebSocketSource(baseUrl), transporte === "auto");
  }

  desconectar() {
    this.#fuente?.stop();
    this.#fuente = null;
    this.#eventos.onStatus("desconectado", "");
  }

  capturar() {
    this.capturas.agregar(this.bus.ultimo);
    this.#eventos.onCaptura(this.capturas.cantidad);
  }

  /** Captura continua: guarda cada muestra que llega (como "Grabar" en electroSim). */
  alternarGrabacion() {
    if (this.grabando) {
      this.#desuscribirGrabacion();
      this.#desuscribirGrabacion = null;
    } else {
      this.#desuscribirGrabacion = this.bus.subscribe((t) => {
        this.capturas.agregar(t);
        this.#eventos.onCaptura(this.capturas.cantidad);
      });
    }
    return this.grabando;
  }

  exportarCSV() {
    if (this.capturas.cantidad > 0) this.capturas.descargar();
  }

  limpiarCapturas() {
    this.capturas.limpiar();
    this.#eventos.onCaptura(0);
  }

  async #cargarInfo() {
    try {
      this.#info = adaptarInfo(await fetchInfo(this.#baseUrl));
      this.#panels.forEach((p) => p.init(this.#info));
      this.#eventos.onInfo(this.#info);
    } catch (err) {
      // Sin /info igual se puede arrancar: los paneles se arman con la primera muestra.
      console.warn("No se pudo leer /info:", err.message);
    }
  }

  #usar(fuente, conFallback = false) {
    this.#fuente = fuente;
    fuente.start({
      onData: (raw) => {
        if (!this.#info) this.#cargarInfo();
        this.bus.publish(adaptarTelemetria(raw));
      },
      onStatus: (estado, detalle) => {
        this.#eventos.onStatus(estado, detalle);
        // Modo auto: si el WebSocket no logra conectar, se pasa a polling.
        if (conFallback && fuente.fallosSeguidos >= CONFIG.WS_FALLOS_ANTES_DE_POLLING) {
          console.info("WebSocket no disponible, usando polling.");
          fuente.stop();
          this.#usar(new PollingSource(this.#baseUrl));
        }
      },
    });
  }
}
