import { scrapeLookback } from "telegram-reader";

const WHEN = new Date("2026-08-01T18:07:00.000Z");
const CHANNEL = "crypto_yoda_channel";
const SYMBOLS = [
  "BTCUSDT", "POLUSDT", "ZECUSDT", "HYPEUSDT", "DOGEUSDT", "SOLUSDT",
  "PENGUUSDT", "TRXUSDT", "HBARUSDT", "NEARUSDT", "FARTCOINUSDT",
  "ETHUSDT", "PUMPUSDT",
];

const found = {};

for (const symbol of SYMBOLS) {
  const coin = `#${symbol.replace("USDT", "")}`;
  const messages = (
    await scrapeLookback({
      channel: CHANNEL,
      when: WHEN,
      limit: 60 * 4,
      dimension: "minute",
    })
  )
    .filter(({ content }) => content.length > 0)
    .filter(({ content }) => content.includes(coin));

  console.log(`${symbol}: ${messages.length} matched message(s)`);
  if (messages.length) {
    found[symbol] = messages;
    for (const m of messages) {
      console.log(`--- id=${m.id} date=${m.date.toISOString()}`);
      console.log(m.content.slice(0, 400));
    }
  }
}

console.log("\nSymbols with matches:", Object.keys(found).join(", ") || "none");
process.exit(0);
