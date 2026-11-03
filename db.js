// Base de datos de Sanca Rent: PostgreSQL (PGlite) ejecutándose en el navegador.
// Los datos se guardan en IndexedDB, así que persisten entre visitas en el mismo navegador.
const PGLITE_URLS = [
  new URL('./index.js', import.meta.url).href,
  'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.2.17/dist/index.js',
];
const DB_NAME = 'idb://sanca-rent-v1';
const SEED = [
  '01_creacion_tablas.sql',
  '02_inserciones.sql',
  '04_ajustes_datos_fase2.sql',
  '05_consultas_evidencias.sql',
  '06_afinamiento_base_datos.sql',
  '09_reglas_automatizadas.sql',
];

export const ROLES = {
  usuario_admin_bd: { nombre: 'Administrador', rol: 'rol_administrador_bd', desc: 'Control total: flota, usuarios, reportes y datos.' },
  usuario_operador: { nombre: 'Operador de alquileres', rol: 'rol_operador_alquiler', desc: 'Clientes, reservas, entregas y devoluciones.' },
  usuario_contabilidad: { nombre: 'Contabilidad', rol: 'rol_contabilidad', desc: 'Pagos, saldos e ingresos.' },
  usuario_mantenimiento: { nombre: 'Mantenimiento', rol: 'rol_mantenimiento', desc: 'Mantenimientos y estado técnico de la flota.' },
  usuario_consulta: { nombre: 'Consulta', rol: 'rol_consulta', desc: 'Solo lectura de flota, reservas y alquileres.' },
};
// El sitio público opera con los permisos del operador (registra clientes y reservas).
export const PUBLIC_ROLE = 'usuario_operador';

let db = null, ready = null, chain = Promise.resolve();
const listeners = new Set();
export const onProgress = fn => listeners.add(fn);
const progress = msg => listeners.forEach(fn => fn(msg));

async function loadPGlite() {
  let last;
  for (const u of PGLITE_URLS) { try { return (await import(u)).PGlite; } catch (e) { last = e; } }
  throw last;
}

async function seed(fresh) {
  if (fresh) {
    await db.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  }
  for (const f of SEED) {
    progress(`Ejecutando ${f}…`);
    const r = await fetch(f);
    if (!r.ok) throw new Error(`No se pudo leer ${f} (${r.status})`);
    await db.exec(await r.text());
  }
}

export function init() {
  if (ready) return ready;
  ready = (async () => {
    progress('Cargando PostgreSQL…');
    const PGlite = await loadPGlite();
    try { db = new PGlite(DB_NAME); await db.waitReady; }
    catch (e) { console.warn('IndexedDB no disponible; se usa memoria', e); db = new PGlite(); await db.waitReady; }
    try { await db.exec(`SET TIME ZONE 'America/Bogota'`); } catch { /* zona horaria no disponible */ }
    const r = await db.query(`SELECT to_regclass('public.cliente') IS NOT NULL AS t,
      to_regprocedure('public.fn_vehiculo_disponible(integer,timestamp without time zone,timestamp without time zone,integer)') IS NOT NULL AS f`);
    if (!r.rows[0].t || !r.rows[0].f) {
      progress('Preparando la base de datos por primera vez…');
      await seed(r.rows[0].t);
    }
    // Tras recargar, PostgreSQL puede adelantar las secuencias (las precarga de 32 en 32).
    // Se ajustan al último id usado para que los códigos sean consecutivos.
    await db.exec(`DO $$ DECLARE t text; c text; BEGIN
      FOREACH t IN ARRAY ARRAY['cliente','categoria_vehiculo','vehiculo','reserva','alquiler','pago','mantenimiento'] LOOP
        c := 'id_' || CASE t WHEN 'categoria_vehiculo' THEN 'categoria' ELSE t END;
        EXECUTE format('SELECT setval(pg_get_serial_sequence(%L,%L), COALESCE((SELECT MAX(%I) FROM %I),0)+1, false)', t, c, c, t);
      END LOOP; END $$;`);
    progress('');
    return db;
  })().catch(err => { ready = null; throw err; });
  return ready;
}

/** Ejecuta una función dentro de una transacción con los permisos del usuario indicado. */
export function as(role, fn) {
  const run = async () => {
    await init();
    return db.transaction(async tx => {
      await tx.exec(`SET LOCAL ROLE ${role}`);
      const q = async (sql, params = []) => (await tx.query(sql, params)).rows;
      const one = async (sql, params = []) => (await q(sql, params))[0];
      return fn({ q, one, tx });
    });
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

/** Consulta simple con un rol. */
export const query = (role, sql, params) => as(role, ({ q }) => q(sql, params));

/** Ejecuta SQL libre como un rol (consola). Devuelve la última respuesta con filas. */
export function execAs(role, sql) {
  const run = async () => {
    await init();
    return db.transaction(async tx => {
      await tx.exec(`SET LOCAL ROLE ${role}`);
      const out = await tx.exec(sql);
      return [...out].reverse().find(r => r.fields && r.fields.length) || out[out.length - 1];
    });
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

export async function resetData() {
  await init();
  const p = chain.then(() => seed(true));
  chain = p.catch(() => {});
  return p;
}

/** Traduce errores de PostgreSQL a mensajes claros. */
const CONSTRAINTS = {
  uq_cliente_documento: 'Ya existe un cliente con ese número de documento.',
  uq_cliente_correo: 'Ya existe un cliente con ese correo electrónico.',
  uq_cliente_licencia: 'Ya existe un cliente con ese número de licencia.',
  uq_vehiculo_placa: 'Ya existe un vehículo con esa placa.',
  uq_vehiculo_chasis: 'Ya existe un vehículo con ese número de chasis.',
  uq_pago_referencia: 'Ya existe un pago con esa referencia.',
  uq_alquiler_reserva: 'Esa reserva ya generó un alquiler.',
  ck_pago_valor: 'El valor del pago debe ser mayor que cero.',
  ck_reserva_fechas: 'La fecha de devolución debe ser posterior a la de recogida.',
  ck_alquiler_fechas_programadas: 'La devolución programada debe ser posterior a la entrega.',
  ck_alquiler_fecha_real: 'La devolución no puede ser anterior a la entrega.',
  ck_alquiler_kilometraje_entrada: 'El kilometraje de entrada no puede ser menor que el de salida.',
  ck_alquiler_combustible_entrada: 'El combustible debe estar entre 0 y 100 %.',
  ck_alquiler_combustible_salida: 'El combustible debe estar entre 0 y 100 %.',
  ck_mantenimiento_fechas: 'La fecha de fin no puede ser anterior a la de inicio.',
  ck_vehiculo_anio: 'El año debe estar entre 1980 y 2100.',
  ck_vehiculo_kilometraje: 'El kilometraje no puede ser negativo.',
  fk_reserva_cliente: 'El cliente no existe.',
  fk_alquiler_vehiculo: 'El vehículo no existe.',
};
export function errorMessage(err, roleName) {
  const m = String(err && err.message || err);
  if (/permission denied/i.test(m)) {
    const t = (m.match(/table (\w+)/) || [])[1];
    return `Tu usuario${roleName ? ` (${roleName})` : ''} no tiene permiso para esta operación${t ? ` sobre «${t}»` : ''}.`;
  }
  const c = err && err.constraint || (m.match(/constraint "([a-z_]+)"/) || [])[1];
  if (c && CONSTRAINTS[c]) return CONSTRAINTS[c];
  if (/violates not-null/i.test(m)) return 'Falta un dato obligatorio.';
  return m;
}
