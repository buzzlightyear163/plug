# unplugged ($UNPLUG) — the plug got unplugged.

En nätverkskontakt som bor på ditt skrivbord. Han är offline. Han kan inte sälja.

## Kör lokalt

```bash
npm install
npm run dev
```

## Vid launch

1. Öppna `src/config.js` och fyll i `ca`, `x`, `telegram` (och `site` när domänen finns).
   - Sticky-lappen, start-menyn, buy-knappen och "network"-fönstret (live mcap/köp/sälj från Dexscreener) läser därifrån.
2. I `index.html`: byt `/og.jpg` mot full url (`https://dindomän/og.jpg`) så X visar kortet.
3. Pusha → Vercel (Framework: Vite, build `npm run build`, output `dist`).

## Vad finns var

- `src/main.js` — boot/uppringning, skrivbordet, fönstren (memes, readme, network, recycle bin, properties), slumpade felrutor
- `src/pfp.js` — plug.exe, pfp-makern (signal × bakgrund × sticker, 1080×1080 png)
- `src/sound.js` — allt ljud är syntat i WebAudio (uppringningsljud, felpling, väntmusik genom en telefonlinje)
- `src/wm.js` — fönsterhanteraren
- `public/img` figuren (3 lägen), ikoner, tapet · `public/pfp` outfits + bakgrunder · `public/memes` 8 memes
