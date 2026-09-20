import { Dimension } from 'get-moment-stamp';
import * as functools_kit from 'functools-kit';
import { TelegramClient } from 'telegram';

interface ILogger {
    log(topic: string, ...args: any[]): void;
    debug(topic: string, ...args: any[]): void;
    info(topic: string, ...args: any[]): void;
    warn(topic: string, ...args: any[]): void;
}
declare class LoggerService implements ILogger {
    private _commonLogger;
    log: (topic: string, ...args: any[]) => Promise<void>;
    debug: (topic: string, ...args: any[]) => Promise<void>;
    info: (topic: string, ...args: any[]) => Promise<void>;
    warn: (topic: string, ...args: any[]) => Promise<void>;
    setLogger: (logger: ILogger) => void;
}

declare class AuthService {
    readonly loggerService: LoggerService;
    signIn: () => Promise<void>;
}

interface ScraperMessage {
    id: number;
    channel: string;
    content: string;
    date: Date;
    photo: string | null;
}

declare class ScraperService {
    private readonly loggerService;
    scrapeDay: (dto: {
        channel: string;
        when: Date;
    }) => Promise<ScraperMessage[]>;
    scrapeLookback: (dto: {
        channel: string;
        when: Date;
        limit: number;
        dimension?: Dimension;
    }) => Promise<ScraperMessage[]>;
    scrapePage: (dto: {
        channel: string;
        limit: number;
        offset: number;
        when: Date;
    }) => Promise<ScraperMessage[]>;
}

declare class TelegramGlobalService {
    readonly loggerService: LoggerService;
    readonly authService: AuthService;
    readonly scraperService: ScraperService;
    signIn: () => Promise<void>;
    scrapeDay: (dto: {
        channel: string;
        when: Date;
    }) => Promise<ScraperMessage[]>;
    scrapeLookback: (dto: {
        channel: string;
        when: Date;
        limit: number;
        dimension?: Dimension;
    }) => Promise<ScraperMessage[]>;
    scrapePage: (dto: {
        channel: string;
        limit: number;
        offset: number;
        when: Date;
    }) => Promise<ScraperMessage[]>;
}

declare const lib: {
    telegramGlobalService: TelegramGlobalService;
    authService: AuthService;
    loggerService: LoggerService;
    scraperService: ScraperService;
};

/**
 * Signs the client in to Telegram, establishing an authorized MTProto session.
 *
 * Delegates to the auth service, which drives the interactive authentication
 * flow (e.g. QR code / credentials) and persists the resulting session so that
 * subsequent scraper calls can reuse it without re-authenticating.
 *
 * Must be called once before any scraping function ({@link scrapeDay},
 * {@link scrapeLookback}, {@link scrapePage}) when no saved session exists.
 *
 * @returns Promise that resolves once the session is authorized
 */
declare function signIn(): Promise<void>;

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
declare function scrapeDay(dto: {
    channel: string;
    when: Date;
}): Promise<ScraperMessage[]>;

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
declare function scrapeLookback(dto: {
    channel: string;
    when: Date;
    limit: number;
    dimension?: Dimension;
}): Promise<ScraperMessage[]>;

/**
 * Scrapes a page of Telegram channel posts published before `when`,
 * using classic `limit`/`offset` pagination.
 *
 * Iteration starts strictly before `when` and walks the channel history backwards
 * (newest-first): the first `offset` matching posts are skipped, then up to `limit`
 * posts are collected. Increase `offset` by `limit` between calls to page deeper
 * into the history while keeping `when` fixed, so consecutive pages stay consistent
 * even when new posts arrive in the channel.
 *
 * Posts that contain neither text nor a photo are skipped and do not consume
 * `limit`/`offset`. For photo posts the image is downloaded in full size, resized
 * to a lightweight JPEG preview, and attached to the row as a base64 string
 * (or `null` when the download fails).
 *
 * @param dto - Scrape parameters
 * @param dto.channel - Channel username or id to scrape
 * @param dto.limit - Maximum number of posts to return (page size)
 * @param dto.offset - Number of matching posts to skip before collecting the page
 * @param dto.when - Upper (exclusive) time boundary: only posts older than it are considered
 * @returns Promise resolving to the requested page of messages, newest-first
 */
declare function scrapePage(dto: {
    channel: string;
    limit: number;
    offset: number;
    when: Date;
}): Promise<ScraperMessage[]>;

declare const getTelegram: (() => Promise<TelegramClient>) & functools_kit.ISingleshotClearable<() => Promise<TelegramClient>>;

declare const GLOBAL_CONFIG: {
    CC_TELEGRAM_API_ID: number;
    CC_TELEGRAM_API_HASH: string;
};
type Config = typeof GLOBAL_CONFIG;
declare const getConfig: () => {
    CC_TELEGRAM_API_ID: number;
    CC_TELEGRAM_API_HASH: string;
};
declare const setConfig: (config: Partial<Config>) => void;

export { getConfig, getTelegram, lib, scrapeDay, scrapeLookback, scrapePage, setConfig, signIn };
