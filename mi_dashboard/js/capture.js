// Captura de muestras y exportación a CSV (réplica de la captura de electroSim).

export class CaptureStore {
  #muestras = [];

  get cantidad() {
    return this.#muestras.length;
  }

  agregar(telemetria) {
    if (telemetria) this.#muestras.push(structuredClone(telemetria));
  }

  limpiar() {
    this.#muestras = [];
  }

  toCSV() {
    if (this.#muestras.length === 0) return "";
    const columnas = this.#columnas();
    const filas = this.#muestras.map((m) => columnas.map(([, get]) => celda(get(m))).join(","));
    return [columnas.map(([nombre]) => nombre).join(","), ...filas].join("\r\n");
  }

  descargar(nombreArchivo = nombreConFecha()) {
    // BOM para que Excel detecte UTF-8 (acentos, °).
    const blob = new Blob(["﻿" + this.toCSV()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: nombreArchivo });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Columnas tomadas de la primera muestra; si alguna muestra tiene más celdas o
  // motores se usa el máximo, y lo que falta queda vacío.
  #columnas() {
    const maxCeldas = Math.max(...this.#muestras.map((m) => m.bms.celdas.length));
    const base = this.#muestras.reduce((a, m) => (m.motores.length > a.motores.length ? m : a));
    const patas = [...new Set(this.#muestras.flatMap((m) => Object.keys(m.fuerzas)))];

    const cols = [
      ["fecha_hora", (m) => new Date(m.recibido).toISOString()],
      ["ts_robot_s", (m) => m.ts],
      ["modelo", (m) => m.modelo],
      ...["roll", "pitch", "yaw", "ax", "ay", "az"].map((k) => [`imu_${k}`, (m) => m.imu[k]]),
      ["bms_soc_pct", (m) => m.bms.soc],
      ["bms_corriente_mA", (m) => m.bms.corriente],
      ["bms_temp_C", (m) => m.bms.temperatura],
    ];
    for (let i = 0; i < maxCeldas; i++) {
      cols.push([`celda_${i + 1}_V`, (m) => m.bms.celdas[i]]);
    }
    for (const p of patas) {
      cols.push([`pata_${p}`, (m) => (p in m.fuerzas ? Number(m.fuerzas[p]) : "")]);
    }
    base.motores.forEach((motor, i) => {
      const n = motor.nombre;
      cols.push(
        [`${n}_temp_C`, (m) => m.motores[i]?.temperatura],
        [`${n}_angulo_deg`, (m) => m.motores[i]?.angulo],
        [`${n}_vel_rad_s`, (m) => m.motores[i]?.velocidad],
        [`${n}_torque_Nm`, (m) => m.motores[i]?.torque],
      );
    });
    return cols;
  }
}

function celda(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function nombreConFecha() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `telemetria_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.csv`;
}
