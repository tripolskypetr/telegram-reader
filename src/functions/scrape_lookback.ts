import lib from "../lib";
import type { Dimension } from "get-moment-stamp";

/**
 * Scrapes posts of a Telegram channel within a sliding lookback window
 * `[when - limit * dimension, when)`.
 *
 * Designed to be free of look-ahead bias: iteration starts strictly BEFORE `when`,
 * so a post published exactly at `when` or later is never included — at that moment
 * it is not yet "visible". This makes the function equally suitable for backtesting
 * (pass the simulated current time as `when`) and for paper/live trading (pass
 * `new Date()`, turning the window into "the last N minutes/hours/days").
 *
 * The window width is `limit` units of `dimension` ("minute" | "hour" | "day",
 * defaults to "minute"); internally every dimension is normalized to minutes.
 * Messages are iterated from `when` backwards and iteration stops as soon as
 * a post falls behind the left window boundary, so rows are ordered newest-first.
 *
 * Posts that contain neither text nor a photo are skipped. For photo posts the image
 * is downloaded in full size, resized to a lightweight JPEG preview, and attached
 * to the row as a base64 string (or `null` when the download fails).
 *
 * @param dto - Scrape parameters
 * @param dto.channel - Channel username or id to scrape
 * @param dto.when - Right (exclusive) window boundary: the "current moment" of the backtest
 * @param dto.limit - Window width, expressed in units of `dimension`
 * @param dto.dimension - Window unit: "minute", "hour" or "day" (defaults to "minute")
 * @returns Promise resolving to the messages inside the window, newest-first
 */
export async function scrapeLookback(dto: {
    channel: string;
    when: Date;
    limit: number;
    dimension?: Dimension;
}) {
    lib.loggerService.log("functions.scrapeLookback", { dto });
    return await lib.telegramGlobalService.scrapeLookback(dto);
}
