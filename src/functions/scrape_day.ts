import lib from "../lib";

/**
 * Scrapes all posts of a Telegram channel published within a single calendar day (UTC).
 *
 * The day boundaries are derived from the `when` date: everything from 00:00:00.000
 * up to 23:59:59.999 UTC of that day is collected. Messages are iterated from the end
 * of the day backwards, so the returned rows are ordered newest-first.
 *
 * Posts that contain neither text nor a photo are skipped. For photo posts the image
 * is downloaded in full size, resized to a lightweight JPEG preview, and attached
 * to the row as a base64 string (or `null` when the download fails).
 *
 * NOTE: this method covers the WHOLE day including posts published after `when`,
 * so it is subject to look-ahead bias when used inside a backtest. Prefer
 * {@link scrapeLookback} for backtesting scenarios.
 *
 * @param dto - Scrape parameters
 * @param dto.channel - Channel username or id to scrape
 * @param dto.when - Any moment inside the target day; only its UTC date part matters
 * @returns Promise resolving to the day's messages, newest-first
 */
export async function scrapeDay(dto: { channel: string; when: Date }) {
    lib.loggerService.log("functions.scrapeDay", { dto });
    return await lib.telegramGlobalService.scrapeDay(dto);
}
