// Sitio público de Sanca Rent: inicio, catálogo, reserva y consulta de reservas.
import { as, query, PUBLIC_ROLE, errorMessage } from './db.js?v=9';
import { $, $$, esc, money, num, fdate, parseLocal, toInput, toSql, nowWall, addDays, rentalDays, badge, code, carSvg, carPhoto, categoryPhoto, clientRules, docHint, toast, field, options, confirmDialog } from './ui.js?v=9';

const R = PUBLIC_ROLE;
const go = h => { location.hash = h; };

function defaultDates() {
  const start = addDays(nowWall(), 1, 8);
  return { inicio: toInput(start), fin: toInput(addDays(start, 3, 18)) };
}
function validRange(inicio, fin) {
  if (!inicio || !fin) return 'Elige las fechas de recogida y devolución.';
  const a = parseLocal(inicio), b = parseLocal(fin);
  if (isNaN(a) || isNaN(b)) return 'Las fechas no son válidas.';
  if (a < nowWall()) return 'La recogida debe ser en una fecha futura.';
  if (b <= a) return 'La devolución debe ser posterior a la recogida.';
  return '';
}

async function categorias() {
  return query(R, `SELECT c.id_categoria, c.nombre_categoria, c.descripcion, c.tarifa_diaria_base, c.deposito_requerido,
      COUNT(v.id_vehiculo) FILTER (WHERE v.estado_vehiculo <> 'Fuera de servicio') AS vehiculos
    FROM categoria_vehiculo c LEFT JOIN vehiculo v USING (id_categoria)
    WHERE c.estado_categoria = 'Activa'
    GROUP BY c.id_categoria ORDER BY c.tarifa_diaria_base`);
}

function searchForm({ inicio, fin, cat = '' }, cats, compact = false) {
  return `<form class="search ${compact ? 'compact' : ''}" id="searchForm">
    ${field('Recogida', `<input type="datetime-local" name="inicio" value="${esc(inicio)}" required>`)}
    ${field('Devolución', `<input type="datetime-local" name="fin" value="${esc(fin)}" required>`)}
    ${field('Categoría', `<select name="cat"><option value="">Todas</option>${options(cats.map(c => [c.id_categoria, c.nombre_categoria]), cat)}</select>`)}
    <button class="btn btn-primary" type="submit">Buscar vehículos</button>
  </form>`;
}
function bindSearch(view) {
  $('#searchForm', view).addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const err = validRange(f.get('inicio'), f.get('fin'));
    if (err) return toast(err, 'bad');
    go(`#/vehiculos?${new URLSearchParams({ inicio: f.get('inicio'), fin: f.get('fin'), cat: f.get('cat') })}`);
  });
}

/* ---------- Inicio ---------- */
export async function home(view) {
  const cats = await categorias();
  const d = defaultDates();
  view.innerHTML = `
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <h1>Alquila el vehículo que necesitas, sin papeleo.</h1>
        <p class="lead">Consulta la disponibilidad real de la flota, reserva en minutos y recoge tu vehículo listo para salir.</p>
        ${searchForm(d, cats)}
      </div>
      <div class="hero-art" aria-hidden="true">${carSvg('SUV', 'Azul')}${carSvg('Compacto', 'Rojo')}</div>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <h2>Nuestra flota</h2>
      <p class="sub">Tarifas por día. El depósito se reembolsa al devolver el vehículo en buen estado.</p>
      <div class="cat-grid">${cats.map(c => `
        <a class="cat-card" href="#/vehiculos?${new URLSearchParams({ ...d, cat: c.id_categoria })}">
          ${categoryPhoto(c.nombre_categoria)}
          <h3>${esc(c.nombre_categoria)}</h3>
          <p>${esc(c.descripcion || '')}</p>
          <div class="cat-meta"><b>${money(c.tarifa_diaria_base)}</b><span>/ día</span></div>
          <small>Depósito ${money(c.deposito_requerido)} · ${c.vehiculos} vehículo(s)</small>
        </a>`).join('')}</div>
    </div>
  </section>
  <section class="section alt">
    <div class="wrap steps3">
      <div><span>1</span><h3>Elige fechas y vehículo</h3><p>El sistema solo te muestra los vehículos libres en el periodo que buscas.</p></div>
      <div><span>2</span><h3>Reserva en línea</h3><p>Con tu documento y licencia vigentes. Si ya eres cliente, te reconocemos.</p></div>
      <div><span>3</span><h3>Recoge y disfruta</h3><p>Consulta o cancela tu reserva cuando quieras en «Mi reserva».</p></div>
    </div>
  </section>`;
  bindSearch(view);
}

/* ---------- Catálogo ---------- */
export async function catalog(view, params) {
  const cats = await categorias();
  const d = defaultDates();
  const inicio = params.get('inicio') || '', fin = params.get('fin') || '', cat = params.get('cat') || '';
  const err = inicio || fin ? validRange(inicio, fin) : '';
  const hasDates = inicio && fin && !err;
  const rows = await query(R, `
    SELECT v.id_vehiculo, v.placa, v.marca, v.modelo, v.anio, v.color, v.kilometraje, v.estado_vehiculo,
           c.id_categoria, c.nombre_categoria, c.tarifa_diaria_base, c.deposito_requerido,
           CASE WHEN $1::timestamp IS NULL THEN NULL ELSE fn_vehiculo_disponible(v.id_vehiculo, $1::timestamp, $2::timestamp) END AS disponible
    FROM vehiculo v JOIN categoria_vehiculo c USING (id_categoria)
    WHERE v.estado_vehiculo <> 'Fuera de servicio' AND c.estado_categoria = 'Activa'
      AND ($3::int IS NULL OR c.id_categoria = $3::int)
    ORDER BY (CASE WHEN $1::timestamp IS NULL THEN true ELSE fn_vehiculo_disponible(v.id_vehiculo, $1::timestamp, $2::timestamp) END) DESC,
             c.tarifa_diaria_base, v.marca, v.modelo`,
    [hasDates ? toSql(inicio) : null, hasDates ? toSql(fin) : null, cat ? Number(cat) : null]);
  const days = hasDates ? rentalDays(inicio, fin) : 0;
  const libres = rows.filter(r => r.disponible).length;
  view.innerHTML = `
  <section class="page-head"><div class="wrap">
    <h1>Vehículos</h1>
    ${searchForm({ inicio: inicio || d.inicio, fin: fin || d.fin, cat }, cats, true)}
    <p class="result-note">${err ? `<span class="bad">${esc(err)}</span>` : hasDates
      ? `<b>${libres}</b> de ${rows.length} vehículos disponibles del ${fdate(inicio)} al ${fdate(fin)} · ${days} día(s)`
      : 'Elige las fechas para ver la disponibilidad y el precio total.'}</p>
  </div></section>
  <section class="section tight"><div class="wrap">
    <div class="car-grid">${rows.map(v => {
      const ok = v.disponible === true;
      const reason = v.estado_vehiculo === 'En mantenimiento' ? 'En mantenimiento' : 'Ocupado en esas fechas';
      return `<article class="car-card${hasDates && !ok ? ' off' : ''}">
        <div class="car-art">${carPhoto({ marca: v.marca, modelo: v.modelo, categoria: v.nombre_categoria, color: v.color })}</div>
        <div class="car-info">
          <div class="car-top"><span class="chip">${esc(v.nombre_categoria)}</span>${hasDates ? (ok ? badge('Disponible') : `<span class="badge t-muted">${reason}</span>`) : ''}</div>
          <h3>${esc(v.marca)} ${esc(v.modelo)}</h3>
          <p class="specs">${v.anio} · ${esc(v.color)} · ${num(v.kilometraje)} km</p>
          <div class="price"><b>${money(v.tarifa_diaria_base)}</b><span>/ día</span>
            ${hasDates ? `<em>Total ${money(v.tarifa_diaria_base * days)}</em>` : ''}</div>
          ${hasDates
            ? (ok ? `<a class="btn btn-primary block" href="#/reservar/${v.id_vehiculo}?${new URLSearchParams({ inicio, fin })}">Reservar</a>`
                  : `<button class="btn block" disabled>No disponible</button>`)
            : `<a class="btn btn-ghost block" href="#/vehiculos?${new URLSearchParams({ ...d, cat })}">Ver disponibilidad</a>`}
        </div>
      </article>`;
    }).join('') || '<p class="empty">No hay vehículos en esta categoría.</p>'}</div>
  </div></section>`;
  bindSearch(view);
}

/* ---------- Reservar ---------- */
export async function reservar(view, params, id) {
  const inicio = params.get('inicio'), fin = params.get('fin');
  const err = validRange(inicio, fin);
  const v = (await query(R, `SELECT v.*, c.nombre_categoria, c.tarifa_diaria_base, c.deposito_requerido,
      fn_vehiculo_disponible(v.id_vehiculo, $2::timestamp, $3::timestamp) AS disponible
    FROM vehiculo v JOIN categoria_vehiculo c USING (id_categoria) WHERE v.id_vehiculo = $1`,
    [Number(id), toSql(inicio || '2000-01-01T00:00'), toSql(fin || '2000-01-02T00:00')]))[0];
  if (!v) { view.innerHTML = `<section class="section"><div class="wrap"><p class="empty">Vehículo no encontrado.</p></div></section>`; return; }
  const days = err ? 0 : rentalDays(inicio, fin);
  const total = days * v.tarifa_diaria_base;
  view.innerHTML = `
  <section class="page-head"><div class="wrap"><a class="back" href="#/vehiculos?${new URLSearchParams({ inicio, fin })}">← Volver a vehículos</a><h1>Completa tu reserva</h1></div></section>
  <section class="section tight"><div class="wrap book-grid">
    <form class="card book-form" id="bookForm" novalidate>
      <h2>Tus datos</h2>
      <p class="muted small form-intro">Si ya eres cliente, escribe tu documento y te reconocemos. Todos los campos son obligatorios, salvo los marcados como opcionales.</p>
      <div class="grid2">
        ${field('Tipo de documento', `<select name="tipo_documento">${options(['Cedula', 'Cedula extranjeria', 'Pasaporte'])}</select>`)}
        ${field('Número de documento', `<input name="numero_documento" required maxlength="10" inputmode="numeric" autocomplete="off">`, docHint('Cedula'))}
      </div>
      <p class="known" id="known" hidden></p>
      <div id="newFields" class="grid2">
        ${field('Nombres', `<input name="nombres" required maxlength="60" autocomplete="given-name">`)}
        ${field('Apellidos', `<input name="apellidos" required maxlength="60" autocomplete="family-name">`)}
        ${field('Teléfono', `<input name="telefono" required maxlength="10" inputmode="numeric" autocomplete="tel" placeholder="3001234567">`)}
        ${field('Correo electrónico', `<input type="email" name="correo_electronico" required maxlength="100" autocomplete="email" placeholder="nombre@correo.com">`)}
        ${field('Número de licencia', `<input name="numero_licencia" required maxlength="30" autocomplete="off" style="text-transform:uppercase">`)}
        ${field('Vencimiento de la licencia', `<input type="date" name="fecha_vencimiento_licencia" required>`)}
        <div class="span2">${field('Dirección (opcional)', `<input name="direccion" maxlength="150" autocomplete="street-address">`)}</div>
      </div>
      ${field('Observaciones (opcional)', `<textarea name="observaciones" maxlength="250" rows="2" placeholder="Ej.: necesito silla para bebé"></textarea>`)}
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-primary block lg" type="submit" ${err || !v.disponible ? 'disabled' : ''}>Confirmar reserva</button>
      <p class="fine">Al reservar aceptas que el vehículo se entrega con el depósito de la categoría. La reserva queda <b>pendiente</b> hasta que un asesor la confirme.</p>
    </form>
    <aside class="card summary">
      <div class="car-art">${carPhoto({ marca: v.marca, modelo: v.modelo, categoria: v.nombre_categoria, color: v.color }, { w: 800, credit: true })}</div>
      <span class="chip">${esc(v.nombre_categoria)}</span>
      <h2>${esc(v.marca)} ${esc(v.modelo)} <small>${v.anio}</small></h2>
      <p class="specs">${esc(v.color)} · ${num(v.kilometraje)} km · Placa ${esc(v.placa)}</p>
      <dl class="lines">
        <div><dt>Recogida</dt><dd>${err ? '—' : fdate(inicio)}</dd></div>
        <div><dt>Devolución</dt><dd>${err ? '—' : fdate(fin)}</dd></div>
        <div><dt>${days} día(s) × ${money(v.tarifa_diaria_base)}</dt><dd>${money(total)}</dd></div>
        <div class="total"><dt>Total estimado</dt><dd>${money(total)}</dd></div>
        <div class="muted"><dt>Depósito reembolsable</dt><dd>${money(v.deposito_requerido)}</dd></div>
      </dl>
      ${err ? `<p class="bad">${esc(err)}</p>` : !v.disponible ? `<p class="bad">Este vehículo ya no está disponible en esas fechas.</p>` : ''}
    </aside>
  </div></section>`;

  const form = $('#bookForm', view), known = $('#known', view), newFields = $('#newFields', view), errEl = $('.form-error', form);
  let cliente = null;
  const checkAll = clientRules(form, { licenciaMin: err ? null : parseLocal(fin) });
  const setKnown = c => {
    cliente = c;
    known.hidden = !c;
    newFields.hidden = !!c;
    $$('input', newFields).forEach(i => { i.disabled = !!c; });
    if (c) known.innerHTML = `✓ Hola, <b>${esc(c.nombres)}</b>. Usaremos los datos que ya tenemos registrados.`;
  };
  form.numero_documento.addEventListener('change', async () => {
    const doc = form.numero_documento.value.trim();
    if (!form.numero_documento.checkValidity()) return setKnown(null);
    const c = (await query(R, `SELECT id_cliente, nombres, estado_cliente FROM cliente WHERE numero_documento = $1`, [doc]))[0];
    setKnown(c || null);
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.hidden = true;
    if (!checkAll() || !form.reportValidity()) {
      errEl.textContent = 'Revisa los campos marcados en rojo.'; errEl.hidden = false; return;
    }
    const f = Object.fromEntries(new FormData(form));
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try {
      const id_reserva = await as(R, async ({ one }) => {
        let idc = (await one(`SELECT id_cliente FROM cliente WHERE numero_documento = $1`, [f.numero_documento.trim()]))?.id_cliente;
        if (!idc) {
          idc = (await one(`INSERT INTO cliente (tipo_documento, numero_documento, nombres, apellidos, telefono, correo_electronico,
              numero_licencia, fecha_vencimiento_licencia, direccion)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,'')) RETURNING id_cliente`,
            [f.tipo_documento, f.numero_documento.trim(), f.nombres, f.apellidos, f.telefono, f.correo_electronico.toLowerCase(),
              f.numero_licencia, f.fecha_vencimiento_licencia, f.direccion || ''])).id_cliente;
        }
        return (await one(`INSERT INTO reserva (id_cliente, id_vehiculo, fecha_inicio, fecha_fin, valor_estimado, observaciones)
          VALUES ($1,$2,$3::timestamp,$4::timestamp,$5,NULLIF($6,'')) RETURNING id_reserva`,
          [idc, v.id_vehiculo, toSql(inicio), toSql(fin), total, f.observaciones || ''])).id_reserva;
      });
      go(`#/reserva/${id_reserva}`);
    } catch (ex) {
      errEl.textContent = errorMessage(ex); errEl.hidden = false; btn.disabled = false;
    }
  });
}

/* ---------- Confirmación ---------- */
export async function confirmacion(view, id) {
  const r = (await query(R, `SELECT r.*, c.nombres, c.correo_electronico, c.tipo_documento, c.numero_documento, v.marca, v.modelo, v.color, v.placa,
      k.nombre_categoria, k.deposito_requerido
    FROM reserva r JOIN cliente c USING (id_cliente) JOIN vehiculo v USING (id_vehiculo) JOIN categoria_vehiculo k USING (id_categoria)
    WHERE r.id_reserva = $1`, [Number(id)]))[0];
  if (!r) { view.innerHTML = `<section class="section"><div class="wrap"><p class="empty">Reserva no encontrada.</p></div></section>`; return; }
  view.innerHTML = `<section class="section"><div class="wrap narrow">
    <div class="card done">
      <div class="done-icon" aria-hidden="true">✓</div>
      <h1>¡Reserva registrada, ${esc(r.nombres.split(' ')[0])}!</h1>
      <p>Tu código de reserva es</p>
      <p class="big-code">${code('R', r.id_reserva)}</p>
      <div class="car-art">${carPhoto({ marca: r.marca, modelo: r.modelo, categoria: r.nombre_categoria, color: r.color }, { w: 800 })}</div>
      <dl class="lines">
        <div><dt>Vehículo</dt><dd>${esc(r.marca)} ${esc(r.modelo)} · ${esc(r.placa)}</dd></div>
        <div><dt>Recogida</dt><dd>${fdate(r.fecha_inicio)}</dd></div>
        <div><dt>Devolución</dt><dd>${fdate(r.fecha_fin)}</dd></div>
        <div><dt>Estado</dt><dd>${badge(r.estado_reserva)}</dd></div>
        <div class="total"><dt>Total estimado</dt><dd>${money(r.valor_estimado)}</dd></div>
        <div class="muted"><dt>Depósito al recoger</dt><dd>${money(r.deposito_requerido)}</dd></div>
      </dl>
      <div class="row-actions center">
        <a class="btn btn-primary" href="#/mi-reserva?${new URLSearchParams({ tipo: r.tipo_documento, doc: r.numero_documento })}">Ver mis reservas</a>
        <a class="btn btn-ghost" href="#/">Volver al inicio</a>
      </div>
    </div>
  </div></section>`;
}

/* ---------- Mi reserva ---------- */
export async function misReservas(view, params) {
  const doc = (params.get('doc') || '').trim();
  const tipo = ['Cedula', 'Cedula extranjeria', 'Pasaporte'].includes(params.get('tipo')) ? params.get('tipo') : 'Cedula';
  view.innerHTML = `<section class="page-head"><div class="wrap">
    <h1>Mi reserva</h1>
    <form class="search compact doc" id="docForm" novalidate>
      ${field('Tipo de documento', `<select name="tipo_documento">${options(['Cedula', 'Cedula extranjeria', 'Pasaporte'], tipo)}</select>`)}
      ${field('Número de documento', `<input name="numero_documento" value="${esc(doc)}" required autocomplete="off">`, docHint(tipo))}
      <button class="btn btn-primary" type="submit">Consultar</button>
    </form>
    <p class="result-note">Ejemplos de la base de datos: <button class="link" data-doc="1020304050">1020304050</button> · <button class="link" data-doc="1050607080">1050607080</button></p>
  </div></section><section class="section tight"><div class="wrap" id="mine"></div></section>`;
  const docForm = $('#docForm', view);
  const checkDoc = clientRules(docForm);
  docForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!checkDoc()) return;
    go(`#/mi-reserva?${new URLSearchParams({ tipo: docForm.tipo_documento.value, doc: docForm.numero_documento.value })}`);
  });
  $$('[data-doc]', view).forEach(b => b.addEventListener('click', () => go(`#/mi-reserva?tipo=Cedula&doc=${b.dataset.doc}`)));
  if (!doc) return;
  // Aunque se escriba en la dirección, un documento con formato inválido no se consulta.
  const valido = tipo === 'Cedula' ? /^\d{6,10}$/.test(doc) : /^[A-Z0-9]{6,12}$/.test(doc);
  if (!valido) {
    $('#mine', view).innerHTML = `<div class="notice bad">El número de documento no es válido. ${esc(docHint(tipo))}</div>`;
    return;
  }
  const out = $('#mine', view);
  const data = await as(R, async ({ q, one }) => {
    const c = await one(`SELECT * FROM cliente WHERE numero_documento = $1 AND tipo_documento = $2`, [doc, tipo]);
    if (!c) return null;
    const reservas = await q(`SELECT r.*, v.marca, v.modelo, v.color, k.nombre_categoria FROM reserva r JOIN vehiculo v USING (id_vehiculo)
      JOIN categoria_vehiculo k USING (id_categoria) WHERE r.id_cliente = $1 ORDER BY r.fecha_inicio DESC`, [c.id_cliente]);
    const alquileres = await q(`SELECT a.*, v.marca, v.modelo, v.placa,
        COALESCE(SUM(p.valor_pago) FILTER (WHERE p.estado_pago = 'Aprobado'), 0) AS pagado
      FROM alquiler a JOIN vehiculo v USING (id_vehiculo) LEFT JOIN pago p USING (id_alquiler)
      WHERE a.id_cliente = $1 GROUP BY a.id_alquiler, v.id_vehiculo ORDER BY a.fecha_entrega DESC`, [c.id_cliente]);
    return { c, reservas, alquileres };
  });
  if (!data) { out.innerHTML = `<p class="empty">No encontramos un cliente con el documento ${esc(doc)}.</p>`; return; }
  const { c, reservas, alquileres } = data;
  const now = nowWall();
  out.innerHTML = `
    <p class="hello">Hola, <b>${esc(c.nombres)} ${esc(c.apellidos)}</b> ${c.estado_cliente !== 'Activo' ? badge(c.estado_cliente) : ''}</p>
    <h2>Reservas</h2>
    <div class="list">${reservas.map(r => `
      <article class="item card">
        <div class="item-art">${carPhoto({ marca: r.marca, modelo: r.modelo, categoria: r.nombre_categoria, color: r.color }, { w: 320 })}</div>
        <div class="item-main">
          <div class="item-top"><b>${code('R', r.id_reserva)}</b>${badge(r.estado_reserva)}</div>
          <h3>${esc(r.marca)} ${esc(r.modelo)}</h3>
          <p class="specs">${fdate(r.fecha_inicio)} → ${fdate(r.fecha_fin)} · ${money(r.valor_estimado)}</p>
        </div>
        ${['Pendiente', 'Confirmada'].includes(r.estado_reserva) && new Date(r.fecha_inicio) > now
          ? `<button class="btn btn-ghost sm" data-cancel="${r.id_reserva}">Cancelar</button>` : ''}
      </article>`).join('') || '<p class="empty">No tienes reservas.</p>'}</div>
    <h2>Alquileres</h2>
    <div class="list">${alquileres.map(a => {
      const atrasado = a.estado_alquiler === 'Activo' && new Date(a.fecha_devolucion_programada) < now;
      const saldo = a.valor_total - a.pagado;
      return `<article class="item card">
        <div class="item-main">
          <div class="item-top"><b>${code('A', a.id_alquiler)}</b>${badge(atrasado ? 'Atrasado' : a.estado_alquiler)}</div>
          <h3>${esc(a.marca)} ${esc(a.modelo)} · ${esc(a.placa)}</h3>
          <p class="specs">Entrega ${fdate(a.fecha_entrega)} · Devolución ${fdate(a.fecha_devolucion_real || a.fecha_devolucion_programada)}</p>
        </div>
        <div class="item-money"><span>Total ${money(a.valor_total)}</span><span>Pagado ${money(a.pagado)}</span>${saldo > 0 ? `<b class="bad">Saldo ${money(saldo)}</b>` : '<b class="good">Al día</b>'}</div>
      </article>`;
    }).join('') || '<p class="empty">No tienes alquileres.</p>'}</div>`;
  $$('[data-cancel]', out).forEach(b => b.addEventListener('click', async () => {
    if (!await confirmDialog('Cancelar reserva', `¿Seguro que quieres cancelar la reserva ${code('R', b.dataset.cancel)}?`, 'Sí, cancelar')) return;
    try {
      await as(R, ({ q }) => q(`UPDATE reserva SET estado_reserva = 'Cancelada' WHERE id_reserva = $1 AND id_cliente = $2`, [Number(b.dataset.cancel), c.id_cliente]));
      toast('Reserva cancelada.');
      misReservas(view, params);
    } catch (ex) { toast(errorMessage(ex), 'bad'); }
  }));
}
