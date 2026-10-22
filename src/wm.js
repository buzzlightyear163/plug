// tiny window manager: draggable xp-style windows, dialogs, taskbar buttons
import { ding, click } from './sound.js';

export const ICONS = {
  error:
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><radialGradient id='g' cx='35%' cy='30%' r='75%'><stop offset='0' stop-color='#ff8a7a'/><stop offset='.55' stop-color='#e2251b'/><stop offset='1' stop-color='#9c0d06'/></radialGradient></defs><circle cx='16' cy='16' r='14.5' fill='url(#g)' stroke='#7a0a04'/><path d='M10.5 10.5l11 11M21.5 10.5l-11 11' stroke='#fff' stroke-width='3.4' stroke-linecap='round'/></svg>`
    ),
  info:
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><radialGradient id='g' cx='35%' cy='30%' r='75%'><stop offset='0' stop-color='#9cc8ff'/><stop offset='.55' stop-color='#2b6fe0'/><stop offset='1' stop-color='#123c9a'/></radialGradient></defs><circle cx='16' cy='16' r='14.5' fill='url(#g)' stroke='#0d2f7c'/><circle cx='16' cy='9.6' r='2.3' fill='#fff'/><rect x='13.9' y='13.4' width='4.2' height='11' rx='1.4' fill='#fff'/></svg>`
    ),
  warn: '/img/ico-warn.webp',
};

const layer = () => document.getElementById('windows');
const tasks = () => document.getElementById('tasks');
const wins = new Map();
let z = 20;
let cascade = 0;
const isMobile = () => window.matchMedia('(max-width: 720px)').matches;

export function openWindow(o) {
  const {
    id = null, title, icon = ICONS.info, width = 520, x, y,
    body, className = '', task = true, status, onClose, maximizable = true,
  } = o;
  if (id && wins.has(id)) {
    const w = wins.get(id);
    w.el.classList.remove('min');
    focus(w);
    return w;
  }
  const el = document.createElement('section');
  el.className = `win ${className}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  el.innerHTML = `
    <header class="win-title">
      <img class="win-ico" src="${icon}" alt="" draggable="false">
      <span class="win-name"></span>
      <div class="win-ctrls">
        ${task ? '<button class="wc wc-min" aria-label="minimize"><i></i></button>' : ''}
        ${task && maximizable ? '<button class="wc wc-max" aria-label="maximize"><i></i></button>' : ''}
        <button class="wc wc-close" aria-label="close"><i></i></button>
      </div>
    </header>
    <div class="win-body"></div>
    ${status !== undefined ? '<footer class="win-status"><span></span></footer>' : ''}`;
  el.querySelector('.win-name').textContent = title;
  const bodyEl = el.querySelector('.win-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);
  el.style.width = `${width}px`;
  layer().appendChild(el);

  const w = { id, el, body: bodyEl, task: null, onClose };
  w.setStatus = (t) => { const s = el.querySelector('.win-status span'); if (s) s.textContent = t; };
  if (status) w.setStatus(status);

  // position
  const vw = window.innerWidth, vh = window.innerHeight - 42;
  const r = el.getBoundingClientRect();
  const px = x ?? Math.max(8, (vw - r.width) / 2 - 80 + (cascade % 5) * 26);
  const py = y ?? Math.max(8, (vh - r.height) / 2 - 40 + (cascade % 5) * 22);
  cascade++;
  place(el, px, py);

  el.addEventListener('pointerdown', () => focus(w), true);
  el.querySelector('.wc-close').addEventListener('click', (e) => { e.stopPropagation(); click(); close(w); });
  el.querySelector('.wc-min')?.addEventListener('click', (e) => { e.stopPropagation(); click(); el.classList.add('min'); syncTasks(); });
  const toggleMax = () => { if (!maximizable) return; el.classList.toggle('max'); };
  el.querySelector('.wc-max')?.addEventListener('click', (e) => { e.stopPropagation(); click(); toggleMax(); });
  const head = el.querySelector('.win-title');
  head.addEventListener('dblclick', (e) => { if (!e.target.closest('.wc')) toggleMax(); });
  drag(head, el);

  if (task) {
    const b = document.createElement('button');
    b.className = 'task';
    b.innerHTML = `<img src="${icon}" alt=""><span></span>`;
    b.querySelector('span').textContent = title;
    b.addEventListener('click', () => {
      click();
      if (el.classList.contains('min')) { el.classList.remove('min'); focus(w); }
      else if (el.classList.contains('active')) { el.classList.add('min'); syncTasks(); }
      else focus(w);
    });
    tasks().appendChild(b);
    w.task = b;
  }
  if (id) wins.set(id, w);
  focus(w);
  requestAnimationFrame(() => el.classList.add('in'));
  return w;
}

function place(el, x, y) {
  const r = el.getBoundingClientRect();
  const maxX = window.innerWidth - Math.min(r.width, 160);
  const maxY = window.innerHeight - 42 - 34;
  el.style.left = `${Math.min(Math.max(x, -r.width + 140), maxX)}px`;
  el.style.top = `${Math.min(Math.max(y, 0), maxY)}px`;
}

function drag(handle, el) {
  let sx, sy, ox, oy, on = false;
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.wc') || isMobile() || el.classList.contains('max')) return;
    on = true; sx = e.clientX; sy = e.clientY;
    ox = el.offsetLeft; oy = el.offsetTop;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!on) return;
    place(el, ox + e.clientX - sx, oy + e.clientY - sy);
  });
  const end = () => { on = false; };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

export function focus(w) {
  document.querySelectorAll('.win.active').forEach((n) => n.classList.remove('active'));
  w.el.classList.add('active');
  w.el.style.zIndex = ++z;
  syncTasks();
}

function syncTasks() {
  for (const w of wins.values()) {
    if (!w.task) continue;
    w.task.classList.toggle('on', w.el.classList.contains('active') && !w.el.classList.contains('min'));
  }
}

export function close(w) {
  w.el.classList.add('out');
  w.task?.remove();
  if (w.id) wins.delete(w.id);
  setTimeout(() => w.el.remove(), 140);
  w.onClose?.();
}

export const openCount = () => document.querySelectorAll('.win:not(.out)').length;

// ── message box ──────────────────────────────────────────────
export function dialog({ title = 'error', kind = 'error', text, buttons = [{ label: 'OK' }], x, y, sound = true, width = 340 }) {
  const body = document.createElement('div');
  body.className = 'dlg-body';
  body.innerHTML = `<div class="dlg-row"><img class="dlg-ico" src="${ICONS[kind] || ICONS.info}" alt=""><p></p></div><div class="dlg-btns"></div>`;
  body.querySelector('p').innerHTML = text;
  const w = openWindow({ title, icon: ICONS[kind] || ICONS.info, body, task: false, className: 'dlg', width, x, y });
  const row = body.querySelector('.dlg-btns');
  buttons.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.className = 'xbtn' + (i === 0 ? ' def' : '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => { click(); const keep = b.action?.(w); if (keep !== true) close(w); });
    row.appendChild(btn);
  });
  if (sound) ding(kind);
  setTimeout(() => row.querySelector('button')?.focus({ preventScroll: true }), 60);
  return w;
}
