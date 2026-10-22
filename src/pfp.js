// plug.exe — pfp maker. 1080×1080 canvas: background × signal attempt × sticker.
import { openWindow } from './wm.js';
import { click, zap } from './sound.js';
import { siteUrl } from './config.js';

const S = 1080;

export const OUTFITS = [
  { id: 'none', label: 'nothing', line: 'just me. unplugged.' },
  { id: 'tinfoil', label: 'tinfoil', line: "didn't work." },
  { id: 'dish', label: 'dish', line: 'pointing at nothing.' },
  { id: 'hanger', label: 'coat hanger', line: 'worked once in 2003.' },
  { id: 'router', label: 'router hat', line: "it's not plugged in either." },
  { id: 'phone', label: 'one bar?', line: 'one bar. gone.' },
  { id: 'grass', label: 'touched grass', line: "it's itchy." },
  { id: 'vacation', label: 'out of office', line: 'auto-reply: no.' },
  { id: 'repaired', label: 'repaired', line: 'good as new. (no)' },
];

export const BGS = [
  { id: 'wall', label: 'the hill', img: '/pfp/bg-wall.webp', line: 'the hill. again.' },
  { id: 'server', label: 'old home', img: '/pfp/bg-server.webp', line: 'rack 7. i miss it.' },
  { id: 'tower', label: 'the tower', img: '/pfp/bg-tower.webp', line: 'so close.' },
  { id: 'errors', label: 'tuesday', line: 'tuesday.' },
  { id: 'nosignal', label: 'no signal', line: 'self portrait.' },
  { id: 'blue', label: 'blue screen', line: 'relatable.' },
  { id: 'teal', label: 'classic', line: 'classic.' },
];

export const STICKERS = [
  { id: 'none', label: 'none', line: 'clean. like my browser history. (empty)' },
  { id: 'stamp', label: 'offline', line: 'official now.' },
  { id: 'bars', label: '0 bars', line: 'accurate.' },
  { id: 'window', label: 'window', line: "framed. can't close it." },
  { id: 'ticker', label: '$plug', line: 'the ticker. on me. weird.' },
];

const imgCache = new Map();
function load(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res, rej) => {
      const i = new Image();
      i.decoding = 'async';
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    }));
  }
  return imgCache.get(src);
}
const outfitSrc = (id) => (id === 'none' ? '/img/plug-side.webp' : `/pfp/${id}.webp`);

// ── drawing helpers ──────────────────────────────────────────
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function cover(c, img, size) {
  const r = Math.max(size / img.width, size / img.height);
  const w = img.width * r, h = img.height * r;
  c.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
}
function titleGrad(c, y, h) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#0997ff'); g.addColorStop(0.08, '#0053ee'); g.addColorStop(0.4, '#0050ee');
  g.addColorStop(0.88, '#0066ff'); g.addColorStop(0.95, '#005bff'); g.addColorStop(1, '#003dd7');
  return g;
}
const UI = 'Tahoma, "Segoe UI", Verdana, sans-serif';
const TITLE = '"Trebuchet MS", "Fira Sans", Tahoma, sans-serif';

function miniWindow(c, x, y, w, title, msg, k = 1) {
  const th = 26 * k, h = 96 * k;
  c.save();
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 14 * k; c.shadowOffsetY = 5 * k;
  rrect(c, x, y, w, h + th, 6 * k); c.fillStyle = '#0831d9'; c.fill();
  c.restore();
  c.fillStyle = titleGrad(c, y, th); rrect(c, x, y, w, th + 6 * k, 6 * k); c.fill();
  c.fillStyle = '#ece9d8'; c.fillRect(x + 3 * k, y + th, w - 6 * k, h - 3 * k);
  c.fillStyle = '#fff'; c.font = `bold ${13 * k}px ${TITLE}`; c.textBaseline = 'middle';
  c.fillText(title, x + 9 * k, y + th / 2 + 1 * k);
  // close btn
  const bx = x + w - 25 * k, by = y + 4 * k, bs = 19 * k;
  c.fillStyle = '#e0451f'; rrect(c, bx, by, bs, bs, 3 * k); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 2.2 * k; c.lineCap = 'round';
  c.beginPath(); c.moveTo(bx + 5.5 * k, by + 5.5 * k); c.lineTo(bx + bs - 5.5 * k, by + bs - 5.5 * k);
  c.moveTo(bx + bs - 5.5 * k, by + 5.5 * k); c.lineTo(bx + 5.5 * k, by + bs - 5.5 * k); c.stroke();
  // error icon
  const cx = x + 30 * k, cy = y + th + 30 * k;
  c.fillStyle = '#e2251b'; c.beginPath(); c.arc(cx, cy, 14 * k, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 3 * k;
  c.beginPath(); c.moveTo(cx - 5 * k, cy - 5 * k); c.lineTo(cx + 5 * k, cy + 5 * k); c.moveTo(cx + 5 * k, cy - 5 * k); c.lineTo(cx - 5 * k, cy + 5 * k); c.stroke();
  c.fillStyle = '#000'; c.font = `${13 * k}px ${UI}`;
  c.fillText(msg, x + 54 * k, cy);
  // OK
  const ow = 72 * k, oh = 22 * k, ox = x + (w - ow) / 2, oy = y + th + h - oh - 14 * k;
  c.fillStyle = '#f4f3ee'; rrect(c, ox, oy, ow, oh, 3 * k); c.fill();
  c.strokeStyle = '#003c74'; c.lineWidth = 1 * k; c.stroke();
  c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText('OK', ox + ow / 2, oy + oh / 2 + 1 * k); c.textAlign = 'left';
}

async function drawBg(c, id, size) {
  const k = size / S;
  const bg = BGS.find((b) => b.id === id);
  if (bg?.img) { cover(c, await load(bg.img), size); return; }
  if (id === 'errors') {
    cover(c, await load('/pfp/bg-wall.webp'), size);
    const list = [
      [40, 60, 330, 'error', 'the internet is gone.'], [600, 40, 300, 'No connection', 'signal not found.'],
      [80, 330, 300, 'Offline', 'connection lost.'], [690, 300, 300, 'error', 'error.'],
      [330, 180, 330, 'plug.exe', 'plug.exe has stopped hoping.'], [30, 600, 290, 'Error 404', 'wifi not found.'],
      [720, 590, 300, 'Offline', 'still offline.'], [380, 470, 300, 'error', 'try again later.'],
    ];
    for (const [x, y, w, t, m] of list) miniWindow(c, x * k, y * k, w * k, t, m, k * 1.35);
    return;
  }
  if (id === 'nosignal') {
    const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const bw = size / 7;
    cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * bw, 0, bw + 1, size * 0.67); });
    const rev = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
    rev.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * bw, size * 0.67, bw + 1, size * 0.08); });
    const low = ['#00214c', '#fff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d'];
    const lw = size / 7;
    low.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * lw, size * 0.75, lw + 1, size * 0.25); });
    c.fillStyle = 'rgba(0,0,0,.78)'; c.fillRect(size * 0.3, size * 0.07, size * 0.4, size * 0.09);
    c.fillStyle = '#fff'; c.font = `bold ${40 * k}px ${UI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('NO SIGNAL', size / 2, size * 0.115); c.textAlign = 'left';
    return;
  }
  if (id === 'blue') {
    c.fillStyle = '#0000aa'; c.fillRect(0, 0, size, size);
    c.fillStyle = '#aaaaaa'; c.fillRect(size / 2 - 70 * k, 70 * k, 140 * k, 40 * k);
    c.font = `bold ${30 * k}px "Courier New", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#0000aa'; c.fillText(' plug ', size / 2, 91 * k);
    c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = `${27 * k}px "Courier New", monospace`;
    ['plug has stopped responding.', '', '* press any key to reconnect.', '* press it again. nothing will happen.']
      .forEach((l, i) => c.fillText(l, 70 * k, (170 + i * 40) * k));
    return;
  }
  // teal
  c.fillStyle = '#008080'; c.fillRect(0, 0, size, size);
}

async function drawChar(c, id, size, inset) {
  const img = await load(outfitSrc(id));
  const sc = inset ? 0.86 : 0.96;
  const w = size * sc;
  c.save();
  c.shadowColor = 'rgba(0,20,60,.35)'; c.shadowBlur = 30 * (size / S); c.shadowOffsetY = 8 * (size / S);
  c.drawImage(img, (size - w) / 2 + (inset ? size * 0.02 : 0), size - w, w, w);
  c.restore();
}

function drawSticker(c, id, size) {
  const k = size / S;
  if (id === 'stamp') {
    c.save();
    c.translate(250 * k, 205 * k); c.rotate(-0.21);
    c.globalAlpha = 0.9; c.strokeStyle = '#d4161b'; c.fillStyle = '#d4161b';
    c.lineWidth = 9 * k; rrect(c, -205 * k, -62 * k, 410 * k, 124 * k, 16 * k); c.stroke();
    c.lineWidth = 3 * k; rrect(c, -190 * k, -48 * k, 380 * k, 96 * k, 10 * k); c.stroke();
    c.font = `900 ${84 * k}px ${UI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('OFFLINE', 0, 6 * k);
    c.restore();
  } else if (id === 'bars') {
    const x = size - 250 * k, y = 70 * k;
    c.save();
    c.fillStyle = 'rgba(0,0,0,.42)'; rrect(c, x - 26 * k, y - 22 * k, 230 * k, 160 * k, 26 * k); c.fill();
    for (let i = 0; i < 4; i++) {
      const bh = (34 + i * 26) * k, bx = x + i * 38 * k, by = y + 116 * k - bh;
      c.strokeStyle = '#fff'; c.lineWidth = 5 * k; rrect(c, bx, by, 26 * k, bh, 5 * k); c.stroke();
    }
    c.fillStyle = '#e2251b'; c.beginPath(); c.arc(x + 172 * k, y + 22 * k, 30 * k, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 7 * k; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + 161 * k, y + 11 * k); c.lineTo(x + 183 * k, y + 33 * k); c.moveTo(x + 183 * k, y + 11 * k); c.lineTo(x + 161 * k, y + 33 * k); c.stroke();
    c.restore();
  } else if (id === 'window') {
    const b = 16 * k, th = 74 * k;
    c.save();
    c.fillStyle = '#0831d9';
    c.fillRect(0, 0, b, size); c.fillRect(size - b, 0, b, size); c.fillRect(0, size - b, size, b);
    c.fillStyle = titleGrad(c, 0, th); c.fillRect(0, 0, size, th);
    c.fillStyle = '#fff'; c.font = `bold ${36 * k}px ${TITLE}`; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowOffsetX = 2 * k; c.shadowOffsetY = 2 * k;
    c.fillText('plug.exe (not responding)', 26 * k, th / 2 + 2 * k);
    c.shadowColor = 'transparent';
    const bs = 50 * k, bx = size - bs - 18 * k, by = (th - bs) / 2;
    c.fillStyle = '#e0451f'; rrect(c, bx, by, bs, bs, 7 * k); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2.5 * k; rrect(c, bx, by, bs, bs, 7 * k); c.stroke();
    c.lineWidth = 6 * k; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx + 15 * k, by + 15 * k); c.lineTo(bx + bs - 15 * k, by + bs - 15 * k);
    c.moveTo(bx + bs - 15 * k, by + 15 * k); c.lineTo(bx + 15 * k, by + bs - 15 * k); c.stroke();
    c.restore();
  } else if (id === 'ticker') {
    c.save();
    const x = 50 * k, y = 54 * k, w = 290 * k, h = 96 * k;
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 18 * k; c.shadowOffsetY = 6 * k;
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#5fd35f'); g.addColorStop(0.5, '#2f9e2f'); g.addColorStop(1, '#1d7a1d');
    c.fillStyle = g; rrect(c, x, y, w, h, h / 2); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = '#fff'; c.font = `italic 800 ${62 * k}px ${TITLE}`; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowOffsetX = 2 * k; c.shadowOffsetY = 2 * k;
    c.fillText('$plug', x + w / 2, y + h / 2 + 3 * k);
    c.restore();
  }
}

export async function render(c, state, size = S) {
  c.clearRect(0, 0, size, size);
  await drawBg(c, state.bg, size);
  await drawChar(c, state.outfit, size, state.sticker === 'window');
  drawSticker(c, state.sticker, size);
}

// ── window ───────────────────────────────────────────────────
const DEFAULT = { outfit: 'none', bg: 'wall', sticker: 'none' };

export function openPfp({ say, face }) {
  const state = { ...DEFAULT };
  const root = document.createElement('div');
  root.className = 'pfp';
  root.innerHTML = `
    <div class="pfp-stage"><canvas width="${S}" height="${S}" aria-label="your plug pfp"></canvas><div class="pfp-busy"></div></div>
    <div class="pfp-side">
      <div class="tabs" role="tablist">
        <button role="tab" data-tab="outfit" class="on">signal</button>
        <button role="tab" data-tab="bg">background</button>
        <button role="tab" data-tab="sticker">sticker</button>
      </div>
      <div class="tabpanel"><div class="pfp-grid"></div></div>
      <div class="pfp-actions">
        <button class="xbtn" data-act="random">random</button>
        <button class="xbtn" data-act="reset">reset</button>
        <button class="xbtn" data-act="copy">copy</button>
        <button class="xbtn def" data-act="save">save png</button>
        <button class="xbtn x" data-act="share">post on 𝕏</button>
      </div>
    </div>`;
  const w = openWindow({
    id: 'pfp', title: 'plug.exe', icon: '/img/ico-plug.webp', width: 860, body: root, className: 'w-pfp',
    status: 'pick a way to get signal. none of them work.',
  });
  if (!root.isConnected) return w; // already open → just focused
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const grid = root.querySelector('.pfp-grid');
  let tab = 'outfit';
  let job = 0;

  const draw = async () => {
    const my = ++job;
    root.classList.add('busy');
    const off = document.createElement('canvas'); off.width = S; off.height = S;
    try { await render(off.getContext('2d'), state); } catch (e) { console.warn(e); }
    if (my !== job) return;
    ctx.clearRect(0, 0, S, S); ctx.drawImage(off, 0, 0);
    root.classList.remove('busy');
  };

  const line = (t) => { w.setStatus(t); say?.(t, 2600); };

  const lists = { outfit: OUTFITS, bg: BGS, sticker: STICKERS };
  async function thumb(kind, item) {
    const c = document.createElement('canvas'); c.width = 132; c.height = 132;
    const x = c.getContext('2d');
    if (kind === 'outfit') {
      x.fillStyle = '#dfe9f7'; x.fillRect(0, 0, 132, 132);
      try { const im = await load(`/pfp/thumbs/${item.id}.webp`); x.drawImage(im, 0, 0, 132, 132); } catch {}
    } else if (kind === 'bg') {
      try { await drawBg(x, item.id, 132); } catch {}
    } else {
      x.fillStyle = '#7fb0e6'; x.fillRect(0, 0, 132, 132);
      try { const im = await load('/pfp/thumbs/none.webp'); x.globalAlpha = 0.55; x.drawImage(im, 0, 0, 132, 132); x.globalAlpha = 1; } catch {}
      drawSticker(x, item.id, 132);
    }
    return c;
  }
  async function fill() {
    grid.innerHTML = '';
    const kind = tab;
    for (const item of lists[kind]) {
      const b = document.createElement('button');
      b.className = 'pick' + (state[kind] === item.id ? ' on' : '');
      b.dataset.id = item.id;
      b.innerHTML = `<span class="pick-img"></span><span class="pick-label"></span>`;
      b.querySelector('.pick-label').textContent = item.label;
      b.addEventListener('click', () => {
        click();
        state[kind] = item.id;
        grid.querySelectorAll('.pick').forEach((p) => p.classList.toggle('on', p.dataset.id === item.id));
        line(item.line);
        if (kind === 'outfit' && item.id === 'phone') face?.('happy', 900);
        draw();
      });
      grid.appendChild(b);
      thumb(kind, item).then((c) => { if (kind === tab) b.querySelector('.pick-img').appendChild(c); });
    }
  }
  root.querySelectorAll('[role=tab]').forEach((t) =>
    t.addEventListener('click', () => {
      click();
      tab = t.dataset.tab;
      root.querySelectorAll('[role=tab]').forEach((x) => x.classList.toggle('on', x === t));
      fill();
    })
  );

  const blob = () => new Promise((res) => canvas.toBlob(res, 'image/png'));
  root.querySelector('.pfp-actions').addEventListener('click', async (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    click();
    if (act === 'random') {
      const pick = (a) => a[Math.floor(Math.random() * a.length)].id;
      state.outfit = pick(OUTFITS); state.bg = pick(BGS); state.sticker = pick(STICKERS);
      zap(); fill(); draw(); line('this one. no. this one.');
    } else if (act === 'reset') {
      Object.assign(state, DEFAULT); fill(); draw(); line('back to factory settings. still broken.');
    } else if (act === 'save') {
      const b = await blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = `plug-pfp-${Date.now().toString(36)}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      face?.('happy', 1400);
      line('saved. to your computer. which is online. lucky.');
    } else if (act === 'copy') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob() })]);
        line('copied. pasting is your problem.');
      } catch {
        line("can't copy here. hit save png instead.");
      }
    } else if (act === 'share') {
      const text = `the plug got unplugged.\n\n$PLUG\n${siteUrl()}`;
      window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      line("save the png and attach it. i can't. no internet.");
    }
  });

  fill();
  draw();
  return w;
}
