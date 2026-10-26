// Patrón Adapter: convierte el JSON del backend al modelo que usan los paneles.
// Si mañana cambia el formato del servidor (u otro robot manda otros campos),
// sólo se toca este archivo.

const num = (v, def = 0) => (Number.isFinite(Number(v)) ? Number(v) : def);

export function adaptarTelemetria(raw) {
  const r = raw ?? {};
  const imu = r.imu ?? {};
  const bms = r.bms ?? {};

  return {
    modelo: r.modelo ?? "?",
    ts: num(r.ts),
    recibido: Date.now(),
    motores: (r.motores ?? []).map((m, i) => ({
      id: num(m.id, i),
      nombre: m.nombre ?? `motor_${i}`,
      angulo: num(m.angulo),
      velocidad: num(m.velocidad),
      torque: num(m.torque),
      temperatura: num(m.temperatura),
    })),
    imu: {
      roll: num(imu.roll), pitch: num(imu.pitch), yaw: num(imu.yaw),
      ax: num(imu.ax), ay: num(imu.ay), az: num(imu.az),
    },
    bms: {
      soc: num(bms.soc),
      corriente: num(bms.corriente),
      temperatura: num(bms.temperatura),
      // En modo simulador llegan vacías; en demo y en el robot, en volts.
      celdas: Array.isArray(bms.celdas) ? bms.celdas.map((v) => num(v)) : [],
    },
    // { FR: 1, FL: 0, ... } → booleanos. El G1 manda otras claves (o ninguna).
    fuerzas: Object.fromEntries(
      Object.entries(r.fuerzas ?? {}).map(([pata, v]) => [pata, num(v) > 0])
    ),
  };
}

export function adaptarInfo(raw) {
  const r = raw ?? {};
  return {
    modelo: r.modelo ?? "?",
    nombre: r.nombre ?? r.modelo ?? "Robot",
    tipo: r.tipo ?? "",
    nMotores: num(r.n_motores),
    motoresNombres: r.motores_nombres ?? [],
    patas: r.patas ?? [],
    frecuenciaHz: num(r.frecuencia_hz, 10),
    modo: r.modo ?? "desconocido",
  };
}
