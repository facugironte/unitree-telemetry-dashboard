// Fuentes de datos. WebSocketSource y PollingSource exponen la misma interfaz
// (start / stop), así el resto del dashboard no sabe cuál está activa.
//
//   source.start({ onData(json), onStatus(estado, detalle) })
//   estado: "conectando" | "conectado" | "reconectando" | "error"

import { CONFIG } from "./config.js";

function quitarBarraFinal(url) {
  return url.replace(/\/+$/, "");
}

async function fetchJson(url, timeoutMs = CONFIG.FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) {
      const cuerpo = await res.json().catch(() => ({}));
      throw new Error(cuerpo.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function fetchInfo(baseUrl) {
  return fetchJson(`${quitarBarraFinal(baseUrl)}/info`);
}

export class WebSocketSource {
  nombre = "WebSocket";
  #url;
  #ws = null;
  #handlers = null;
  #activo = false;
  #espera = CONFIG.WS_BACKOFF_MIN_MS;
  #timerReconexion = null;
  #fallosSeguidos = 0;

  constructor(baseUrl) {
    this.#url = quitarBarraFinal(baseUrl).replace(/^http/, "ws") + "/ws";
  }

  /** Cantidad de intentos seguidos que fallaron sin recibir ningún dato. */
  get fallosSeguidos() {
    return this.#fallosSeguidos;
  }

  start(handlers) {
    this.#handlers = handlers;
    this.#activo = true;
    this.#abrir();
  }

  stop() {
    this.#activo = false;
    clearTimeout(this.#timerReconexion);
    if (this.#ws) {
      this.#ws.onclose = null;
      this.#ws.close();
      this.#ws = null;
    }
  }

  #abrir() {
    if (!this.#activo) return;
    this.#handlers.onStatus(this.#fallosSeguidos ? "reconectando" : "conectando", this.#url);
    let recibioDatos = false;
    const ws = new WebSocket(this.#url);
    this.#ws = ws;

    ws.onmessage = (ev) => {
      if (!recibioDatos) {
        recibioDatos = true;
        this.#fallosSeguidos = 0;
        this.#espera = CONFIG.WS_BACKOFF_MIN_MS;
        this.#handlers.onStatus("conectado", this.nombre);
      }
      try {
        this.#handlers.onData(JSON.parse(ev.data));
      } catch (err) {
        console.warn("Mensaje WS inválido:", err);
      }
    };

    // onerror siempre viene seguido de onclose: la reconexión se maneja ahí.
    ws.onclose = () => {
      if (!this.#activo) return;
      if (!recibioDatos) this.#fallosSeguidos++;
      // El timer se programa antes de avisar: si onStatus llama a stop(), lo cancela.
      const espera = this.#espera;
      this.#timerReconexion = setTimeout(() => this.#abrir(), espera);
      this.#espera = Math.min(espera * 2, CONFIG.WS_BACKOFF_MAX_MS);
      this.#handlers.onStatus("reconectando", `reintento en ${espera} ms`);
    };
  }
}

export class PollingSource {
  nombre = "Polling";
  #url;
  #intervalo;
  #activo = false;
  #timer = null;
  #conectado = false;

  constructor(baseUrl, intervaloMs = CONFIG.POLL_INTERVAL_MS) {
    this.#url = `${quitarBarraFinal(baseUrl)}/telemetria`;
    this.#intervalo = intervaloMs;
  }

  start(handlers) {
    this.#activo = true;
    this.#conectado = false;
    handlers.onStatus("conectando", this.#url);
    const tick = async () => {
      if (!this.#activo) return;
      const inicio = performance.now();
      try {
        const data = await fetchJson(this.#url);
        if (!this.#activo) return;
        if (!this.#conectado) {
          this.#conectado = true;
          handlers.onStatus("conectado", `${this.nombre} ${this.#intervalo} ms`);
        }
        handlers.onData(data);
      } catch (err) {
        if (!this.#activo) return;
        this.#conectado = false;
        handlers.onStatus("reconectando", err.message);
      }
      // Se programa al terminar el request: nunca se solapan dos fetch,
      // y el período total no supera el intervalo si el server responde rápido.
      const transcurrido = performance.now() - inicio;
      this.#timer = setTimeout(tick, Math.max(0, this.#intervalo - transcurrido));
    };
    tick();
  }

  stop() {
    this.#activo = false;
    clearTimeout(this.#timer);
  }
}
