// Panel BMS: carga (%), corriente (mA), temperatura y voltaje por celda.

import { CONFIG } from "../config.js";

export class BmsPanel {
  #el;
  #celdas = [];

  constructor(el) {
    this.#el = el;   // { socFill, soc, current, temp, cells }
  }

  init() {
    this.#construirCeldas(0);
  }

  update({ bms }) {
    const soc = Math.max(0, Math.min(100, bms.soc));
    this.#el.soc.textContent = `${soc} %`;
    this.#el.socFill.style.width = `${soc}%`;
    this.#el.socFill.classList.toggle("low", soc <= 30 && soc > 15);
    this.#el.socFill.classList.toggle("crit", soc <= 15);

    this.#el.current.textContent = bms.corriente.toLocaleString("es-AR");
    this.#el.temp.textContent = bms.temperatura.toFixed(1);

    if (bms.celdas.length !== this.#celdas.length) {
      this.#construirCeldas(bms.celdas.length);
    }
    const rango = CONFIG.CELDA_V_MAX - CONFIG.CELDA_V_MIN;
    bms.celdas.forEach((v, i) => {
      const pct = Math.max(0, Math.min(1, (v - CONFIG.CELDA_V_MIN) / rango)) * 100;
      this.#celdas[i].fill.style.height = `${pct}%`;
      this.#celdas[i].valor.textContent = v.toFixed(3);
    });
  }

  #construirCeldas(n) {
    const cont = this.#el.cells;
    cont.replaceChildren();
    if (n === 0) {
      // Pasa en modo simulador: el backend manda "celdas": [].
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "El servidor no reporta voltajes de celda.";
      cont.append(p);
    }
    this.#celdas = Array.from({ length: n }, (_, i) => {
      const div = document.createElement("div");
      div.className = "cell";
      div.innerHTML = `
        <span class="mono cell__v">—</span>
        <div class="cell__bar"><div class="cell__fill"></div></div>
        <span class="muted">C${i + 1}</span>`;
      cont.append(div);
      return { fill: div.querySelector(".cell__fill"), valor: div.querySelector(".cell__v") };
    });
  }
}
