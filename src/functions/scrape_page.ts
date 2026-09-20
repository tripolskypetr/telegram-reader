import lib from "../lib";

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
export async function scrapePage(dto: {
    channel: string;
    limit: number;
    offset: number;
    when: Date;
}) {
    lib.loggerService.log("functions.scrapePage", { dto });
    return await lib.telegramGlobalService.scrapePage(dto);
}
