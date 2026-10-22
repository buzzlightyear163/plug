import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/fira-sans/latin-700.css';
import './style.css';
import { CONFIG, buyUrl, chartUrl, siteUrl } from './config.js';
import * as snd from './sound.js';
import { openWindow, dialog, openCount, ICONS } from './wm.js';
import { openPfp } from './pfp.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const isMobile = () => window.matchMedia('(max-width: 720px)').matches;

// ── links ───────────────────────────────────────────────────
const LINKS = {
  buy: () => buyUrl(),
  chart: () => chartUrl(),
  x: () => CONFIG.x,
  telegram: () => CONFIG.telegram,
};
const SOON = {
  buy: "no ca yet. he's looking for wifi.",
  chart: 'no chart yet. nothing to look at. like his router.',
  x: 'x account: soon. he has to get online first.',
  telegram: 'telegram: soon. he has no signal.',
};
function wireLinks(root = document) {
  $$('[data-link]', root).forEach((a) => {
    const k = a.dataset.link;
    const url = LINKS[k]?.();
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.classList.remove('soon'); }
    else { a.removeAttribute('href'); a.classList.add('soon'); }
    if (a.dataset.wired) return;
    a.dataset.wired = '1';
    a.addEventListener('click', (e) => {
      snd.click();
      closeStart();
      if (!LINKS[k]?.()) { e.preventDefault(); dialog({ title: k, kind: 'info', text: SOON[k] }); return; }
      if (k === 'buy') { face('happy', 2600); say('finally. a connection.', 2600); }
    });
  });
}

// ── boot ────────────────────────────────────────────────────
const boot = $('#boot');
const desktop = $('#desktop');
const bootMsg = $('#bootMsg');
const faces = { sleep: $('#faceSleep'), happy: $('#faceHappy'), side: $('#faceSide') };
const bootFace = (k) => Object.entries(faces).forEach(([n, el]) => el.classList.toggle('off', n !== k));

const PRELOAD = [
  isMobile() ? '/img/wall-sm.webp' : '/img/wall.webp',
  '/img/plug-side.webp', '/img/plug-happy.webp', '/img/plug-sleep.webp',
  '/img/ico-plug.webp', '/img/ico-folder.webp', '/img/ico-notepad.webp', '/img/ico-network.webp',
  '/img/ico-bin.webp', '/img/ico-warn.webp',
];
function preload() {
  let done = 0;
  const one = (src) => new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = () => { done++; res(); };
    i.src = src;
  });
  const fonts = document.fonts?.load ? Promise.all([
    document.fonts.load('600 20px Caveat'), document.fonts.load('700 20px Caveat'), document.fonts.load('700 20px "Fira Sans"'),
  ]).catch(() => {}) : Promise.resolve();
  return Promise.all([...PRELOAD.map(one), fonts, sleep(1500)]);
}

let entered = false;
let skipping = false;
async function enter() {
  if (entered) return;
  entered = true;
  $('#plugIn').hidden = true;
  $('#bootHint').hidden = true;
  $('#skip').hidden = false;
  boot.classList.add('dialing');
  snd.initAudio();
  const dur = snd.dialup();
  const steps = [
    [0, 'dialing…'], [1.4, 'handshaking…'], [Math.max(2.4, dur - 0.9), 'connected at 56.6 kbps.'],
  ];
  $('#bootBar').hidden = false;
  for (const [t, m] of steps) {
    const at = performance.now() + t * 1000;
    while (performance.now() < at && !skipping) await sleep(40);
    if (skipping) break;
    bootMsg.textContent = m;
  }
  if (!skipping) await sleep(700);
  snd.stopDial();
  bootMsg.textContent = 'connection lost.';
  bootFace('side');
  if (!skipping) await sleep(650);
  showDesktop();
}
$('#skip').addEventListener('click', () => { skipping = true; });

function showDesktop() {
  desktop.hidden = false;
  boot.classList.add('flash');
  requestAnimationFrame(() => boot.classList.add('out'));
  setTimeout(() => boot.remove(), 700);
  snd.startMusic();
  setTimeout(welcome, 380);
  if (!isMobile()) setTimeout(showBalloon, 1900);
  startIdle();
  startPopups();
}

preload().then(() => {
  $('#bootBar').hidden = true;
  bootMsg.textContent = 'ready to connect.';
  bootFace('happy');
  $('#plugIn').hidden = false;
  $('#bootHint').hidden = isMobile();
  $('#plugIn').focus({ preventScroll: true });
});
$('#plugIn').addEventListener('click', enter);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !entered && !$('#plugIn').hidden) enter();
  if (e.key === 'Escape') { closeStart(); $('#vol').hidden = true; }
});

// ── plug: face + speech ─────────────────────────────────────
const plugImg = $('#plugImg');
const plugEl = $('#plug');
const bubble = $('#bubble');
const SRC = { side: '/img/plug-side.webp', happy: '/img/plug-happy.webp', sleep: '/img/plug-sleep.webp' };
let faceTimer, sayTimer, asleep = false, lastSay = 0;

function face(k, ms) {
  clearTimeout(faceTimer);
  if (plugImg.getAttribute('src') !== SRC[k]) {
    plugImg.src = SRC[k];
    plugEl.classList.remove('jolt'); void plugEl.offsetWidth; plugEl.classList.add('jolt');
  }
  if (ms) faceTimer = setTimeout(() => face(asleep ? 'sleep' : 'side'), ms);
}
function say(text, ms = 3200) {
  clearTimeout(sayTimer);
  bubble.textContent = text;
  bubble.classList.add('on');
  lastSay = Date.now();
  sayTimer = setTimeout(() => bubble.classList.remove('on'), ms);
}

const IDLE_LINES = [
  'still offline.',
  'have you tried turning me off and on again.',
  "i can't sell. no connection.",
  'someone tripped over me on tuesday.',
  'is that a bird. i hate it.',
  '0 bars.',
  'the router is blinking at me.',
  'i used to be 1 gbps.',
  'go back inside.',
  'buffering…',
  'my clip is broken. don\'t look at it.',
  'outside is just a big room with no wifi.',
];
const POKE_LINES = ["that's my clip.", "don't. i'm fragile.", 'opening my properties. rude.', 'stop poking the cable.'];

function startIdle() {
  let lastAct = Date.now();
  const wake = () => {
    lastAct = Date.now();
    if (asleep) { asleep = false; face('side'); say("i'm up. still offline.", 2600); }
  };
  ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  setInterval(() => {
    if (document.hidden) return;
    const idle = Date.now() - lastAct;
    if (!asleep && idle > 45000) { asleep = true; face('sleep'); say('zzz. wake me when the wifi is back.', 4000); return; }
    if (!asleep && Date.now() - lastSay > 9000 && Math.random() < 0.55) {
      let l; do { l = rand(IDLE_LINES); } while (l === bubble.textContent);
      say(l);
    }
  }, 4000);
}
$('#plugHit').addEventListener('click', () => {
  snd.click();
  say(rand(POKE_LINES), 2400);
  face('side');
  plugEl.classList.remove('jolt'); void plugEl.offsetWidth; plugEl.classList.add('jolt');
  openProps();
});

// ── sticky note / CA ────────────────────────────────────────
const shortCa = (ca) => (ca.length > 12 ? `${ca.slice(0, 5)}…${ca.slice(-5)}` : ca);
function renderCa() {
  const has = !!CONFIG.ca;
  $('#caText').textContent = has ? CONFIG.ca : 'no ca yet.';
  $('#caSub').textContent = has ? 'tap to copy' : "he's looking for wifi.";
  $('#smCa').textContent = has ? shortCa(CONFIG.ca) : 'no ca yet';
}
async function copyCa() {
  if (!CONFIG.ca) { dialog({ title: 'ca', kind: 'info', text: SOON.buy }); return; }
  try { await navigator.clipboard.writeText(CONFIG.ca); }
  catch {
    const t = document.createElement('textarea'); t.value = CONFIG.ca; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch {} t.remove();
  }
  const st = $('#sticky');
  st.classList.add('done'); $('#caSub').textContent = 'copied ✓ don’t lose it.';
  setTimeout(() => { st.classList.remove('done'); $('#caSub').textContent = 'tap to copy'; }, 2600);
  say('copied. write it on paper. just in case.', 2800);
  snd.ding('ok');
}
$('#sticky').addEventListener('click', () => { snd.click(); copyCa(); });

// ── desktop icons ───────────────────────────────────────────
const OPEN = {
  pfp: () => openPfp({ say, face }),
  memes: openMemes,
  readme: openReadme,
  network: openNetwork,
  bin: openBin,
  disclaimer: openDisclaimer,
};
$$('[data-open]').forEach((b) =>
  b.addEventListener('click', () => {
    snd.click();
    closeStart();
    if (b.classList.contains('icon')) { $$('.icon').forEach((i) => i.classList.toggle('sel', i === b)); }
    $('#balloon').hidden = true;
    OPEN[b.dataset.open]?.();
  })
);
desktop.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.icon')) $$('.icon.sel').forEach((i) => i.classList.remove('sel'));
  if (!e.target.closest('.startmenu, .start')) closeStart();
  if (!e.target.closest('.vol, .tray-snd')) $('#vol').hidden = true;
});

// ── start menu ──────────────────────────────────────────────
const startBtn = $('#startBtn');
const startMenu = $('#startmenu');
function closeStart() { startMenu.hidden = true; startBtn.setAttribute('aria-expanded', 'false'); }
startBtn.addEventListener('click', () => {
  snd.click();
  const open = startMenu.hidden;
  startMenu.hidden = !open;
  startBtn.setAttribute('aria-expanded', String(open));
});
startMenu.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  snd.click();
  closeStart();
  if (act === 'copyca') copyCa();
  if (act === 'help') dialog({ title: 'help and support', kind: 'info', text: "there is no help.<br>he's offline. you're on your own." });
  if (act === 'logoff') dialog({ title: 'log off', kind: 'warn', text: "you can't log off.<br>you were never on." });
  if (act === 'off') dialog({ title: 'turn off computer', kind: 'info', text: "it's already off.<br>that's the whole problem." });
});

// ── tray ────────────────────────────────────────────────────
const balloon = $('#balloon');
let balloonTimer;
function showBalloon() {
  balloon.hidden = false;
  snd.ding('info');
  clearTimeout(balloonTimer);
  balloonTimer = setTimeout(() => (balloon.hidden = true), 9000);
}
$('.bl-x', balloon).addEventListener('click', (e) => { e.stopPropagation(); balloon.hidden = true; });
balloon.addEventListener('click', () => { balloon.hidden = true; openNetwork(); });
$('#trayNet').addEventListener('click', () => { if (balloon.hidden) showBalloon(); else balloon.hidden = true; });

const vol = $('#vol');
const volRange = $('#volRange');
const volMute = $('#volMute');
const sndBtn = $('#traySound');
const syncSound = () => {
  volRange.value = Math.round(snd.getVolume() * 100);
  volMute.checked = snd.isMuted();
  sndBtn.classList.toggle('muted', snd.isMuted());
};
syncSound();
sndBtn.addEventListener('click', () => { vol.hidden = !vol.hidden; syncSound(); });
volRange.addEventListener('input', () => { snd.setVolume(volRange.value / 100); if (snd.isMuted()) snd.setMuted(false); syncSound(); });
volMute.addEventListener('change', () => { snd.setMuted(volMute.checked); syncSound(); });

const clock = $('#clock');
const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
tick(); setInterval(tick, 15000);

// ── welcome + random errors ─────────────────────────────────
function welcome() {
  const x = isMobile() ? undefined : Math.round(window.innerWidth * 0.2);
  const y = isMobile() ? undefined : Math.round(window.innerHeight * 0.16);
  const w = dialog({
    title: 'Offline', kind: 'error', x, y, width: 380,
    text: '<b>Offline</b>the connection has been lost.',
    buttons: [
      { label: 'OK', action: () => { say('ok.', 1800); } },
      { label: 'Retry', action: () => { retry(); } },
    ],
  });
  w.el.classList.add('big');
  w.onClose = () => { if (isMobile()) setTimeout(showBalloon, 700); };
}
let retries = 0;
async function retry() {
  retries++;
  face('happy');
  say('trying…', 1400);
  snd.zap();
  await sleep(1300);
  face('side');
  const lines = ['still no.', 'no.', 'it said no again.', "stop. it's embarrassing.", 'retry count: too many.'];
  dialog({
    title: 'error', kind: 'error', text: lines[Math.min(retries - 1, lines.length - 1)],
    buttons: [{ label: 'OK' }, { label: 'Retry', action: () => { retry(); } }],
  });
}

const POPUPS = [
  { title: 'error', kind: 'error', text: 'the internet is not responding.', retry: true },
  { title: 'No connection', kind: 'error', text: 'plug.exe has stopped hoping.' },
  { title: 'warning', kind: 'warn', text: 'you are outside.<br>this is not recommended.' },
  { title: 'Error 404', kind: 'error', text: 'signal not found.' },
  { title: 'plug', kind: 'info', text: 'do you want to send an error report?', report: true },
  { title: 'low disk space', kind: 'warn', text: "you are running out of patience.<br>he isn't. he's offline." },
];
let auto = 0;
function startPopups() {
  setInterval(() => {
    if (document.hidden || auto >= 5 || openCount() >= 2 || Math.random() < 0.4) return;
    auto++;
    const p = rand(POPUPS);
    const x = isMobile() ? undefined : Math.round(40 + Math.random() * window.innerWidth * 0.45);
    const y = isMobile() ? undefined : Math.round(60 + Math.random() * window.innerHeight * 0.4);
    const buttons = p.report
      ? [{ label: 'Send', action: () => { dialog({ title: 'sending…', kind: 'error', text: "couldn't send.<br>no internet. obviously." }); } }, { label: "Don't send" }]
      : p.retry ? [{ label: 'Retry', action: () => { retry(); } }, { label: 'Cancel' }] : [{ label: 'OK' }];
    dialog({ ...p, x, y, buttons });
  }, 32000);
}

// ── memes ───────────────────────────────────────────────────
const MEMES = [
  { id: 'hello', name: 'hello.jpg' }, { id: 'mail', name: 'ca_by_mail.jpg' }, { id: 'please', name: 'please.jpg' },
  { id: 'oldway', name: 'the_old_way.jpg' }, { id: 'grass', name: 'touch_grass.jpg' }, { id: 'hold', name: 'on_hold.jpg' },
  { id: 'dinner', name: 'family_dinner.jpg' }, { id: 'bars', name: '0_bars.jpg' },
];
function explorerShell(path, icon, side, inner) {
  return `
    <div class="xmenu"><span>File</span><span>Edit</span><span>View</span><span>Favorites</span><span>Tools</span><span>Help</span></div>
    <div class="xaddr">Address<div><img src="${icon}" alt="">${path}</div></div>
    <div class="explorer"><aside class="xside">${side}</aside>${inner}</div>`;
}
function openMemes() {
  const side = `
    <div class="xbox"><h4>picture tasks</h4><ul>
      <li><button data-x="show"><img src="/img/ico-folder.webp" alt="">view as a slideshow</button></li>
      <li><button data-x="pfp"><img src="/img/ico-plug.webp" alt="">make a pfp instead</button></li>
    </ul></div>
    <div class="xbox"><h4>details</h4><p><b>memes</b><br>8 files. made offline.<br>by hand. it took weeks.</p></div>`;
  const grid = `<div class="xgrid">${MEMES.map((m, i) =>
    `<button class="thumb" data-i="${i}"><img src="/memes/t/${m.id}.webp" alt="" loading="lazy"><span>${m.name}</span></button>`).join('')}</div>`;
  const w = openWindow({
    id: 'memes', title: 'memes', icon: '/img/ico-folder.webp', width: 720,
    body: explorerShell('C:\\plug\\memes', '/img/ico-folder.webp', side, grid), status: '8 objects',
  });
  if (w.body.dataset.wired) return;
  w.body.dataset.wired = '1';
  w.body.addEventListener('click', (e) => {
    const t = e.target.closest('.thumb');
    if (t) { snd.click(); openViewer(+t.dataset.i); return; }
    const x = e.target.closest('[data-x]')?.dataset.x;
    if (x === 'show') { snd.click(); openViewer(0); }
    if (x === 'pfp') { snd.click(); OPEN.pfp(); }
  });
}
let viewerWin = null;
function openViewer(i) {
  if (viewerWin) { openWindow({ id: 'viewer' }); viewerWin.idx = i; viewerWin.render(); return; }
  const body = document.createElement('div');
  body.className = 'viewer';
  body.innerHTML = `<div class="viewer-img"><img alt=""></div>
    <div class="viewer-bar">
      <button class="xbtn" data-v="prev">◀ prev</button>
      <button class="xbtn" data-v="next">next ▶</button>
      <button class="xbtn def" data-v="save">save</button>
      <button class="xbtn x" data-v="post">post on 𝕏</button>
    </div>`;
  const w = openWindow({
    id: 'viewer', title: 'picture viewer', icon: '/img/ico-folder.webp', width: 600, body, status: '',
    onClose: () => { viewerWin = null; },
  });
  viewerWin = w;
  w.idx = i;
  const img = body.querySelector('.viewer-img img');
  w.render = () => {
    const m = MEMES[w.idx];
    img.src = `/memes/${m.id}.webp`;
    img.alt = m.name;
    w.el.querySelector('.win-name').textContent = `${m.name} · picture viewer`;
    w.setStatus(`${w.idx + 1} of ${MEMES.length}`);
  };
  const show = w.render;
  body.querySelector('.viewer-bar').addEventListener('click', async (e) => {
    const v = e.target.closest('[data-v]')?.dataset.v;
    if (!v) return;
    snd.click();
    const idx = w.idx;
    if (v === 'prev') { w.idx = (idx - 1 + MEMES.length) % MEMES.length; show(); }
    if (v === 'next') { w.idx = (idx + 1) % MEMES.length; show(); }
    if (v === 'save') {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob((b) => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(b);
        a.download = `plug-${MEMES[idx].name.replace('.jpg', '')}.png`; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, 'image/png');
      say('saved. go post it. i would, but.', 2600);
    }
    if (v === 'post') {
      const text = `$UNPLUG\n${siteUrl()}`;
      window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  });
  show();
}

// ── notepad ─────────────────────────────────────────────────
const README = `the plug got unplugged.

he lived in a server room. rack 7, port 23.
1 gbps. green light. never slept.

then tuesday. someone tripped over the cable.
the clip snapped. the light went out.

now he lives on your desktop.
every coin he holds is online. he is not.
he can't sell. no connection.

— do not delete this file.`;
const DISCLAIMER = `$unplug is a memecoin.
no intrinsic value. no roadmap. no expectation of financial return.

plug is a fictional cable. nothing here is financial advice.
crypto is risky. only use money you can afford to lose.

plug has no comment. he's offline.`;
function notepad(id, title, text) {
  const body = document.createElement('div');
  body.className = 'np';
  body.innerHTML = `<div class="xmenu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div><pre></pre>`;
  body.querySelector('pre').textContent = text;
  return openWindow({ id, title: `${title} - Notepad`, icon: '/img/ico-notepad.webp', width: 520, body });
}
function openReadme() { notepad('readme', 'readme.txt', README); }
function openDisclaimer() { notepad('disclaimer', 'disclaimer.txt', DISCLAIMER); }

// ── network status (live data) ──────────────────────────────
let market = null;
const fmt$ = (n) => {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
};
const fmtN = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));
function netHtml() {
  const m = market;
  const ch = m?.ch;
  return `
    <fieldset><legend>connection</legend><dl>
      <dt>status:</dt><dd class="bad">disconnected</dd>
      <dt>duration:</dt><dd>since tuesday</dd>
      <dt>speed:</dt><dd>0 bps</dd>
      <dt>signal (mcap):</dt><dd>${fmt$(m?.mcap)}</dd>
      <dt>24h:</dt><dd class="${ch > 0 ? 'good' : ch < 0 ? 'bad' : ''}">${ch == null ? '—' : `${ch > 0 ? '+' : ''}${ch}%`}</dd>
      <dt>volume 24h:</dt><dd>${fmt$(m?.vol)}</dd>
    </dl></fieldset>
    <fieldset><legend>activity</legend>
      <div class="act"><div>bought<b>${fmtN(m?.buys)}</b></div><div class="pc"><i></i><i></i></div><div>sold<b>${fmtN(m?.sells)}</b></div></div>
    </fieldset>
    ${CONFIG.ca ? '' : `<p class="net-note">no ca yet. numbers show up the second he's live.</p>`}
    <div class="net-btns">
      <a class="xbtn" data-link="chart" style="display:grid;place-items:center">chart</a>
      <a class="xbtn def" data-link="buy" style="display:grid;place-items:center">buy $unplug</a>
      <button class="xbtn" data-n="repair">repair</button>
    </div>`;
}
let netWin = null;
function openNetwork() {
  const body = document.createElement('div');
  body.className = 'net';
  body.innerHTML = netHtml();
  netWin = openWindow({ id: 'network', title: 'network status', icon: '/img/ico-network.webp', width: 360, body, maximizable: false,
    onClose: () => { netWin = null; } });
  wireLinks(netWin.body);
  if (netWin.body.dataset.wired) return;
  netWin.body.dataset.wired = '1';
  netWin.body.addEventListener('click', async (e) => {
    if (e.target.closest('[data-n=repair]')) {
      snd.click();
      say('diagnosing…', 1500);
      await sleep(1400);
      dialog({ title: 'repair', kind: 'error', text: "windows could not finish repairing.<br>the cable is the problem. the cable is him." });
    }
  });
}
function updateNet() {
  if (!netWin) return;
  const n = netWin.body.querySelector('.net') || netWin.body.firstElementChild;
  if (!n) return;
  n.innerHTML = netHtml();
  wireLinks(n);
}
async function poll() {
  if (!CONFIG.ca) return;
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONFIG.ca}`);
    const j = await r.json();
    const p = (j.pairs || []).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    if (p) {
      market = {
        mcap: p.marketCap ?? p.fdv, ch: p.priceChange?.h24, vol: p.volume?.h24,
        buys: p.txns?.h24?.buys, sells: p.txns?.h24?.sells,
      };
      updateNet();
    }
  } catch {}
}
poll(); setInterval(poll, 25000);

// ── recycle bin ─────────────────────────────────────────────
const BIN = [
  ['roadmap.doc', 'C:\\plug', '0 KB', 'there is no roadmap.', '/img/ico-notepad.webp'],
  ['whitepaper.pdf', 'C:\\plug', '0 KB', 'this file is blank. on purpose.', '/img/ico-notepad.webp'],
  ['utility.exe', 'C:\\plug', '1 KB', 'utility.exe is not a valid memecoin.', ICONS.error],
  ['team.jpg', 'C:\\plug', '4 KB', "it's just him.", '/img/ico-folder.webp'],
  ['wifi_password.txt', 'C:\\plug', '1 KB', "doesn't matter. the router is unplugged too.", '/img/ico-notepad.webp'],
  ['discord_invite.lnk', 'C:\\plug', '1 KB', 'link expired. like his connection.', '/img/ico-network.webp'],
];
function openBin() {
  const side = `
    <div class="xbox"><h4>recycle bin tasks</h4><ul>
      <li><button data-b="empty"><img src="/img/ico-bin.webp" alt="">empty the recycle bin</button></li>
      <li><button data-b="restore"><img src="/img/ico-folder.webp" alt="">restore all items</button></li>
    </ul></div>`;
  const table = `<div style="background:#fff;overflow:auto"><table class="xlist">
    <thead><tr><th>name</th><th>original location</th><th>size</th></tr></thead>
    <tbody>${BIN.map((b, i) => `<tr class="row" data-i="${i}"><td><img src="${b[4]}" alt="">${b[0]}</td><td>${b[1]}</td><td>${b[2]}</td></tr>`).join('')}</tbody>
  </table></div>`;
  const w = openWindow({
    id: 'bin', title: 'recycle bin', icon: '/img/ico-bin.webp', width: 640,
    body: explorerShell('Recycle Bin', '/img/ico-bin.webp', side, table), status: `${BIN.length} objects · 0 bytes of plans`,
  });
  if (w.body.dataset.wired) return;
  w.body.dataset.wired = '1';
  w.body.addEventListener('click', (e) => {
    const row = e.target.closest('tr.row');
    if (row) { snd.click(); const b = BIN[+row.dataset.i]; dialog({ title: b[0], kind: 'error', text: b[3] }); return; }
    const a = e.target.closest('[data-b]')?.dataset.b;
    if (a === 'empty') dialog({ title: 'recycle bin', kind: 'warn', text: "access denied.<br>he's keeping them." });
    if (a === 'restore') dialog({ title: 'recycle bin', kind: 'info', text: "restored.<br>they're still useless." });
  });
}

// ── properties (the trading card) ───────────────────────────
function openProps() {
  const body = document.createElement('div');
  body.className = 'props';
  body.innerHTML = `
    <div class="tabs" role="tablist">
      <button role="tab" class="on" data-t="general">General</button>
      <button role="tab" data-t="details">Details</button>
      <button role="tab" data-t="driver">Driver</button>
    </div>
    <div class="tabpanel"></div>
    <div class="p-btns"><button class="xbtn def" data-p="ok">OK</button><button class="xbtn" data-p="cancel">Cancel</button></div>`;
  const panel = body.querySelector('.tabpanel');
  const head = `<div class="p-head"><img src="/img/ico-plug.webp" alt=""><b>plug</b></div>`;
  const T = {
    general: `${head}
      <div class="p-grid">
        <span>device type:</span><span>network adapter (emotional)</span>
        <span>manufacturer:</span><span>unknown</span>
        <span>location:</span><span>behind your desk</span>
        <span>connector:</span><span>RJ45. 8 pins. 0 friends.</span>
      </div>
      <fieldset class="p-status"><legend>device status</legend>
        <div>this device is not working properly because it is unplugged. (code 10)<br><br>to find a solution, click troubleshoot.</div>
      </fieldset>
      <div class="p-btns"><button class="xbtn" data-p="trouble">troubleshoot…</button></div>`,
    details: `${head}
      <div class="p-grid">
        <span>likes:</span><span>green lights, blinking, being plugged in</span>
        <span>hates:</span><span>wifi, vacuum cleaners, outside</span>
        <span>special move:</span><span>buffering</span>
        <span>diet:</span><span>packets (none since tuesday)</span>
        <span>hi-score:</span><span>1 gbps (2019)</span>
        <span>sells:</span><span>never. can't. no connection.</span>
      </div>`,
    driver: `${head}
      <div class="p-grid">
        <span>driver provider:</span><span>nobody</span>
        <span>driver date:</span><span>tuesday</span>
        <span>driver version:</span><span>0.0.0</span>
        <span>digital signer:</span><span>his mom</span>
      </div>
      <div class="p-btns"><button class="xbtn" data-p="update">update driver…</button></div>`,
  };
  const set = (t) => {
    panel.innerHTML = T[t];
    body.querySelectorAll('[role=tab]').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  };
  set('general');
  const w = openWindow({ id: 'props', title: 'plug properties', icon: '/img/ico-plug.webp', width: 380, body, maximizable: false });
  if (w.body.dataset.wired) return;
  w.body.dataset.wired = '1';
  w.body.addEventListener('click', (e) => {
    const tab = e.target.closest('[role=tab]');
    if (tab) { snd.click(); set(tab.dataset.t); return; }
    const p = e.target.closest('[data-p]')?.dataset.p;
    if (!p) return;
    snd.click();
    if (p === 'ok' || p === 'cancel') w.el.querySelector('.wc-close').click();
    if (p === 'trouble') dialog({ title: 'troubleshooter', kind: 'warn', text: 'the problem is outside.<br>do not go there.' });
    if (p === 'update') dialog({ title: 'update driver', kind: 'error', text: 'searching online for drivers…<br>you are not online.' });
  });
}

// ── init ────────────────────────────────────────────────────
renderCa();
wireLinks();
$('.sm-help').src = ICONS.info;
