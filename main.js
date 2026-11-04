// Enrutador de Sanca Rent.
import { init, onProgress, errorMessage } from './db.js?v=7';
import { $, esc } from './ui.js?v=7';
import * as pub from './public.js?v=7';
import { admin, currentUser } from './admin.js?v=7';

const view = $('#view');
const loader = $('#loader'), loaderTxt = $('#loaderTxt');
onProgress(msg => { loaderTxt.textContent = msg || 'Listo'; });

const menuBtn = $('#menuBtn'), nav = $('#nav');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});

function parse() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(qs || '') };
}

let token = 0;
async function route() {
  const t = ++token;
  const { parts, params } = parse();
  const [a, b] = parts;
  nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false);
  document.querySelectorAll('#nav a').forEach(l => l.classList.toggle('on', l.dataset.nav === (a || 'inicio')));
  $('#staffLink').textContent = currentUser() ? 'Panel interno' : 'Personal';
  document.body.classList.toggle('is-admin', a === 'admin');
  try {
    await init();
    loader.hidden = true;
    if (t !== token) return;
    if (!a) await pub.home(view);
    else if (a === 'vehiculos') await pub.catalog(view, params);
    else if (a === 'reservar' && b) await pub.reservar(view, params, b);
    else if (a === 'reserva' && b) await pub.confirmacion(view, b);
    else if (a === 'mi-reserva') await pub.misReservas(view, params);
    else if (a === 'admin') await admin(view, b || 'panel', params);
    else view.innerHTML = `<section class="section"><div class="wrap"><h1>Página no encontrada</h1><p><a href="#/">Volver al inicio</a></p></div></section>`;
    if (!location.hash.includes('?') || a !== 'admin') window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    loader.hidden = true;
    view.innerHTML = `<section class="section"><div class="wrap"><div class="notice bad"><b>Algo salió mal.</b> ${esc(errorMessage(err))}</div>
      <p><button class="btn" onclick="location.reload()">Reintentar</button></p></div></section>`;
  }
}
window.addEventListener('hashchange', route);
route();
