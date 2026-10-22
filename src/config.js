// ─────────────────────────────────────────────────────────────
//  unplugged ($UNPLUG) — fyll i vid launch. Allt annat på sajten läser härifrån.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  ca: '9psCJXusVEkQuSt932kEVt6Qj84evEmoj2opJ7nfpump', // contract address (pump.fun)
  x: '',           // https://x.com/...
  telegram: '',    // https://t.me/...
  dexscreener: '', // valfri: egen chart-länk. Tom = byggs från CA
  site: 'https://www.plugoffline.fun', // används i share-on-X-texten
};

export const buyUrl = () => (CONFIG.ca ? `https://pump.fun/coin/${CONFIG.ca}` : '');
export const chartUrl = () =>
  CONFIG.dexscreener || (CONFIG.ca ? `https://dexscreener.com/solana/${CONFIG.ca}` : '');
export const siteUrl = () => CONFIG.site || location.origin;
