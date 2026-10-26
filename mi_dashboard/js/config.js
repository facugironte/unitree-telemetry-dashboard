// Configuración central del dashboard.

const STORAGE_KEY = "tpo-robotica.api";

// URL del backend: ?api=http://10.0.0.5:8001 > último valor usado > mismo host en :8001.
export function apiUrlInicial() {
  const desdeQuery = new URLSearchParams(location.search).get("api");
  if (desdeQuery) return desdeQuery;
  try {
    const guardada = localStorage.getItem(STORAGE_KEY);
    if (guardada) return guardada;
  } catch { /* storage bloqueado: seguimos con el default */ }
  return `http://${location.hostname || "localhost"}:8001`;
}

export function recordarApiUrl(url) {
  try { localStorage.setItem(STORAGE_KEY, url); } catch { /* sin storage */ }
}

export const CONFIG = {
  // Semáforo de temperatura de motor, igual a electroSim.
  TEMP_AMARILLO: 40,   // °C desde donde pasa a amarillo
  TEMP_ROJO: 60,       // °C por encima del cual es rojo

  // Polling: la consigna pide como máximo 500 ms.
  POLL_INTERVAL_MS: 250,
  FETCH_TIMEOUT_MS: 2000,

  // WebSocket: reconexión con backoff exponencial.
  WS_BACKOFF_MIN_MS: 500,
  WS_BACKOFF_MAX_MS: 8000,
  // En modo "auto", fallos seguidos del WS antes de pasar a polling.
  WS_FALLOS_ANTES_DE_POLLING: 3,

  // Gráfico IMU: muestras visibles (la consigna pide al menos 60).
  IMU_HISTORIA: 120,

  // Rango de voltaje de celda Li-ion para dibujar las barras.
  CELDA_V_MIN: 3.0,
  CELDA_V_MAX: 4.2,
};
