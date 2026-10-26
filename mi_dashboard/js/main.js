// Punto de entrada: arma los paneles, crea la Facade y conecta los botones.

import { apiUrlInicial, recordarApiUrl } from "./config.js";
import { Dashboard } from "./dashboard.js";
import { MotorsPanel } from "./panels/motors.js";
import { ImuPanel } from "./panels/imu.js";
import { BmsPanel } from "./panels/bms.js";
import { FeetPanel } from "./panels/feet.js";

const $ = (id) => document.getElementById(id);

const panels = [
  new MotorsPanel($("motors-body"), $("motor-count")),
  new ImuPanel({ roll: $("imu-roll"), pitch: $("imu-pitch"), yaw: $("imu-yaw") }, $("imu-chart")),
  new BmsPanel({
    socFill: $("bms-soc-fill"), soc: $("bms-soc"),
    current: $("bms-current"), temp: $("bms-temp"), cells: $("bms-cells"),
  }),
  new FeetPanel($("feet")),
];

const ESTADOS = {
  conectando:   ["status--wait", "conectando…"],
  reconectando: ["status--wait", "reconectando…"],
  conectado:    ["status--on",   "conectado"],
  desconectado: ["status--off",  "desconectado"],
};

const dashboard = new Dashboard(panels, {
  onStatus(estado, detalle) {
    const [clase, texto] = ESTADOS[estado] ?? ESTADOS.desconectado;
    const el = $("conn-status");
    el.className = `status ${clase}`;
    el.title = detalle || "";
    // Conectado: se muestra el transporte en uso ("WebSocket" / "Polling 250 ms").
    el.querySelector("span").textContent = estado === "conectado" && detalle ? detalle : texto;
  },
  onInfo(info) {
    $("robot-name").textContent = info.nombre;
    const modo = $("server-mode");
    modo.textContent = info.modo;
    modo.className = `tag ${info.modo === "demo" ? "tag--demo" : "tag--live"}`;
  },
  onCaptura(n) {
    $("capture-count").textContent = n;
    $("btn-export").disabled = n === 0;
    $("btn-clear").disabled = n === 0;
  },
});

// Frecuencia real de actualización (mensajes por segundo).
let recibidos = 0;
dashboard.bus.subscribe(() => recibidos++);
setInterval(() => {
  $("rate").textContent = `${recibidos} Hz`;
  recibidos = 0;
}, 1000);

// ---------- Controles ----------
$("api-url").value = apiUrlInicial();

$("conn-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const url = $("api-url").value.trim();
  recordarApiUrl(url);
  dashboard.conectar(url, $("transport").value);
});

$("transport").addEventListener("change", () => $("conn-form").requestSubmit());

$("btn-capture").addEventListener("click", () => dashboard.capturar());
$("btn-record").addEventListener("click", (e) => {
  const grabando = dashboard.alternarGrabacion();
  e.currentTarget.setAttribute("aria-pressed", String(grabando));
  e.currentTarget.textContent = grabando ? "■ Detener" : "● Grabar";
});
$("btn-export").addEventListener("click", () => dashboard.exportarCSV());
$("btn-clear").addEventListener("click", () => dashboard.limpiarCapturas());

dashboard.conectar($("api-url").value, $("transport").value);
