// Panel IMU: roll / pitch / yaw numéricos + gráfico de línea histórico (Chart.js).

import { CONFIG } from "../config.js";

const SERIES = [
  { clave: "roll",  label: "Roll",  color: "#2563eb" },
  { clave: "pitch", label: "Pitch", color: "#ea580c" },
  { clave: "yaw",   label: "Yaw",   color: "#16a34a" },
];

export class ImuPanel {
  #valores;
  #chart;

  constructor({ roll, pitch, yaw }, canvas) {
    this.#valores = { roll, pitch, yaw };
    const css = getComputedStyle(document.documentElement);
    const muted = css.getPropertyValue("--muted").trim();
    const grid = css.getPropertyValue("--border").trim();

    this.#chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: [],
        datasets: SERIES.map((s) => ({
          label: s.label,
          data: [],
          borderColor: s.color,
          backgroundColor: s.color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          // El yaw recorre ±180°, roll/pitch unos pocos grados: eje propio.
          yAxisID: s.clave === "yaw" ? "yYaw" : "y",
        })),
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { labels: { color: muted, boxWidth: 12 } } },
        scales: {
          x: {
            ticks: { color: muted, maxTicksLimit: 6, callback(v) { return `${this.getLabelForValue(v)} s`; } },
            grid: { color: grid },
          },
          y: {
            position: "left",
            title: { display: true, text: "roll / pitch (°)", color: muted },
            ticks: { color: muted },
            grid: { color: grid },
          },
          yYaw: {
            position: "right",
            title: { display: true, text: "yaw (°)", color: muted },
            ticks: { color: muted },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  init() {
    this.#chart.data.labels = [];
    this.#chart.data.datasets.forEach((d) => (d.data = []));
    this.#chart.update("none");
  }

  update(t) {
    for (const s of SERIES) {
      this.#valores[s.clave].textContent = t.imu[s.clave].toFixed(2);
    }

    const { labels, datasets } = this.#chart.data;
    labels.push(t.ts.toFixed(1));
    SERIES.forEach((s, i) => datasets[i].data.push(t.imu[s.clave]));

    // Buffer circular: se descarta lo más viejo.
    while (labels.length > CONFIG.IMU_HISTORIA) {
      labels.shift();
      datasets.forEach((d) => d.data.shift());
    }
    this.#chart.update("none");
  }
}
