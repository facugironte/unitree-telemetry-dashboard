// Panel de motores: tabla con semáforo de temperatura.
// Las filas se crean una vez (según /info) y en cada tick sólo se actualiza el texto.

import { CONFIG } from "../config.js";

export function claseTemperatura(t) {
  if (t > CONFIG.TEMP_ROJO) return "temp--hot";
  if (t >= CONFIG.TEMP_AMARILLO) return "temp--warn";
  return "temp--ok";
}

export class MotorsPanel {
  #tbody;
  #contador;
  #filas = [];

  constructor(tbody, contador) {
    this.#tbody = tbody;
    this.#contador = contador;
  }

  init(info) {
    this.#construir(info.motoresNombres);
  }

  update(t) {
    // Si llegan más/menos motores que los esperados (otro robot), se reconstruye.
    if (t.motores.length !== this.#filas.length) {
      this.#construir(t.motores.map((m) => m.nombre));
    }
    t.motores.forEach((m, i) => {
      const f = this.#filas[i];
      f.temp.className = `temp ${claseTemperatura(m.temperatura)}`;
      f.tempValor.textContent = m.temperatura.toFixed(1);
      f.angulo.textContent = m.angulo.toFixed(2);
      f.velocidad.textContent = m.velocidad.toFixed(3);
      f.torque.textContent = m.torque.toFixed(2);
    });
  }

  #construir(nombres) {
    this.#tbody.replaceChildren();
    this.#filas = nombres.map((nombre, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="muted">${i}</td>
        <td></td>
        <td class="temp"><i class="dot"></i><span>—</span></td>
        <td>—</td><td>—</td><td>—</td>`;
      this.#tbody.append(tr);
      const celdas = tr.children;
      celdas[1].textContent = nombre;
      return {
        temp: celdas[2],
        tempValor: celdas[2].querySelector("span"),
        angulo: celdas[3],
        velocidad: celdas[4],
        torque: celdas[5],
      };
    });
    this.#contador.textContent = `(${nombres.length})`;
  }
}
