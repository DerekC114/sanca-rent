# Sanca Rent — Alquiler de vehículos

Aplicación web funcional de renta de vehículos construida sobre la base de datos del proyecto
**Sistema de Gestión para el Alquiler de Vehículos** (Administración de Bases de Datos con SQL,
Politécnico Grancolombiano, 2026).

**Autores:** Derek Santiago Cristiano Herrera · Camilo Andrés Fuentes Alba

La aplicación ejecuta **PostgreSQL dentro del navegador** ([PGlite](https://github.com/electric-sql/pglite))
con los mismos scripts SQL del proyecto. No necesita servidor: funciona en GitHub Pages.

## Qué se puede hacer

### Sitio para clientes
- Buscar vehículos por fechas y categoría: solo se ofrecen los que están libres en ese periodo.
- Ver el precio total (tarifa diaria × días) y el depósito de la categoría.
- Reservar en línea. Si el documento ya existe, se reconoce al cliente; si no, se registra.
- **Mi reserva:** consultar reservas, alquileres y saldos con el número de documento, y cancelar reservas.

### Panel del personal (botón «Personal»)
Se entra con uno de los cinco usuarios creados en `05_consultas_evidencias.sql`. Cada operación se
ejecuta con `SET LOCAL ROLE`, así que **PostgreSQL aplica los permisos reales** de cada rol.

| Usuario | Puede |
|---|---|
| Administrador | Todo: flota, tarifas, reportes, consola SQL y restablecer datos |
| Operador de alquileres | Confirmar/cancelar reservas, entregar vehículos, registrar devoluciones, alquiler directo, clientes |
| Contabilidad | Registrar y anular pagos, ver saldos |
| Mantenimiento | Programar, iniciar y finalizar mantenimientos; cambiar el estado de la flota |
| Consulta | Solo lectura (sin datos de clientes ni pagos) |

## Reglas de negocio automatizadas (`09_reglas_automatizadas.sql`)
Script nuevo que lleva a la base de datos las reglas del documento que antes no se aplicaban
(y la mejora propuesta en las conclusiones):

- **Regla 6:** no se permiten reservas que se crucen en fechas para el mismo vehículo.
- **Regla 12:** no se reservan ni alquilan vehículos en mantenimiento o fuera de servicio.
- **Regla 13:** un vehículo no puede tener dos alquileres activos; un alquiler vencido sin devolver lo bloquea.
- **Regla 18:** al entregar un vehículo pasa a «Alquilado» y la reserva a «Cumplida».
- **Regla 19:** al iniciar un mantenimiento el vehículo pasa a «En mantenimiento».
- **Regla 20:** al terminar el alquiler o el mantenimiento vuelve a «Disponible» y se actualiza el kilometraje.
- Además: los clientes inactivos o bloqueados, o con la licencia vencida, no pueden reservar.

## Datos
La base se crea en el navegador con los scripts `01`, `02`, `04`, `05`, `06` y `09`, y se guarda en
IndexedDB: lo que registres se conserva al recargar, pero **solo en ese navegador**. El administrador
puede restablecer los datos originales en «Datos».

## Estructura
Todos los archivos están en la raíz del repositorio:
```
index.html                 Aplicación (una sola página)
app.css                    Estilos (modo claro y oscuro, adaptable a celular)
main.js                    Enrutador
db.js                      PostgreSQL en el navegador, roles y mensajes de error
public.js                  Inicio, catálogo, reserva y «Mi reserva»
admin.js                   Panel del personal
ui.js                      Utilidades e ilustraciones de los vehículos
index.js, chunk-*.js,
postgres.wasm, postgres.data, LICENSE   PGlite 0.2.17 (licencia Apache-2.0)
01_…sql a 09_…sql          Scripts SQL del proyecto
```

## Publicar en GitHub Pages
1. Sube el contenido de esta carpeta a la raíz del repositorio (debe verse `index.html` en la raíz).
2. **Settings → Pages → Deploy from a branch →** rama `main`, carpeta `/ (root)` → **Save**.
3. En 1 o 2 minutos el sitio queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

## Probar en tu computador
La aplicación necesita un servidor web local (no funciona abriendo el archivo con doble clic):

```bash
python -m http.server 8000
```

Luego abre http://localhost:8000

## Créditos de las fotos
Las fotos de los vehículos se cargan desde [Wikimedia Commons](https://commons.wikimedia.org) y pertenecen a sus
autores, bajo licencias libres (Creative Commons). Si una foto no carga, se muestra una ilustración.

| Vehículo | Archivo en Wikimedia Commons |
|---|---|
| Renault Sandero | [Renault Sandero R.S. 2020 - BugWarp 01.jpg](https://commons.wikimedia.org/wiki/File:Renault_Sandero_R.S._2020_-_BugWarp_01.jpg) |
| Chevrolet Onix | [Chevrolet Onix (second generation, front view).jpg](https://commons.wikimedia.org/wiki/File:Chevrolet_Onix_(second_generation,_front_view).jpg) |
| Toyota Corolla | [Toyota Corolla sedan E210 hydrid.jpg](https://commons.wikimedia.org/wiki/File:Toyota_Corolla_sedan_E210_hydrid.jpg) |
| Mazda 3 | [Mazda3 SEDAN 20S L Package 2WD (5BA-BPFP) left.jpg](https://commons.wikimedia.org/wiki/File:Mazda3_SEDAN_20S_L_Package_2WD_(5BA-BPFP)_left.jpg) |
| Kia Sportage | [Kia Sportage (NQ5) 1X7A0326 (edited).jpg](https://commons.wikimedia.org/wiki/File:Kia_Sportage_(NQ5)_1X7A0326_(edited).jpg) |
| Renault Duster | [Renault Duster Mexico.jpg](https://commons.wikimedia.org/wiki/File:Renault_Duster_Mexico.jpg) |
| Toyota Hilux | [2021 Toyota Hilux Revo Prerunner Double-Cab 2.4 Mid.jpg](https://commons.wikimedia.org/wiki/File:2021_Toyota_Hilux_Revo_Prerunner_Double-Cab_2.4_Mid.jpg) |
| Ford Ranger | [2023 Ford Ranger XLS.jpg](https://commons.wikimedia.org/wiki/File:2023_Ford_Ranger_XLS.jpg) |
| Kia Picanto | [Kia Picanto X-Line facelift 001.jpg](https://commons.wikimedia.org/wiki/File:Kia_Picanto_X-Line_facelift_001.jpg) |
| Nissan Versa | [2023 Nissan Versa (N18) IMG 3105.jpg](https://commons.wikimedia.org/wiki/File:2023_Nissan_Versa_(N18)_IMG_3105.jpg) |
| Hyundai Tucson | [Hyundai Tucson (NX4, SWB) IMG 9135.jpg](https://commons.wikimedia.org/wiki/File:Hyundai_Tucson_(NX4,_SWB)_IMG_9135.jpg) |
