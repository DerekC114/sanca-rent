// Panel interno de Sanca Rent. Cada operación se ejecuta con SET LOCAL ROLE del usuario elegido,
// así que PostgreSQL aplica los permisos definidos en 05_consultas_evidencias.sql.
import { ROLES, as, query, execAs, resetData, errorMessage } from './db.js?v=7';
import { $, $$, esc, money, num, fdate, parseLocal, toInput, toSql, nowWall, addDays, rentalDays, badge, code, toast, modal, confirmDialog, field, options, table, clientRules, docHint } from './ui.js?v=7';

const KEY = 'sanca-usuario';
export const currentUser = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
const setUser = u => { try { u ? sessionStorage.setItem(KEY, u) : sessionStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } };

const A = 'usuario_admin_bd', O = 'usuario_operador', C = 'usuario_contabilidad', M = 'usuario_mantenimiento', Q = 'usuario_consulta';
const TABS = {
  panel: { label: 'Panel', see: [A, O, C, M, Q] },
  reservas: { label: 'Reservas', see: [A, O, Q], write: [A, O] },
  alquileres: { label: 'Alquileres', see: [A, O, C, Q], write: [A, O] },
  pagos: { label: 'Pagos', see: [A, O, C], write: [A, C] },
  clientes: { label: 'Clientes', see: [A, O, C], write: [A, O] },
  flota: { label: 'Flota', see: [A, O, M, Q], write: [A, M] }, // Contabilidad no tiene SELECT sobre categoria_vehiculo
  mantenimiento: { label: 'Mantenimiento', see: [A, O, M, Q], write: [A, M] },
  reportes: { label: 'Reportes', see: [A] },
  sql: { label: 'Consola SQL', see: [A, O, C, M, Q] },
  datos: { label: 'Datos', see: [A] },
};
const seesClients = u => [A, O, C].includes(u);
const seesPayments = u => [A, O, C].includes(u);
const go = h => { location.hash = h; };

/* ---------- Ingreso ---------- */
export function login(view) {
  view.innerHTML = `<section class="section"><div class="wrap narrow-lg">
    <h1>Acceso del personal</h1>
    <p class="sub">Elige el usuario con el que quieres trabajar. Son los usuarios creados en <code>05_consultas_evidencias.sql</code>: cada uno solo ve y modifica lo que su rol permite en PostgreSQL.</p>
    <div class="user-grid">${Object.entries(ROLES).map(([u, r]) => `
      <button class="user-card" data-user="${u}">
        <span class="avatar">${r.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
        <b>${esc(r.nombre)}</b><code>${u}</code><span>${esc(r.desc)}</span>
      </button>`).join('')}</div>
    <p class="fine">Demostración académica: el acceso no pide contraseña. Los permisos sí son reales y los aplica PostgreSQL.</p>
  </div></section>`;
  $$('[data-user]', view).forEach(b => b.addEventListener('click', () => { setUser(b.dataset.user); go('#/admin/panel'); }));
}

/* ---------- Estructura del panel ---------- */
export async function admin(view, tab, params) {
  const u = currentUser();
  if (!u || !ROLES[u]) return login(view);
  const tabs = Object.entries(TABS).filter(([, t]) => t.see.includes(u));
  if (!TABS[tab] || !TABS[tab].see.includes(u)) tab = 'panel';
  view.innerHTML = `<div class="admin">
    <aside class="side">
      <div class="who"><span class="avatar">${ROLES[u].nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}</span><div><b>${esc(ROLES[u].nombre)}</b><code>${u}</code></div></div>
      <nav>${tabs.map(([k, t]) => `<a href="#/admin/${k}" class="${k === tab ? 'on' : ''}">${t.label}</a>`).join('')}</nav>
      <button class="btn btn-ghost sm" id="logout">Cambiar de usuario</button>
    </aside>
    <section class="admin-main" id="pane"><p class="empty">Cargando…</p></section>
  </div>`;
  $('#logout', view).addEventListener('click', () => {
    setUser(null);
    if (location.hash === '#/admin') window.dispatchEvent(new HashChangeEvent('hashchange'));
    else go('#/admin');
  });
  const pane = $('#pane', view);
  const ctx = { u, can: (TABS[tab].write || []).includes(u), pane, params, reload: () => admin(view, tab, params) };
  try { await PANES[tab](ctx); }
  catch (ex) { pane.innerHTML = `<div class="notice bad">${esc(errorMessage(ex, ROLES[u].nombre))}</div>`; }
}

const head = (title, sub = '', actions = '') => `<div class="pane-head"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="row-actions">${actions}</div></div>`;
const filters = (name, list, sel) => `<div class="filters" role="group" aria-label="Filtro">${list.map(([v, t]) => `<a class="pill${v === sel ? ' on' : ''}" href="${name}${v ? `?f=${encodeURIComponent(v)}` : ''}">${t}</a>`).join('')}</div>`;
const act = (label, attrs, cls = '') => `<button class="btn sm ${cls}" ${attrs}>${label}</button>`;
function wire(pane, sel, fn) { $$(sel, pane).forEach(b => b.addEventListener('click', () => fn(b.dataset, b))); }
async function run(ctx, fn, ok) {
  try { await as(ctx.u, fn); if (ok) toast(ok); ctx.reload(); return true; }
  catch (ex) { throw new Error(errorMessage(ex, ROLES[ctx.u].nombre)); }
}
const runToast = (ctx, fn, ok) => run(ctx, fn, ok).catch(e => toast(e.message, 'bad'));
const isLate = a => a.estado_alquiler === 'Atrasado' || (a.estado_alquiler === 'Activo' && new Date(a.fecha_devolucion_programada) < nowWall());

/* ---------- Panes ---------- */
const PANES = {};

PANES.panel = async ({ u, pane }) => {
  const tryQ = async (sql) => { try { return await query(u, sql); } catch { return null; } };
  const [flota, alq, res, din, man, late, next] = await Promise.all([
    tryQ(`SELECT estado_vehiculo, COUNT(*)::int n FROM vehiculo GROUP BY 1`),
    tryQ(`SELECT COUNT(*) FILTER (WHERE estado_alquiler IN ('Activo','Atrasado'))::int activos,
            COUNT(*) FILTER (WHERE estado_alquiler IN ('Activo','Atrasado') AND fecha_devolucion_programada < LOCALTIMESTAMP)::int atrasados FROM alquiler`),
    tryQ(`SELECT COUNT(*) FILTER (WHERE estado_reserva = 'Pendiente')::int pendientes,
            COUNT(*) FILTER (WHERE estado_reserva IN ('Pendiente','Confirmada') AND fecha_inicio > LOCALTIMESTAMP)::int proximas FROM reserva`),
    tryQ(`SELECT COALESCE(SUM(p.valor_pago) FILTER (WHERE p.estado_pago='Aprobado'),0) ingresos,
            (SELECT COALESCE(SUM(a.valor_total),0) FROM alquiler a WHERE a.estado_alquiler <> 'Cancelado') -
            COALESCE(SUM(p.valor_pago) FILTER (WHERE p.estado_pago='Aprobado'),0) saldo FROM pago p`),
    tryQ(`SELECT COUNT(*) FILTER (WHERE estado_mantenimiento='En proceso')::int en_proceso,
            COUNT(*) FILTER (WHERE estado_mantenimiento='Programado')::int programados FROM mantenimiento`),
    tryQ(`SELECT a.id_alquiler, a.fecha_devolucion_programada, v.placa, v.marca, v.modelo FROM alquiler a JOIN vehiculo v USING (id_vehiculo)
          WHERE a.estado_alquiler IN ('Activo','Atrasado') AND a.fecha_devolucion_programada < LOCALTIMESTAMP ORDER BY 2`),
    tryQ(`SELECT r.id_reserva, r.fecha_inicio, r.estado_reserva, v.placa, v.marca, v.modelo FROM reserva r JOIN vehiculo v USING (id_vehiculo)
          WHERE r.estado_reserva IN ('Pendiente','Confirmada') AND r.fecha_inicio > LOCALTIMESTAMP ORDER BY 2 LIMIT 6`),
  ]);
  const fl = Object.fromEntries((flota || []).map(r => [r.estado_vehiculo, r.n]));
  const total = Object.values(fl).reduce((a, b) => a + b, 0);
  const tile = (label, value, sub, tone = '') => `<div class="tile ${tone}"><span>${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  pane.innerHTML = head(`Hola, ${esc(ROLES[u].nombre.toLowerCase())}`, `Resumen de la operación al ${fdate(nowWall())}. Solo ves los indicadores que tu rol puede consultar.`) + `
    <div class="tiles">
      ${flota ? tile('Flota disponible', `${fl.Disponible || 0}<i>/${total}</i>`, `${fl.Alquilado || 0} alquilados · ${fl['En mantenimiento'] || 0} en taller`) : ''}
      ${alq ? tile('Alquileres activos', alq[0].activos, alq[0].atrasados ? `${alq[0].atrasados} con devolución atrasada` : 'Ninguno atrasado', alq[0].atrasados ? 'warn' : '') : ''}
      ${res ? tile('Reservas por confirmar', res[0].pendientes, `${res[0].proximas} próximas recogidas`) : ''}
      ${din ? tile('Ingresos aprobados', money(din[0].ingresos)) : ''}
      ${din ? tile('Saldo por cobrar', money(din[0].saldo), '', din[0].saldo > 0 ? 'warn' : '') : ''}
      ${man ? tile('Mantenimientos', man[0].en_proceso, `en proceso · ${man[0].programados} programados`) : ''}
    </div>
    <div class="two">
      ${late ? `<div class="card"><h2>Devoluciones atrasadas</h2>${late.length ? `<ul class="mini">${late.map(a => `<li><b>${code('A', a.id_alquiler)}</b> ${esc(a.marca)} ${esc(a.modelo)} · ${esc(a.placa)}<span class="bad">desde ${fdate(a.fecha_devolucion_programada, false)}</span></li>`).join('')}</ul>` : '<p class="empty">Todo al día.</p>'}</div>` : ''}
      ${next ? `<div class="card"><h2>Próximas recogidas</h2>${next.length ? `<ul class="mini">${next.map(r => `<li><b>${code('R', r.id_reserva)}</b> ${esc(r.marca)} ${esc(r.modelo)} ${badge(r.estado_reserva)}<span>${fdate(r.fecha_inicio)}</span></li>`).join('')}</ul>` : '<p class="empty">No hay recogidas programadas. Crea una desde el sitio público.</p>'}</div>` : ''}
    </div>`;
};

PANES.reservas = async ctx => {
  const { u, pane, can, params } = ctx;
  const f = params.get('f') || '';
  const cli = seesClients(u);
  const rows = await query(u, `SELECT r.*, v.placa, v.marca, v.modelo, v.kilometraje ${cli ? `, c.nombres || ' ' || c.apellidos AS cliente, c.numero_documento` : ''}
    FROM reserva r JOIN vehiculo v USING (id_vehiculo) ${cli ? 'JOIN cliente c USING (id_cliente)' : ''}
    WHERE ($1 = '' OR r.estado_reserva = $1) ORDER BY r.fecha_inicio DESC`, [f]);
  pane.innerHTML = head('Reservas', 'Confirma, cancela o entrega el vehículo. Las reservas nuevas llegan desde el sitio público.', `<a class="btn btn-primary" href="#/vehiculos">Nueva reserva</a>`) +
    filters('#/admin/reservas', [['', 'Todas'], ['Pendiente', 'Pendientes'], ['Confirmada', 'Confirmadas'], ['Cumplida', 'Cumplidas'], ['Cancelada', 'Canceladas']], f) +
    table([
      { h: 'Código', f: r => `<b>${code('R', r.id_reserva)}</b>` },
      { h: 'Cliente', f: r => cli ? `${esc(r.cliente)}<small>${esc(r.numero_documento)}</small>` : `<span class="muted">Cliente #${r.id_cliente}</span>` },
      { h: 'Vehículo', f: r => `${esc(r.marca)} ${esc(r.modelo)}<small>${esc(r.placa)}</small>` },
      { h: 'Periodo', f: r => `${fdate(r.fecha_inicio)}<small>→ ${fdate(r.fecha_fin)}</small>` },
      { h: 'Valor', f: r => money(r.valor_estimado), cls: 'num' },
      { h: 'Estado', f: r => badge(r.estado_reserva) },
      ...(can ? [{ h: 'Acciones', cls: 'acts', f: r => r.estado_reserva === 'Pendiente'
        ? act('Confirmar', `data-ok="${r.id_reserva}"`, 'btn-primary') + act('Entregar', `data-give="${r.id_reserva}"`) + act('Cancelar', `data-cancel="${r.id_reserva}"`, 'btn-ghost')
        : r.estado_reserva === 'Confirmada' ? act('Entregar', `data-give="${r.id_reserva}"`, 'btn-primary') + act('Cancelar', `data-cancel="${r.id_reserva}"`, 'btn-ghost') : '' }] : []),
    ], rows, 'No hay reservas con ese filtro.');
  wire(pane, '[data-ok]', d => runToast(ctx, ({ q }) => q(`UPDATE reserva SET estado_reserva='Confirmada' WHERE id_reserva=$1`, [+d.ok]), `Reserva ${code('R', d.ok)} confirmada.`));
  wire(pane, '[data-cancel]', async d => {
    if (await confirmDialog('Cancelar reserva', `¿Cancelar la reserva ${code('R', d.cancel)}?`, 'Sí, cancelar'))
      runToast(ctx, ({ q }) => q(`UPDATE reserva SET estado_reserva='Cancelada' WHERE id_reserva=$1`, [+d.cancel]), 'Reserva cancelada.');
  });
  wire(pane, '[data-give]', d => {
    const r = rows.find(x => x.id_reserva === +d.give);
    const start = new Date(Math.max(nowWall(), r.fecha_inicio));
    const end = r.fecha_fin > start ? r.fecha_fin : addDays(start, 1);
    modal({
      title: `Entregar vehículo · ${code('R', r.id_reserva)}`, submit: 'Registrar entrega',
      body: `<p class="muted">${esc(r.marca)} ${esc(r.modelo)} · ${esc(r.placa)}${cli ? ` para ${esc(r.cliente)}` : ''}</p><div class="grid2">
        ${field('Fecha de entrega', `<input type="datetime-local" name="ent" value="${toInput(start)}" required>`)}
        ${field('Devolución programada', `<input type="datetime-local" name="dev" value="${toInput(end)}" required>`)}
        ${field('Kilometraje de salida', `<input type="number" name="km" value="${r.kilometraje}" min="0" required>`)}
        ${field('Combustible de salida (%)', `<input type="number" name="fuel" value="100" min="0" max="100" step="0.01" required>`)}
        ${field('Valor total', `<input type="number" name="valor" value="${Number(r.valor_estimado)}" min="1" step="1" required>`)}
        ${field('Observaciones', `<input name="obs" maxlength="250">`)}</div>`,
      onSubmit: v => run(ctx, ({ q }) => q(`INSERT INTO alquiler (id_cliente,id_vehiculo,id_reserva,fecha_entrega,fecha_devolucion_programada,kilometraje_salida,nivel_combustible_salida,valor_total,observaciones)
        VALUES ($1,$2,$3,$4::timestamp,$5::timestamp,$6,$7,$8,NULLIF($9,''))`,
        [r.id_cliente, r.id_vehiculo, r.id_reserva, toSql(v.ent), toSql(v.dev), +v.km, +v.fuel, +v.valor, v.obs]), 'Vehículo entregado: el alquiler está activo.'),
    });
  });
};

PANES.alquileres = async ctx => {
  const { u, pane, can, params } = ctx;
  const f = params.get('f') ?? 'activos';
  const cli = seesClients(u), pay = seesPayments(u);
  const rows = await query(u, `SELECT a.*, v.placa, v.marca, v.modelo ${cli ? `, c.nombres || ' ' || c.apellidos AS cliente` : ''}
      ${pay ? `, COALESCE((SELECT SUM(valor_pago) FROM pago p WHERE p.id_alquiler = a.id_alquiler AND p.estado_pago='Aprobado'),0) AS pagado` : ''}
    FROM alquiler a JOIN vehiculo v USING (id_vehiculo) ${cli ? 'JOIN cliente c USING (id_cliente)' : ''}
    WHERE ($1 = '' OR ($1 = 'activos' AND a.estado_alquiler IN ('Activo','Atrasado')) OR ($1 = 'cerrados' AND a.estado_alquiler IN ('Finalizado','Cancelado')))
    ORDER BY a.fecha_entrega DESC`, [f === 'todos' ? '' : f]);
  pane.innerHTML = head('Alquileres', 'Entregas activas, devoluciones y alquileres directos sin reserva previa.', can ? `<button class="btn btn-primary" id="direct">Alquiler directo</button>` : '') +
    filters('#/admin/alquileres', [['activos', 'Activos'], ['cerrados', 'Finalizados'], ['todos', 'Todos']], f) +
    table([
      { h: 'Código', f: a => `<b>${code('A', a.id_alquiler)}</b>${a.id_reserva ? `<small>${code('R', a.id_reserva)}</small>` : '<small>Directo</small>'}` },
      { h: 'Cliente', f: a => cli ? esc(a.cliente) : `<span class="muted">Cliente #${a.id_cliente}</span>` },
      { h: 'Vehículo', f: a => `${esc(a.marca)} ${esc(a.modelo)}<small>${esc(a.placa)}</small>` },
      { h: 'Entrega', f: a => fdate(a.fecha_entrega) },
      { h: 'Devolución', f: a => a.fecha_devolucion_real ? fdate(a.fecha_devolucion_real) : `<span class="${isLate(a) ? 'bad' : ''}">${fdate(a.fecha_devolucion_programada)}</span><small>programada</small>` },
      { h: 'Valor', cls: 'num', f: a => money(a.valor_total) + (pay ? (a.valor_total - a.pagado > 0 ? `<small class="bad">Saldo ${money(a.valor_total - a.pagado)}</small>` : '<small class="good">Pagado</small>') : '') },
      { h: 'Estado', f: a => badge(isLate(a) ? 'Atrasado' : a.estado_alquiler) },
      ...(can ? [{ h: 'Acciones', cls: 'acts', f: a => ['Activo', 'Atrasado'].includes(a.estado_alquiler) ? act('Registrar devolución', `data-ret="${a.id_alquiler}"`, 'btn-primary') : '' }] : []),
    ], rows, 'No hay alquileres con ese filtro.');
  wire(pane, '[data-ret]', d => {
    const a = rows.find(x => x.id_alquiler === +d.ret);
    modal({
      title: `Devolución · ${code('A', a.id_alquiler)}`, submit: 'Registrar devolución',
      body: `<p class="muted">${esc(a.marca)} ${esc(a.modelo)} · ${esc(a.placa)} · salió con ${num(a.kilometraje_salida)} km y ${Number(a.nivel_combustible_salida)} % de combustible.</p><div class="grid2">
        ${field('Fecha de devolución', `<input type="datetime-local" name="fecha" value="${toInput(nowWall())}" required>`)}
        ${field('Kilometraje de entrada', `<input type="number" name="km" min="${a.kilometraje_salida}" value="${a.kilometraje_salida}" required>`)}
        ${field('Combustible de entrada (%)', `<input type="number" name="fuel" min="0" max="100" step="0.01" value="100" required>`)}
        ${field('Observaciones', `<input name="obs" maxlength="250" value="${esc(a.observaciones || '')}">`)}</div>
        <p class="fine">Al registrar la devolución, el vehículo vuelve a «Disponible» y su kilometraje se actualiza (regla 20).</p>`,
      onSubmit: v => run(ctx, ({ q }) => q(`UPDATE alquiler SET estado_alquiler='Finalizado', fecha_devolucion_real=$2::timestamp, kilometraje_entrada=$3,
          nivel_combustible_entrada=$4, observaciones=NULLIF($5,'') WHERE id_alquiler=$1`, [a.id_alquiler, toSql(v.fecha), +v.km, +v.fuel, v.obs]), 'Devolución registrada.'),
    });
  });
  const direct = $('#direct', pane);
  if (direct) direct.addEventListener('click', async () => {
    const [clientes, vehs] = await Promise.all([
      query(u, `SELECT id_cliente, nombres || ' ' || apellidos AS n, numero_documento FROM cliente WHERE estado_cliente='Activo' ORDER BY 2`),
      query(u, `SELECT v.id_vehiculo, v.placa, v.marca, v.modelo, v.kilometraje, k.tarifa_diaria_base FROM vehiculo v JOIN categoria_vehiculo k USING (id_categoria)
                WHERE v.estado_vehiculo NOT IN ('Fuera de servicio','En mantenimiento','Alquilado') ORDER BY v.marca`),
    ]);
    const now = nowWall();
    modal({
      title: 'Alquiler directo', submit: 'Entregar vehículo',
      body: `<div class="grid2">
        ${field('Cliente', `<select name="cli" required>${options(clientes.map(c => [c.id_cliente, `${c.n} · ${c.numero_documento}`]))}</select>`)}
        ${field('Vehículo', `<select name="veh" required>${options(vehs.map(v => [v.id_vehiculo, `${v.marca} ${v.modelo} · ${v.placa} · ${money(v.tarifa_diaria_base)}/día`]))}</select>`)}
        ${field('Entrega', `<input type="datetime-local" name="ent" value="${toInput(now)}" required>`)}
        ${field('Devolución programada', `<input type="datetime-local" name="dev" value="${toInput(addDays(now, 1))}" required>`)}
        ${field('Combustible de salida (%)', `<input type="number" name="fuel" value="100" min="0" max="100" required>`)}
        ${field('Observaciones', `<input name="obs" maxlength="250">`)}</div>
        <p class="fine">El valor se calcula con la tarifa diaria de la categoría por cada día o fracción.</p>`,
      onSubmit: v => {
        const veh = vehs.find(x => x.id_vehiculo === +v.veh);
        if (parseLocal(v.dev) <= parseLocal(v.ent)) throw new Error('La devolución debe ser posterior a la entrega.');
        const valor = rentalDays(v.ent, v.dev) * veh.tarifa_diaria_base;
        return run(ctx, ({ q }) => q(`INSERT INTO alquiler (id_cliente,id_vehiculo,fecha_entrega,fecha_devolucion_programada,kilometraje_salida,nivel_combustible_salida,valor_total,observaciones)
          VALUES ($1,$2,$3::timestamp,$4::timestamp,$5,$6,$7,NULLIF($8,''))`, [+v.cli, veh.id_vehiculo, toSql(v.ent), toSql(v.dev), veh.kilometraje, +v.fuel, valor, v.obs]),
          `Alquiler registrado por ${money(valor)}.`);
      },
    });
  });
};

PANES.pagos = async ctx => {
  const { u, pane, can, params } = ctx;
  const f = params.get('f') ?? 'saldo';
  const rows = await query(u, `SELECT a.id_alquiler, a.valor_total, a.estado_alquiler, a.fecha_entrega, c.nombres || ' ' || c.apellidos AS cliente, v.placa, v.marca, v.modelo,
      COALESCE(SUM(p.valor_pago) FILTER (WHERE p.estado_pago='Aprobado'),0) AS pagado, COUNT(p.id_pago)::int AS pagos
    FROM alquiler a JOIN cliente c USING (id_cliente) JOIN vehiculo v USING (id_vehiculo) LEFT JOIN pago p USING (id_alquiler)
    WHERE a.estado_alquiler <> 'Cancelado'
    GROUP BY a.id_alquiler, c.id_cliente, v.id_vehiculo ORDER BY a.fecha_entrega DESC`);
  const list = f === 'saldo' ? rows.filter(r => r.valor_total - r.pagado > 0) : rows;
  const totalSaldo = rows.reduce((s, r) => s + Math.max(0, r.valor_total - r.pagado), 0);
  pane.innerHTML = head('Pagos', `Saldo total por cobrar: <b>${money(totalSaldo)}</b>. Solo los pagos aprobados descuentan el saldo.`) +
    filters('#/admin/pagos', [['saldo', 'Con saldo pendiente'], ['todos', 'Todos']], f) +
    table([
      { h: 'Alquiler', f: r => `<b>${code('A', r.id_alquiler)}</b><small>${fdate(r.fecha_entrega, false)}</small>` },
      { h: 'Cliente', f: r => esc(r.cliente) },
      { h: 'Vehículo', f: r => `${esc(r.marca)} ${esc(r.modelo)}<small>${esc(r.placa)}</small>` },
      { h: 'Total', cls: 'num', f: r => money(r.valor_total) },
      { h: 'Pagado', cls: 'num', f: r => money(r.pagado) },
      { h: 'Saldo', cls: 'num', f: r => r.valor_total - r.pagado > 0 ? `<b class="bad">${money(r.valor_total - r.pagado)}</b>` : '<span class="good">Al día</span>' },
      { h: 'Acciones', cls: 'acts', f: r => act(`Ver pagos (${r.pagos})`, `data-list="${r.id_alquiler}"`, 'btn-ghost') + (can && r.valor_total - r.pagado > 0 ? act('Registrar pago', `data-pay="${r.id_alquiler}"`, 'btn-primary') : '') },
    ], list, 'No hay alquileres con saldo pendiente.');
  wire(pane, '[data-pay]', d => {
    const r = rows.find(x => x.id_alquiler === +d.pay);
    modal({
      title: `Registrar pago · ${code('A', r.id_alquiler)}`, submit: 'Registrar pago',
      body: `<p class="muted">${esc(r.cliente)} · saldo ${money(r.valor_total - r.pagado)}</p><div class="grid2">
        ${field('Valor', `<input type="number" name="valor" min="1" step="1" value="${r.valor_total - r.pagado}" required>`)}
        ${field('Método', `<select name="metodo">${options(['Tarjeta', 'Transferencia', 'Efectivo'])}</select>`)}
        ${field('Referencia', `<input name="ref" maxlength="50" value="PAG-${Date.now().toString(36).toUpperCase()}">`)}
        ${field('Estado', `<select name="estado">${options(['Aprobado', 'Pendiente', 'Rechazado'])}</select>`)}</div>`,
      onSubmit: v => run(ctx, ({ q }) => q(`INSERT INTO pago (id_alquiler, valor_pago, metodo_pago, referencia_pago, estado_pago) VALUES ($1,$2,$3,NULLIF($4,''),$5)`,
        [r.id_alquiler, +v.valor, v.metodo, v.ref, v.estado]), 'Pago registrado.'),
    });
  });
  wire(pane, '[data-list]', async d => {
    const pagos = await query(u, `SELECT * FROM pago WHERE id_alquiler=$1 ORDER BY fecha_pago`, [+d.list]);
    modal({
      title: `Pagos de ${code('A', d.list)}`, wide: true,
      body: table([
        { h: 'Fecha', f: p => fdate(p.fecha_pago) }, { h: 'Método', f: p => esc(p.metodo_pago) }, { h: 'Referencia', f: p => esc(p.referencia_pago || '—') },
        { h: 'Valor', cls: 'num', f: p => money(p.valor_pago) }, { h: 'Estado', f: p => badge(p.estado_pago) },
        ...(can ? [{ h: '', cls: 'acts', f: p => ['Aprobado', 'Pendiente'].includes(p.estado_pago) ? act('Anular', `data-void="${p.id_pago}"`, 'btn-ghost') : '' }] : []),
      ], pagos, 'Este alquiler no tiene pagos.'),
    });
    $$('[data-void]').forEach(b => b.addEventListener('click', async () => {
      try { await as(u, ({ q }) => q(`UPDATE pago SET estado_pago='Anulado' WHERE id_pago=$1`, [+b.dataset.void])); toast('Pago anulado.'); b.closest('dialog').querySelector('[data-close]').click(); ctx.reload(); }
      catch (ex) { toast(errorMessage(ex, ROLES[u].nombre), 'bad'); }
    }));
  });
};

const clienteForm = (c = {}) => `<div class="grid2">
  ${field('Tipo de documento', `<select name="tipo_documento" ${c.id_cliente ? 'disabled' : ''}>${options(['Cedula', 'Cedula extranjeria', 'Pasaporte'], c.tipo_documento)}</select>`)}
  ${field('Número de documento', `<input name="numero_documento" value="${esc(c.numero_documento || '')}" maxlength="12" required ${c.id_cliente ? 'readonly' : ''}>`, c.id_cliente ? '' : docHint('Cedula'))}
  ${field('Nombres', `<input name="nombres" value="${esc(c.nombres || '')}" maxlength="60" required>`)}
  ${field('Apellidos', `<input name="apellidos" value="${esc(c.apellidos || '')}" maxlength="60" required>`)}
  ${field('Teléfono', `<input name="telefono" value="${esc(c.telefono || '')}" maxlength="20" required>`)}
  ${field('Correo', `<input type="email" name="correo_electronico" value="${esc(c.correo_electronico || '')}" maxlength="100" required>`)}
  ${field('Número de licencia', `<input name="numero_licencia" value="${esc(c.numero_licencia || '')}" maxlength="30" required>`)}
  ${field('Vencimiento de licencia', `<input type="date" name="fecha_vencimiento_licencia" value="${c.fecha_vencimiento_licencia ? toInput(c.fecha_vencimiento_licencia).slice(0, 10) : ''}" required>`)}
  ${field('Dirección', `<input name="direccion" value="${esc(c.direccion || '')}" maxlength="150">`)}
  ${field('Estado', `<select name="estado_cliente">${options(['Activo', 'Inactivo', 'Bloqueado'], c.estado_cliente)}</select>`)}
</div>`;

PANES.clientes = async ctx => {
  const { u, pane, can, params } = ctx;
  const s = params.get('q') || '';
  const rows = await query(u, `SELECT c.*, (SELECT COUNT(*) FROM alquiler a WHERE a.id_cliente = c.id_cliente)::int AS alquileres
    FROM cliente c WHERE $1 = '' OR c.numero_documento ILIKE '%'||$1||'%' OR (c.nombres||' '||c.apellidos) ILIKE '%'||$1||'%' OR c.correo_electronico ILIKE '%'||$1||'%'
    ORDER BY c.nombres, c.apellidos`, [s]);
  pane.innerHTML = head('Clientes', `${rows.length} cliente(s).`, can ? `<button class="btn btn-primary" id="newCli">Nuevo cliente</button>` : '') +
    `<form class="searchbar" id="cliSearch"><input name="q" value="${esc(s)}" placeholder="Buscar por documento, nombre o correo" aria-label="Buscar clientes"><button class="btn">Buscar</button></form>` +
    table([
      { h: 'Documento', f: c => `${esc(c.numero_documento)}<small>${esc(c.tipo_documento)}</small>` },
      { h: 'Nombre', f: c => `${esc(c.nombres)} ${esc(c.apellidos)}` },
      { h: 'Contacto', f: c => `${esc(c.telefono)}<small>${esc(c.correo_electronico)}</small>` },
      { h: 'Licencia', f: c => `${esc(c.numero_licencia)}<small class="${new Date(c.fecha_vencimiento_licencia) < nowWall() ? 'bad' : ''}">vence ${fdate(c.fecha_vencimiento_licencia, false)}</small>` },
      { h: 'Alquileres', cls: 'num', f: c => c.alquileres },
      { h: 'Estado', f: c => badge(c.estado_cliente) },
      ...(can ? [{ h: '', cls: 'acts', f: c => act('Editar', `data-edit="${c.id_cliente}"`, 'btn-ghost') }] : []),
    ], rows, 'No se encontraron clientes.');
  $('#cliSearch', pane).addEventListener('submit', e => { e.preventDefault(); go(`#/admin/clientes?q=${encodeURIComponent(e.target.q.value.trim())}`); });
  const nb = $('#newCli', pane);
  if (nb) nb.addEventListener('click', () => modal({
    title: 'Nuevo cliente', wide: true, body: clienteForm(), onOpen: f => clientRules(f),
    onSubmit: v => run(ctx, ({ q }) => q(`INSERT INTO cliente (tipo_documento,numero_documento,nombres,apellidos,telefono,correo_electronico,numero_licencia,fecha_vencimiento_licencia,direccion,estado_cliente)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,''),$10)`, [v.tipo_documento, v.numero_documento, v.nombres, v.apellidos, v.telefono, v.correo_electronico.toLowerCase(), v.numero_licencia, v.fecha_vencimiento_licencia, v.direccion, v.estado_cliente]), 'Cliente registrado.'),
  }));
  wire(pane, '[data-edit]', d => {
    const c = rows.find(x => x.id_cliente === +d.edit);
    modal({
      title: `Editar cliente · ${c.nombres}`, wide: true, body: clienteForm(c), onOpen: f => clientRules(f, { licenciaMin: new Date(0) }),
      onSubmit: v => run(ctx, ({ q }) => q(`UPDATE cliente SET nombres=$2, apellidos=$3, telefono=$4, correo_electronico=$5, numero_licencia=$6, fecha_vencimiento_licencia=$7, direccion=NULLIF($8,''), estado_cliente=$9 WHERE id_cliente=$1`,
        [c.id_cliente, v.nombres, v.apellidos, v.telefono, v.correo_electronico.toLowerCase(), v.numero_licencia, v.fecha_vencimiento_licencia, v.direccion, v.estado_cliente]), 'Cliente actualizado.'),
    });
  });
};

PANES.flota = async ctx => {
  const { u, pane, can } = ctx;
  const isAdmin = u === A;
  const [rows, cats] = await Promise.all([
    query(u, `SELECT v.*, k.nombre_categoria FROM vehiculo v JOIN categoria_vehiculo k USING (id_categoria) ORDER BY k.nombre_categoria, v.marca, v.modelo`),
    query(u, `SELECT * FROM categoria_vehiculo ORDER BY tarifa_diaria_base`).catch(() => []),
  ]);
  const ESTADOS = ['Disponible', 'Reservado', 'Alquilado', 'En mantenimiento', 'Fuera de servicio'];
  pane.innerHTML = head('Flota', can ? 'Puedes cambiar el estado de cada vehículo. Los alquileres y mantenimientos lo actualizan automáticamente.' : 'Consulta del estado de la flota.', isAdmin ? `<button class="btn btn-primary" id="newVeh">Nuevo vehículo</button>` : '') +
    table([
      { h: 'Placa', f: v => `<b>${esc(v.placa)}</b>` },
      { h: 'Vehículo', f: v => `${esc(v.marca)} ${esc(v.modelo)}<small>${v.anio} · ${esc(v.color)}</small>` },
      { h: 'Categoría', f: v => esc(v.nombre_categoria) },
      { h: 'Kilometraje', cls: 'num', f: v => `${num(v.kilometraje)} km` },
      { h: 'Estado', f: v => can ? `<select class="inline-select" data-veh="${v.id_vehiculo}" aria-label="Estado de ${esc(v.placa)}">${options(ESTADOS, v.estado_vehiculo)}</select>` : badge(v.estado_vehiculo) },
    ], rows) + (cats.length ? `<h2 class="mt">Categorías y tarifas</h2>` + table([
      { h: 'Categoría', f: c => `<b>${esc(c.nombre_categoria)}</b><small>${esc(c.descripcion || '')}</small>` },
      { h: 'Tarifa diaria', cls: 'num', f: c => money(c.tarifa_diaria_base) },
      { h: 'Depósito', cls: 'num', f: c => money(c.deposito_requerido) },
      { h: 'Estado', f: c => badge(c.estado_categoria) },
      ...(isAdmin ? [{ h: '', cls: 'acts', f: c => act('Editar', `data-cat="${c.id_categoria}"`, 'btn-ghost') }] : []),
    ], cats) : '');
  $$('[data-veh]', pane).forEach(s => s.addEventListener('change', () =>
    runToast(ctx, ({ q }) => q(`UPDATE vehiculo SET estado_vehiculo=$2 WHERE id_vehiculo=$1`, [+s.dataset.veh, s.value]), 'Estado actualizado.')));
  wire(pane, '[data-cat]', d => {
    const c = cats.find(x => x.id_categoria === +d.cat);
    modal({
      title: `Categoría ${c.nombre_categoria}`, body: `<div class="grid2">
        ${field('Tarifa diaria', `<input type="number" name="t" value="${Number(c.tarifa_diaria_base)}" min="1" required>`)}
        ${field('Depósito', `<input type="number" name="d" value="${Number(c.deposito_requerido || 0)}" min="0" required>`)}
        ${field('Estado', `<select name="e">${options(['Activa', 'Inactiva'], c.estado_categoria)}</select>`)}</div>`,
      onSubmit: v => run(ctx, ({ q }) => q(`UPDATE categoria_vehiculo SET tarifa_diaria_base=$2, deposito_requerido=$3, estado_categoria=$4 WHERE id_categoria=$1`, [c.id_categoria, +v.t, +v.d, v.e]), 'Categoría actualizada.'),
    });
  });
  const nv = $('#newVeh', pane);
  if (nv) nv.addEventListener('click', () => modal({
    title: 'Nuevo vehículo', wide: true, body: `<div class="grid2">
      ${field('Categoría', `<select name="cat">${options(cats.map(c => [c.id_categoria, c.nombre_categoria]))}</select>`)}
      ${field('Placa', `<input name="placa" maxlength="10" required style="text-transform:uppercase">`)}
      ${field('Marca', `<input name="marca" maxlength="40" required>`)}
      ${field('Modelo', `<input name="modelo" maxlength="50" required>`)}
      ${field('Año', `<input type="number" name="anio" min="1980" max="2100" value="${nowWall().getUTCFullYear()}" required>`)}
      ${field('Color', `<select name="color">${options(['Blanco', 'Gris', 'Negro', 'Rojo', 'Azul', 'Plata', 'Verde', 'Amarillo'])}</select>`)}
      ${field('Número de chasis', `<input name="chasis" maxlength="50" required>`)}
      ${field('Kilometraje', `<input type="number" name="km" min="0" value="0" required>`)}</div>`,
    onSubmit: v => run(ctx, ({ q }) => q(`INSERT INTO vehiculo (id_categoria,placa,marca,modelo,anio,color,numero_chasis,kilometraje) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [+v.cat, v.placa.toUpperCase(), v.marca, v.modelo, +v.anio, v.color, v.chasis, +v.km]), 'Vehículo agregado a la flota.'),
  }));
};

PANES.mantenimiento = async ctx => {
  const { u, pane, can, params } = ctx;
  const f = params.get('f') || '';
  const rows = await query(u, `SELECT m.*, v.placa, v.marca, v.modelo FROM mantenimiento m JOIN vehiculo v USING (id_vehiculo)
    WHERE ($1 = '' OR ($1='abiertos' AND m.estado_mantenimiento IN ('Programado','En proceso')))
    ORDER BY CASE m.estado_mantenimiento WHEN 'En proceso' THEN 0 WHEN 'Programado' THEN 1 ELSE 2 END, m.fecha_inicio DESC`, [f]);
  pane.innerHTML = head('Mantenimiento', 'Al iniciar un mantenimiento el vehículo pasa a «En mantenimiento»; al finalizarlo vuelve a «Disponible» (reglas 19 y 20).', can ? `<button class="btn btn-primary" id="newMan">Programar mantenimiento</button>` : '') +
    filters('#/admin/mantenimiento', [['', 'Todos'], ['abiertos', 'Abiertos']], f) +
    table([
      { h: 'Vehículo', f: m => `<b>${esc(m.placa)}</b><small>${esc(m.marca)} ${esc(m.modelo)}</small>` },
      { h: 'Tipo', f: m => esc(m.tipo_mantenimiento) },
      { h: 'Descripción', f: m => `${esc(m.descripcion)}<small>${esc(m.taller_responsable || '')}</small>` },
      { h: 'Periodo', f: m => `${fdate(m.fecha_inicio)}${m.fecha_fin ? `<small>→ ${fdate(m.fecha_fin)}</small>` : ''}` },
      { h: 'Costo', cls: 'num', f: m => money(m.costo) },
      { h: 'Estado', f: m => badge(m.estado_mantenimiento) },
      ...(can ? [{ h: 'Acciones', cls: 'acts', f: m => m.estado_mantenimiento === 'Programado'
        ? act('Iniciar', `data-start="${m.id_mantenimiento}"`, 'btn-primary') + act('Cancelar', `data-mcancel="${m.id_mantenimiento}"`, 'btn-ghost')
        : m.estado_mantenimiento === 'En proceso' ? act('Finalizar', `data-end="${m.id_mantenimiento}"`, 'btn-primary') : '' }] : []),
    ], rows, 'No hay mantenimientos.');
  wire(pane, '[data-start]', d => runToast(ctx, ({ q }) => q(`UPDATE mantenimiento SET estado_mantenimiento='En proceso', fecha_inicio=LEAST(fecha_inicio, LOCALTIMESTAMP) WHERE id_mantenimiento=$1`, [+d.start]), 'Mantenimiento iniciado.'));
  wire(pane, '[data-mcancel]', d => runToast(ctx, ({ q }) => q(`UPDATE mantenimiento SET estado_mantenimiento='Cancelado' WHERE id_mantenimiento=$1`, [+d.mcancel]), 'Mantenimiento cancelado.'));
  wire(pane, '[data-end]', d => {
    const m = rows.find(x => x.id_mantenimiento === +d.end);
    modal({
      title: `Finalizar mantenimiento · ${m.placa}`, submit: 'Finalizar', body: `<div class="grid2">
        ${field('Fecha de fin', `<input type="datetime-local" name="fin" value="${toInput(nowWall())}" required>`)}
        ${field('Costo final', `<input type="number" name="costo" min="0" value="${Number(m.costo)}" required>`)}
        ${field('Kilometraje', `<input type="number" name="km" min="0" value="${m.kilometraje_mantenimiento}" required>`)}</div>`,
      onSubmit: v => run(ctx, ({ q }) => q(`UPDATE mantenimiento SET estado_mantenimiento='Finalizado', fecha_fin=$2::timestamp, costo=$3, kilometraje_mantenimiento=$4 WHERE id_mantenimiento=$1`,
        [m.id_mantenimiento, toSql(v.fin), +v.costo, +v.km]), 'Mantenimiento finalizado; el vehículo está disponible.'),
    });
  });
  const nm = $('#newMan', pane);
  if (nm) nm.addEventListener('click', async () => {
    const vehs = await query(u, `SELECT id_vehiculo, placa, marca, modelo, kilometraje, estado_vehiculo FROM vehiculo ORDER BY placa`);
    modal({
      title: 'Programar mantenimiento', wide: true, body: `<div class="grid2">
        ${field('Vehículo', `<select name="veh">${options(vehs.map(v => [v.id_vehiculo, `${v.placa} · ${v.marca} ${v.modelo} (${v.estado_vehiculo})`]))}</select>`)}
        ${field('Tipo', `<select name="tipo">${options(['Preventivo', 'Correctivo'])}</select>`)}
        ${field('Fecha de inicio', `<input type="datetime-local" name="ini" value="${toInput(addDays(nowWall(), 1, 8))}" required>`)}
        ${field('Estado inicial', `<select name="estado">${options([['Programado', 'Programado'], ['En proceso', 'En proceso (empieza ya)']])}</select>`)}
        <div class="span2">${field('Descripción', `<input name="desc" maxlength="250" required placeholder="Ej.: cambio de aceite y filtros">`)}</div>
        ${field('Costo estimado', `<input type="number" name="costo" min="0" value="0" required>`)}
        ${field('Taller responsable', `<input name="taller" maxlength="100">`)}</div>`,
      onSubmit: v => {
        const veh = vehs.find(x => x.id_vehiculo === +v.veh);
        return run(ctx, ({ q }) => q(`INSERT INTO mantenimiento (id_vehiculo,tipo_mantenimiento,fecha_inicio,descripcion,costo,kilometraje_mantenimiento,estado_mantenimiento,taller_responsable)
          VALUES ($1,$2,$3::timestamp,$4,$5,$6,$7,NULLIF($8,''))`, [veh.id_vehiculo, v.tipo, toSql(v.ini), v.desc, +v.costo, veh.kilometraje, v.estado, v.taller]), 'Mantenimiento registrado.');
      },
    });
  });
};

PANES.reportes = async ({ u, pane }) => {
  const [metodo, vehs, clis, mant] = await Promise.all([
    query(u, `SELECT metodo_pago, COUNT(*)::int pagos, SUM(valor_pago) total FROM pago WHERE estado_pago='Aprobado' GROUP BY 1 ORDER BY 3 DESC`),
    query(u, `SELECT v.placa, v.marca || ' ' || v.modelo AS vehiculo, COUNT(a.id_alquiler)::int alquileres, COALESCE(SUM(a.valor_total),0) ingresos
              FROM vehiculo v LEFT JOIN alquiler a ON a.id_vehiculo = v.id_vehiculo AND a.estado_alquiler <> 'Cancelado' GROUP BY v.id_vehiculo ORDER BY 3 DESC, 4 DESC`),
    query(u, `SELECT c.nombres || ' ' || c.apellidos AS cliente, COUNT(a.id_alquiler)::int alquileres, SUM(a.valor_total) total
              FROM cliente c JOIN alquiler a USING (id_cliente) WHERE a.estado_alquiler <> 'Cancelado' GROUP BY c.id_cliente ORDER BY 2 DESC, 3 DESC LIMIT 5`),
    query(u, `SELECT v.placa, v.marca || ' ' || v.modelo AS vehiculo, COUNT(m.id_mantenimiento)::int servicios, SUM(m.costo) costo
              FROM mantenimiento m JOIN vehiculo v USING (id_vehiculo) WHERE m.estado_mantenimiento <> 'Cancelado' GROUP BY v.id_vehiculo ORDER BY 4 DESC`),
  ]);
  const bar = (v, max) => `<span class="bar" style="--w:${max ? Math.round(v / max * 100) : 0}%"></span>`;
  const mx = (arr, k) => Math.max(0, ...arr.map(r => Number(r[k])));
  pane.innerHTML = head('Reportes', 'Información para la toma de decisiones, calculada en vivo sobre la base de datos.') + `<div class="two">
    <div class="card"><h2>Ingresos por método de pago</h2>${table([{ h: 'Método', f: r => esc(r.metodo_pago) }, { h: 'Pagos', cls: 'num', f: r => r.pagos }, { h: 'Total', cls: 'num', f: r => money(r.total) + bar(r.total, mx(metodo, 'total')) }], metodo)}</div>
    <div class="card"><h2>Clientes frecuentes</h2>${table([{ h: 'Cliente', f: r => esc(r.cliente) }, { h: 'Alquileres', cls: 'num', f: r => r.alquileres }, { h: 'Total', cls: 'num', f: r => money(r.total) + bar(r.total, mx(clis, 'total')) }], clis)}</div>
    <div class="card"><h2>Uso de la flota</h2>${table([{ h: 'Vehículo', f: r => `${esc(r.vehiculo)}<small>${esc(r.placa)}</small>` }, { h: 'Alquileres', cls: 'num', f: r => r.alquileres }, { h: 'Ingresos', cls: 'num', f: r => money(r.ingresos) + bar(r.ingresos, mx(vehs, 'ingresos')) }], vehs)}</div>
    <div class="card"><h2>Costos de mantenimiento</h2>${table([{ h: 'Vehículo', f: r => `${esc(r.vehiculo)}<small>${esc(r.placa)}</small>` }, { h: 'Servicios', cls: 'num', f: r => r.servicios }, { h: 'Costo', cls: 'num', f: r => money(r.costo) + bar(r.costo, mx(mant, 'costo')) }], mant)}</div>
  </div>`;
};

PANES.sql = async ({ u, pane }) => {
  const EX = [
    ['Vehículos disponibles hoy', `SELECT placa, marca, modelo, estado_vehiculo\nFROM vehiculo\nWHERE fn_vehiculo_disponible(id_vehiculo, LOCALTIMESTAMP::timestamp, (LOCALTIMESTAMP + INTERVAL '1 day')::timestamp)\nORDER BY placa;`],
    ['Saldo por alquiler', `SELECT a.id_alquiler, a.valor_total,\n       COALESCE(SUM(p.valor_pago) FILTER (WHERE p.estado_pago = 'Aprobado'), 0) AS pagado\nFROM alquiler a LEFT JOIN pago p USING (id_alquiler)\nGROUP BY a.id_alquiler ORDER BY 1;`],
    ['Probar un permiso', `UPDATE vehiculo SET color = 'Verde' WHERE placa = 'ABC123';`],
    ['Mis privilegios', `SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios\nFROM information_schema.role_table_grants\nWHERE grantee = '${ROLES[u].rol}'\nGROUP BY table_name ORDER BY 1;`],
  ];
  pane.innerHTML = head('Consola SQL', `Las instrucciones se ejecutan como <code>${u}</code>, con sus permisos reales. Los cambios que hagas se guardan.`) + `
    <div class="chips-row">${EX.map(([t], i) => `<button class="pill" data-ex="${i}">${t}</button>`).join('')}</div>
    <textarea id="sqlIn" class="sql-in" spellcheck="false" aria-label="Instrucción SQL">${esc(EX[0][1])}</textarea>
    <div class="row-actions"><button class="btn btn-primary" id="sqlRun">Ejecutar</button><span class="muted small" id="sqlT"></span></div>
    <div id="sqlOut" class="sql-out"></div>`;
  const inp = $('#sqlIn', pane), out = $('#sqlOut', pane);
  wire(pane, '[data-ex]', d => { inp.value = EX[d.ex][1]; });
  const exec = async () => {
    const t0 = performance.now();
    try {
      const r = await execAs(u, inp.value);
      out.innerHTML = r && r.fields && r.fields.length
        ? table(r.fields.map(fl => ({ h: fl.name, f: row => row[fl.name] instanceof Date ? fdate(row[fl.name]) : esc(row[fl.name] ?? 'NULL') })), r.rows, 'La consulta no devolvió filas.')
        : `<div class="notice ok">Instrucción ejecutada${r && r.affectedRows != null ? `: ${r.affectedRows} fila(s) afectada(s)` : ''}.</div>`;
    } catch (ex) { out.innerHTML = `<div class="notice bad">${esc(errorMessage(ex, ROLES[u].nombre))}<small>${esc(ex.message)}</small></div>`; }
    $('#sqlT', pane).textContent = `${(performance.now() - t0).toFixed(1)} ms`;
  };
  $('#sqlRun', pane).addEventListener('click', exec);
  inp.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); exec(); } });
};

PANES.datos = async ({ pane }) => {
  pane.innerHTML = head('Datos de demostración') + `<div class="card narrow">
    <p>La base de datos funciona dentro de tu navegador y se guarda en él: los clientes, reservas y pagos que registres se conservan al recargar la página, pero no se comparten con otras personas ni con otros navegadores.</p>
    <p>Restablecer vuelve a cargar los scripts del proyecto (01, 02, 04, 05, 06, 09 y 10) y borra todo lo que hayas registrado.</p>
    <button class="btn btn-danger" id="reset">Restablecer datos originales</button></div>`;
  $('#reset', pane).addEventListener('click', async () => {
    if (!await confirmDialog('Restablecer datos', 'Se borrarán todas las reservas, clientes y pagos que hayas creado. ¿Continuar?', 'Restablecer')) return;
    try { await resetData(); toast('Datos restablecidos.'); go('#/admin/panel'); }
    catch (ex) { toast(errorMessage(ex), 'bad'); }
  });
};
