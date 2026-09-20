# telegram-reader

A library for reading posts from Telegram channels via MTProto (a userbot built on [gramjs](https://gram.js.org/)). It returns channel messages as flat rows with text and a lightweight photo preview — a convenient format for feeding an LLM agent, analytics, or a trading-signal backtest.

## Features

- **QR-code authorization** — one interactive session, after which the client reuses the saved `session.txt`.
- **Three fetch modes**:
  - `scrapeDay` — all posts of a calendar day (UTC);
  - `scrapeLookback` — a sliding "last N minutes/hours/days" window free of look-ahead bias, suitable for both backtesting and live mode;
  - `scrapePage` — classic `limit`/`offset` pagination deep into the channel history.
- **Photo previews**: the image is downloaded in full size, rotated according to EXIF, and compressed to a JPEG 800px wide (quality 80) via `sharp`; it lands in the row as base64. Downloads go through a pool (`maxExec: 5`) to avoid OOM on weak hardware.
- Posts with neither text nor photo are skipped; the result is always ordered newest-first.

## Installation and build

```bash
npm install
npm run build   # rollup → build/index.cjs, build/index.mjs + types.d.ts
```

Requires Node.js (`sharp` and `fs/promises` are used).

## Setup

1. Get an `api_id` and `api_hash` at [my.telegram.org](https://my.telegram.org) and pass them via `setConfig` **before** the first call to any other function (recommended way):

   ```ts
   import { setConfig } from "telegram-reader";

   setConfig({
     CC_TELEGRAM_API_ID: 1234567,
     CC_TELEGRAM_API_HASH: "0123456789abcdef0123456789abcdef",
   });
   ```

   Values set through `setConfig` take priority over everything else. Alternatively, use environment variables (a `.env` file works too):

   ```bash
   CC_TELEGRAM_API_ID=1234567
   CC_TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef
   ```

   Resolution order: `setConfig` → environment variables → built-in defaults. The current effective values can be inspected with `getConfig()`.

2. Create `session.txt` by signing in once. The recommended way is a one-liner:

   ```bash
   node -e 'require("telegram-reader").signIn()'
   ```

   Or call it from your own code:

   ```ts
   import { signIn } from "telegram-reader";

   await signIn();
   // Session saved to ./session.txt
   ```

   A QR code appears in the console — scan it in Telegram (*Settings → Devices → Link Desktop Device*); if 2FA is enabled, you will be prompted for the password. The session is saved to `./session.txt` and reused by all subsequent calls.

## Usage

Each result row has the following shape:

```ts
interface ScraperMessage {
  id: number;          // message id within the channel
  channel: string;     // channel exactly as passed in the request
  content: string;     // post text ("" if photo-only)
  date: Date;          // publication time
  photo: string | null; // base64 JPEG preview or null
}
```

### All posts of a day

```ts
import { scrapeDay } from "telegram-reader";

const rows = await scrapeDay({
  channel: "some_channel",
  when: new Date("2026-09-19"), // only the UTC date part matters
});
```

`scrapeDay` covers the **whole** day, including posts published after `when` — in a backtest that is look-ahead bias. Use `scrapeLookback` for backtesting.

### Sliding window (no look-ahead bias)

```ts
import { scrapeLookback } from "telegram-reader";

// the last 6 hours relative to the "current moment"
const rows = await scrapeLookback({
  channel: "some_channel",
  when: new Date(),   // in a backtest — the simulated "now"
  limit: 6,
  dimension: "hour",  // "minute" | "hour" | "day", defaults to "minute"
});
```

The window is `[when - limit * dimension, when)`: a post dated exactly `when` or later never makes it into the result — at that moment it is not yet "visible".

### Paging through history

```ts
import { scrapePage } from "telegram-reader";

const when = new Date(); // pin the boundary so pages don't drift
const page1 = await scrapePage({ channel: "some_channel", when, limit: 20, offset: 0 });
const page2 = await scrapePage({ channel: "some_channel", when, limit: 20, offset: 20 });
```

### Direct client access

```ts
import { getTelegram } from "telegram-reader";

const client = await getTelegram(); // authorized TelegramClient (singleton)
```

## REPL

```bash
npm run repl
```

Builds the project and starts Node with `.env` loaded — handy for testing the functions by hand.
