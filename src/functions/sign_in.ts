import lib from "../lib";

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
export async function signIn() {
    lib.loggerService.log("functions.signIn");
    return await lib.telegramGlobalService.signIn();
}
