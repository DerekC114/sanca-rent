// Utilidades de interfaz de Sanca Rent.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Formatos ---------- */
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const money = v => COP.format(Number(v || 0));
export const num = v => Number(v || 0).toLocaleString('es-CO');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const p2 = n => String(n).padStart(2, '0');

// PostgreSQL devuelve TIMESTAMP (sin zona) como Date en UTC: se leen con getters UTC para conservar la hora registrada.
export function fdate(d, withTime = true) {
  if (!d) return '—';
  if (typeof d === 'string') d = parseLocal(d);
  const s = `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withTime ? `${s}, ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}` : s;
}
/** 'YYYY-MM-DDTHH:MM' → Date en UTC con la misma hora de pared. */
export function parseLocal(s) {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return new Date(NaN);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)));
}
/** Date (UTC de pared) → 'YYYY-MM-DDTHH:MM' para inputs y parámetros SQL. */
export const toInput = d => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
export const toSql = s => String(s).replace('T', ' ');
/** Hora local del navegador como Date de pared. */
export function nowWall() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes()));
}
export function addDays(d, days, hour) {
  const r = new Date(d.getTime() + days * 864e5);
  if (hour != null) r.setUTCHours(hour, 0, 0, 0);
  return r;
}
/** Días cobrados: cada 24 h o fracción, mínimo 1. */
export const rentalDays = (a, b) => Math.max(1, Math.ceil((parseLocal(b) - parseLocal(a)) / 864e5));

/* ---------- Estados ---------- */
const TONE = {
  Disponible: 'ok', Activo: 'ok', Activa: 'ok', Confirmada: 'ok', Aprobado: 'ok', Finalizado: 'muted', Cumplida: 'muted',
  Reservado: 'info', Pendiente: 'warn', Programado: 'info', 'En proceso': 'warn',
  Alquilado: 'info', 'En mantenimiento': 'warn', Atrasado: 'bad', 'Fuera de servicio': 'bad',
  Cancelada: 'muted', Cancelado: 'muted', Vencida: 'muted', Rechazado: 'bad', Anulado: 'muted', Inactivo: 'muted', Bloqueado: 'bad',
};
export const badge = s => `<span class="badge t-${TONE[s] || 'muted'}">${esc(s)}</span>`;
export const code = (prefix, id) => `${prefix}-${String(id).padStart(5, '0')}`;

/* ---------- Ilustración de vehículos ---------- */
const COLORS = { blanco: '#f4f4f1', gris: '#8a9099', negro: '#2b2e34', rojo: '#c7372f', azul: '#2f5ea8', plata: '#c4c9cf', verde: '#2f7d55', amarillo: '#e7b52c' };
const SHAPES = {
  Compacto: { body: 'M24 80 L24 66 Q24 60 32 58 L64 54 L88 35 Q93 31 101 31 L162 31 Q171 31 175 39 L190 58 Q200 60 202 68 L202 80 Z', win: ['M95 38 L74 54 L126 54 L126 38 Z', 'M132 38 L132 54 L182 54 L170 40 Q168 38 163 38 Z'], w: [64, 170] },
  Sedan: { body: 'M16 80 L16 68 Q16 61 26 59 L68 55 L94 37 Q99 33 107 33 L150 33 Q158 33 164 39 L186 55 L214 59 Q224 61 224 70 L224 80 Z', win: ['M101 40 L80 55 L126 55 L126 40 Z', 'M132 40 L132 55 L178 55 L158 41 Q156 40 151 40 Z'], w: [62, 182] },
  SUV: { body: 'M18 80 L18 60 Q18 53 27 51 L60 47 L82 25 Q86 21 94 21 L190 21 Q198 21 202 29 L212 48 Q222 50 222 60 L222 80 Z', win: ['M90 29 L68 47 L128 47 L128 29 Z', 'M134 29 L134 47 L172 47 L172 29 Z', 'M178 29 L178 47 L205 47 L197 31 Q196 29 192 29 Z'], w: [62, 180] },
  Camioneta: { body: 'M14 80 L14 60 Q14 53 23 51 L56 47 L78 25 Q82 21 90 21 L132 21 Q138 21 138 27 L138 50 L224 50 Q228 50 228 54 L228 80 Z', win: ['M86 29 L64 47 L104 47 L104 29 Z', 'M110 29 L110 47 L131 47 L131 29 Z'], w: [58, 188] },
};
export function carSvg(categoria, color, label = '') {
  const s = SHAPES[categoria] || SHAPES.Sedan;
  const fill = COLORS[String(color).toLowerCase()] || '#9aa0a8';
  return `<svg class="car" viewBox="0 0 240 104" role="img" aria-label="${esc(label)}">
    <ellipse cx="120" cy="96" rx="104" ry="5" class="car-shadow"/>
    <path d="${s.body}" fill="${fill}" class="car-body"/>
    ${s.win.map(w => `<path d="${w}" class="car-win"/>`).join('')}
    <rect x="${s.w[0] - 22}" y="70" width="${s.w[1] - s.w[0] + 44}" height="4" class="car-trim"/>
    ${s.w.map(x => `<circle cx="${x}" cy="80" r="15" class="car-tire"/><circle cx="${x}" cy="80" r="7" class="car-rim"/>`).join('')}
  </svg>`;
}


/* ---------- Fotos reales (Wikimedia Commons, licencias libres) ---------- */
const PHOTOS = {
  'renault sandero': 'Renault_Sandero_R.S._2020_-_BugWarp_01.jpg',
  'chevrolet onix': 'Chevrolet_Onix_(second_generation,_front_view).jpg',
  'toyota corolla': 'Toyota_Corolla_sedan_E210_hydrid.jpg',
  'mazda mazda 3': 'Mazda3_SEDAN_20S_L_Package_2WD_(5BA-BPFP)_left.jpg',
  'kia sportage': 'Kia_Sportage_(NQ5)_1X7A0326_(edited).jpg',
  'renault duster': 'Renault_Duster_Mexico.jpg',
  'toyota hilux': '2021_Toyota_Hilux_Revo_Prerunner_Double-Cab_2.4_Mid.jpg',
  'ford ranger': '2023_Ford_Ranger_XLS.jpg',
  'kia picanto': 'Kia_Picanto_X-Line_facelift_001.jpg',
  'nissan versa': '2023_Nissan_Versa_(N18)_IMG_3105.jpg',
  'hyundai tucson': 'Hyundai_Tucson_(NX4,_SWB)_IMG_9135.jpg',
  'mercedes-benz clase g 63 amg': 'Mercedes-AMG_G_63_(W464)_front.jpg',
  'lamborghini revuelto': 'Lamborghini_Revuelto_Opera_Unica_001.jpg',
  'lamborghini urus se': 'Lamborghini_Urus_SE_DSC_8524.jpg',
};
// Foto representativa de cada categoría (para las tarjetas del inicio)
const CAT_PHOTO = { Compacto: 'kia picanto', Sedan: 'toyota corolla', SUV: 'hyundai tucson', Camioneta: 'toyota hilux', Lujo: 'lamborghini revuelto' };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
export function photoFile(marca, modelo) {
  const k = norm(`${marca} ${modelo}`);
  return PHOTOS[k] || PHOTOS[norm(modelo)] || Object.entries(PHOTOS).find(([n]) => k.includes(n.split(' ').slice(1).join(' ')))?.[1] || null;
}
export const photoPage = f => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;
const photoUrl = (f, w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=${w}`;
/**
 * Foto real del vehículo con el dibujo como respaldo si la imagen no carga.
 */
export function carPhoto({ marca, modelo, categoria, color }, { w = 640, credit = false } = {}) {
  const label = `${marca || ''} ${modelo || ''}`.trim();
  const f = photoFile(marca, modelo);
  const svg = carSvg(categoria, color, label);
  if (!f) return `<div class="photo nophoto">${svg}</div>`;
  return `<div class="photo">
    <img src="${photoUrl(f, w)}" alt="${esc(label)}" title="${esc(label)} · Foto: Wikimedia Commons" loading="lazy" decoding="async"
      onerror="this.parentNode.classList.add('nophoto')">
    ${svg}
    ${credit ? `<a class="credit" href="${photoPage(f)}" target="_blank" rel="noopener">Foto: Wikimedia Commons</a>` : ''}
  </div>`;
}
export function categoryPhoto(categoria) {
  const [marca, ...rest] = (CAT_PHOTO[categoria] || '').split(' ');
  return carPhoto({ marca, modelo: rest.join(' '), categoria, color: 'Plata' }, { w: 480 });
}


/* ---------- Validación de datos del cliente ---------- */
const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const RE_NOMBRE = new RegExp(`^[${LETRAS}]([${LETRAS}' -]*[${LETRAS}])?$`);
const DOC_HINT = {
  Cedula: 'Solo números, de 6 a 10 dígitos.',
  'Cedula extranjeria': 'Letras y números, de 6 a 12 caracteres.',
  Pasaporte: 'Letras y números, de 6 a 12 caracteres.',
};
const isoDate = d => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;

/**
 * Aplica restricciones a un formulario con campos de cliente:
 * limpia lo que se escribe, valida cada campo y muestra el mensaje bajo él.
 * opts.licenciaMin: fecha (Date de pared) desde la que la licencia debe estar vigente.
 */
export function clientRules(form, { licenciaMin } = {}) {
  const el = n => form.elements[n];
  const tipo = () => (el('tipo_documento') ? el('tipo_documento').value : 'Cedula');
  const minLic = licenciaMin || nowWall();
  const RULES = {
    numero_documento: {
      clean: v => tipo() === 'Cedula' ? v.replace(/\D/g, '').slice(0, 10) : v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
      check: v => !v ? 'Escribe el número de documento.'
        : tipo() === 'Cedula' ? (/^\d{6,10}$/.test(v) ? '' : 'La cédula debe tener solo números, entre 6 y 10 dígitos.')
        : (/^[A-Z0-9]{6,12}$/.test(v) ? '' : 'Debe tener entre 6 y 12 letras o números.'),
    },
    nombres: {
      clean: v => v.replace(new RegExp(`[^${LETRAS}' -]`, 'g'), '').replace(/\s{2,}/g, ' ').slice(0, 60),
      check: v => !v.trim() ? 'Escribe tus nombres.' : v.trim().length < 2 ? 'Debe tener al menos 2 letras.' : !RE_NOMBRE.test(v.trim()) ? 'Usa solo letras (sin números ni símbolos).' : '',
    },
    apellidos: {
      clean: v => v.replace(new RegExp(`[^${LETRAS}' -]`, 'g'), '').replace(/\s{2,}/g, ' ').slice(0, 60),
      check: v => !v.trim() ? 'Escribe tus apellidos.' : v.trim().length < 2 ? 'Debe tener al menos 2 letras.' : !RE_NOMBRE.test(v.trim()) ? 'Usa solo letras (sin números ni símbolos).' : '',
    },
    telefono: {
      clean: v => v.replace(/\D/g, '').slice(0, 10),
      check: v => !v ? 'Escribe un teléfono.' : /^(3\d{9}|60\d{8})$/.test(v) ? '' : 'Debe tener 10 dígitos: celular que empiece por 3 o fijo que empiece por 60.',
    },
    correo_electronico: {
      clean: v => v.replace(/\s/g, '').slice(0, 100),
      check: v => !v ? 'Escribe tu correo.' : /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v) ? '' : 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    },
    numero_licencia: {
      clean: v => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30),
      check: v => !v ? 'Escribe el número de la licencia.' : /^[A-Z0-9-]{5,30}$/.test(v) ? '' : 'Entre 5 y 30 letras, números o guiones.',
    },
    fecha_vencimiento_licencia: {
      check: v => {
        if (!v) return 'Indica la fecha de vencimiento de la licencia.';
        const d = parseLocal(v);
        if (isNaN(d)) return 'Fecha no válida.';
        if (d < parseLocal(isoDate(minLic))) return licenciaMin ? 'La licencia vence antes de terminar la reserva; debe estar vigente durante todo el alquiler.' : 'La licencia está vencida.';
        if (d > addDays(nowWall(), 365 * 15)) return 'La fecha es demasiado lejana.';
        return '';
      },
    },
    direccion: {
      clean: v => v.replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ#°.,\-/ ]/g, '').replace(/\s{2,}/g, ' ').slice(0, 150),
      check: v => v.trim() && v.trim().length < 3 ? 'La dirección es muy corta.' : '',
    },
  };
  const ATTRS = {
    numero_documento: () => tipo() === 'Cedula' ? { inputmode: 'numeric', maxlength: 10 } : { inputmode: 'text', maxlength: 12 },
    telefono: () => ({ inputmode: 'numeric', maxlength: 10 }),
    numero_licencia: () => ({ maxlength: 30 }),
  };
  const msgEl = input => {
    let m = input.closest('.field').querySelector('.field-msg');
    if (!m) { m = document.createElement('small'); m.className = 'field-msg'; m.setAttribute('aria-live', 'polite'); input.closest('.field').appendChild(m); }
    return m;
  };
  const validate = (name, show) => {
    const input = el(name), r = RULES[name];
    if (!input || input.disabled || input.readOnly) return true;
    const msg = r.check(input.value);
    input.setCustomValidity(msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (show || input.dataset.touched) { msgEl(input).textContent = msg; input.closest('.field').classList.toggle('has-error', !!msg); }
    return !msg;
  };
  const applyAttrs = () => Object.entries(ATTRS).forEach(([n, f]) => { const i = el(n); if (i) Object.entries(f()).forEach(([k, v]) => i.setAttribute(k, v)); });
  applyAttrs();
  let pressing = false;
  form.addEventListener('pointerdown', e => { if (e.target.closest('button')) { pressing = true; setTimeout(() => { pressing = false; }, 600); } });
  const lic = el('fecha_vencimiento_licencia');
  if (lic) { lic.min = isoDate(minLic); lic.max = isoDate(addDays(nowWall(), 365 * 15)); }
  Object.keys(RULES).forEach(name => {
    const input = el(name);
    if (!input) return;
    const r = RULES[name];
    input.addEventListener('input', () => {
      if (r.clean) {
        const pos = input.selectionStart, before = input.value, after = r.clean(before);
        if (after !== before) { input.value = after; try { input.setSelectionRange(pos - (before.length - after.length), pos - (before.length - after.length)); } catch { /* fechas */ } }
      }
      validate(name);
    });
    input.addEventListener('blur', e => {
      if (input.value && ['nombres', 'apellidos', 'direccion'].includes(name)) input.value = input.value.trim();
      input.dataset.touched = '1';
      // Si el foco se va porque se está pulsando un botón, no se muestra el mensaje ahora:
      // haría saltar el botón y el clic se perdería. El envío valida y muestra todo.
      const t = e.relatedTarget;
      if (pressing || (t && t.tagName === 'BUTTON')) return;
      validate(name, true);
    });
    validate(name);
  });
  const tipoSel = el('tipo_documento');
  if (tipoSel) tipoSel.addEventListener('change', () => {
    const doc = el('numero_documento');
    applyAttrs();
    doc.value = RULES.numero_documento.clean(doc.value);
    const hint = doc.closest('.field').querySelector('small:not(.field-msg)');
    if (hint) hint.textContent = DOC_HINT[tipoSel.value];
    validate('numero_documento', !!doc.value);
  });
  /** Valida todo y muestra los mensajes; devuelve true si el formulario es válido. */
  return () => {
    let ok = true, first = null;
    Object.keys(RULES).forEach(n => { const i = el(n); if (i) i.dataset.touched = '1'; if (!validate(n, true)) { ok = false; first = first || i; } });
    if (first) first.focus();
    return ok;
  };
}
export const docHint = t => DOC_HINT[t] || DOC_HINT.Cedula;

/* ---------- Avisos ---------- */
export function toast(msg, tone = 'ok') {
  let box = $('#toasts');
  const t = document.createElement('div');
  t.className = `toast t-${tone}`;
  t.setAttribute('role', tone === 'bad' ? 'alert' : 'status');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, tone === 'bad' ? 6000 : 3500);
}

/* ---------- Modal con formulario ---------- */
/**
 * Abre un modal. `body` es HTML con campos; `onSubmit(data, form)` puede lanzar un error para mostrarlo.
 * Devuelve una promesa que se resuelve cuando el modal se cierra.
 */
export function modal({ title, body, submit = 'Guardar', onSubmit, onOpen, wide = false }) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'modal' + (wide ? ' wide' : '');
    dlg.innerHTML = `<form method="dialog" novalidate>
      <header><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></header>
      <div class="modal-body">${body}<p class="form-error" role="alert" hidden></p></div>
      ${onSubmit ? `<footer><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${esc(submit)}</button></footer>` : ''}
    </form>`;
    document.body.appendChild(dlg);
    const form = $('form', dlg), err = $('.form-error', dlg);
    const close = v => { dlg.close(); dlg.remove(); resolve(v); };
    $$('[data-close]', dlg).forEach(b => b.addEventListener('click', () => close(null)));
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    const extraCheck = onOpen ? onOpen(form) : null;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!onSubmit) return close(null);
      if (typeof extraCheck === 'function' && !extraCheck()) return;
      if (!form.reportValidity()) return;
      const btn = $('button[type=submit]', form);
      btn.disabled = true; err.hidden = true;
      try { const r = await onSubmit(formData(form), form); close(r ?? true); }
      catch (ex) { err.textContent = ex.message || String(ex); err.hidden = false; btn.disabled = false; }
    });
    dlg.showModal();
    const first = $('input:not([type=hidden]):not([readonly]), select, textarea', dlg);
    if (first) first.focus();
  });
}
export function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}
export const confirmDialog = (title, text, submit = 'Confirmar') =>
  modal({ title, body: `<p>${text}</p>`, submit, onSubmit: async () => true });

/** Campo de formulario. */
export function field(label, input, hint = '') {
  return `<label class="field"><span>${esc(label)}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
}
export const options = (list, sel) => list.map(o => {
  const [v, t] = Array.isArray(o) ? o : [o, o];
  return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`;
}).join('');

/** Tabla de datos simple. cols: [{h, f(row) => html, cls}] */
export function table(cols, rows, empty = 'No hay registros.') {
  if (!rows.length) return `<p class="empty">${esc(empty)}</p>`;
  return `<div class="table-wrap"><table class="data"><thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${esc(c.h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.cls || ''}" data-h="${esc(c.h)}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
