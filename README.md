# TPO Robótica — Dashboard Web de Telemetría

Versión web del monitor de motores Unitree (electroSim). El backend FastAPI lo provee
la cátedra ([UadeRobotLab / TP05](https://github.com/tsamaan/UadeRobotLab/tree/main/05LaboratoriosTPs/TP05_Desarrollo_de_Aplicaciones_II));
este repo agrega el frontend en `mi_dashboard/`.

Documentación en [`docs/`](docs/): documento para la defensa
([md](docs/defensa-tpo.md) / [pdf](docs/defensa-tpo.pdf)) y diagrama de arquitectura.

![Arquitectura](docs/arquitectura.png)

## Cómo correrlo

Requisitos: Python 3.10+ y un navegador moderno. El backend **no** está en este repo:
se usa el de la cátedra.

```bash
# 1. Una sola vez: bajar el backend de la cátedra e instalar dependencias
git clone https://github.com/tsamaan/UadeRobotLab
py -3 -m pip install fastapi "uvicorn[standard]"

# 2. Backend en modo demo (datos inventados, sin simulador ni robot) → puerto 8001
py -3 UadeRobotLab/05LaboratoriosTPs/TP05_Desarrollo_de_Aplicaciones_II/entorno/arrancar_api.py --robot go2 --demo
#    (o --robot g1 para el humanoide de 29 motores)

# 3. En otra terminal, desde este repo, servir el dashboard
py -3 -m http.server 5500 -d mi_dashboard
```

Abrir <http://localhost:5500>. El dashboard se conecta solo a `http://localhost:8001`.
Para apuntar a otra máquina (simulador de un compañero o el robot real en el laboratorio),
cambiar la URL en el campo **API** o abrir `http://localhost:5500/?api=http://10.0.0.5:8001`.

### ¿Qué es el "modo demo"?
Es el mismo backend de la cátedra arrancado con `--demo`: en vez de leer del simulador
MuJoCo usa `DemoReader` (`entorno/api/telemetry_reader_dds.py` del repo de la cátedra), que genera datos con
funciones seno. Diferencias con el simulador:

| | `--demo` | simulador (`INICIAR_TP05`) |
|---|---|---|
| Batería: corriente / temp. / celdas | sí, 8 celdas | 0 / 0 / sin celdas |
| Temperatura de motores | 34–43 °C | sube al caminar |

## Funcionalidad

| Requisito | Dónde |
|---|---|
| Panel motores con semáforo (<40 verde, 40–60 amarillo, >60 rojo) | `js/panels/motors.js` |
| Panel IMU: roll/pitch/yaw + gráfico histórico (120 muestras) | `js/panels/imu.js` |
| Panel BMS: carga, corriente, temperatura, voltaje por celda | `js/panels/bms.js` |
| Panel de contacto por pata FR/FL/RR/RL | `js/panels/feet.js` |
| WebSocket con reconexión + polling a `/telemetria` cada 250 ms | `js/api.js` |
| Capturar muestra, Grabar continuo, Exportar CSV | `js/capture.js` |

El selector **Transporte** permite elegir: *Auto* (WebSocket y, si falla 3 veces, polling),
*WebSocket* o *Polling*.

## Arquitectura y patrones

```
 backend FastAPI ──WS / HTTP──▶ api.js ──▶ adapter.js ──▶ TelemetryBus ──▶ paneles
                                (fuentes)   (Adapter)      (Observer)      CaptureStore
                       └──────────────── dashboard.js (Facade) ────────────────┘
```

- **Adapter** (`adapter.js`, y las fuentes en `api.js`): traduce el JSON del servidor al modelo
  interno y unifica WebSocket y polling detrás de la misma interfaz `start/stop`.
  Si cambia la fuente de datos (demo, simulador o robot real), los paneles no cambian.
- **Observer** (`telemetryBus.js`): cada panel y la grabación se suscriben al bus; la fuente publica.
- **Facade** (`dashboard.js`): `conectar()`, `capturar()`, `exportarCSV()`… La UI (`main.js`)
  no conoce ni el transporte ni los paneles por dentro.

## CSV

Una fila por muestra: fecha/hora, `ts` del robot, IMU, BMS, una columna por celda y por pata,
y temperatura/ángulo/velocidad/torque de cada motor. Separador coma, decimales con punto y
UTF-8 con BOM. Si Excel en español lo abre todo en una sola columna, usar
*Datos → Desde texto/CSV* y elegir el delimitador coma.
