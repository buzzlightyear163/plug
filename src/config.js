// ─────────────────────────────────────────────────────────────
//  $PLUG — fyll i vid launch. Allt annat på sajten läser härifrån.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  ca: '',          // contract address (pump.fun). Tom = sajten visar "no ca yet."
  x: '',           // https://x.com/...
  telegram: '',    // https://t.me/...
  dexscreener: '', // valfri: egen chart-länk. Tom = byggs från CA
  site: '',        // https://dindomän.xyz — används i share-on-X-texten
};

export const buyUrl = () => (CONFIG.ca ? `https://pump.fun/coin/${CONFIG.ca}` : '');
export const chartUrl = () =>
  CONFIG.dexscreener || (CONFIG.ca ? `https://dexscreener.com/solana/${CONFIG.ca}` : '');
export const siteUrl = () => CONFIG.site || location.origin;
