// Panel de fuerzas por pata: contacto de cada pata visto desde arriba.
// Go2: FL FR adelante, RL RR atrás. Otros robots: las patas que reporte, en fila.

const NOMBRES = {
  FR: "delantera der.", FL: "delantera izq.",
  RR: "trasera der.",   RL: "trasera izq.",
  R_foot: "pie der.",   L_foot: "pie izq.",
};
const ORDEN_GO2 = ["FL", "FR", "RL", "RR"];

export class FeetPanel {
  #cont;
  #patas = new Map();
  #claves = "";

  constructor(cont) {
    this.#cont = cont;
  }

  init(info) {
    this.#construir(info.patas);
  }

  update({ fuerzas }) {
    const claves = Object.keys(fuerzas);
    if (claves.slice().sort().join() !== this.#claves) this.#construir(claves);
    for (const [pata, apoyada] of Object.entries(fuerzas)) {
      this.#patas.get(pata)?.classList.toggle("on", apoyada);
    }
  }

  #construir(patas) {
    this.#claves = patas.slice().sort().join();
    this.#patas.clear();
    this.#cont.replaceChildren();

    if (patas.length === 0) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Este robot no reporta contacto de patas.";
      this.#cont.append(p);
      return;
    }

    const esCuadrupedo = ORDEN_GO2.every((p) => patas.includes(p));
    const orden = esCuadrupedo ? ORDEN_GO2 : patas;
    orden.forEach((pata, i) => {
      if (esCuadrupedo && i === 2) {
        const cuerpo = document.createElement("div");
        cuerpo.className = "body";
        cuerpo.textContent = "▲ frente · cuerpo";
        this.#cont.append(cuerpo);
      }
      const div = document.createElement("div");
      div.className = "foot";
      div.innerHTML = `<b>${pata}</b><small>${NOMBRES[pata] ?? ""}</small>`;
      this.#cont.append(div);
      this.#patas.set(pata, div);
    });
  }
}
