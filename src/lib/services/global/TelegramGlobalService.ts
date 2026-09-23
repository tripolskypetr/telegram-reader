import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import AuthService from "../base/AuthService";
import ScraperService from "../base/ScraperService";
import TelegramCacheService from "../cache/TelegramCacheService";
import { DAY_MS, dayStampUtc } from "../../../utils/datetime";
import type { Dimension } from "get-moment-stamp";

export class TelegramGlobalService {

    readonly loggerService = inject<LoggerService>(TYPES.loggerService);
    readonly authService = inject<AuthService>(TYPES.authService);
    readonly scraperService = inject<ScraperService>(TYPES.scraperService);
    readonly telegramCacheService = inject<TelegramCacheService>(TYPES.telegramCacheService);

    public signIn = async () => {
        this.loggerService.log("telegramGlobalService signIn");
        await this.authService.signIn();
    }

    public scrapeDay = async (dto: {
        channel: string;
        when: Date;
    }) => {
        this.loggerService.log("telegramGlobalService scrapeDay", {
            dto,
        });
        // Завершённый день неизменен — тянем из кеша; текущий — живьём
        if (dayStampUtc(dto.when) < dayStampUtc(new Date())) {
            return await this.telegramCacheService.scrapeDay(dto);
        }
        return await this.scraperService.scrapeDay(dto);
    }

    public scrapeLookback = async (dto: {
        channel: string;
        when: Date;
        limit: number;
        dimension?: Dimension;
    }) => {
        this.loggerService.log("telegramGlobalService scrapeLookback", {
            dto,
        });
        // Окно [when - limit, when) целиком в завершённых днях — из кеша,
        // иначе (окно задевает текущий день) — живьём
        const todayStart = dayStampUtc(new Date()) * DAY_MS;
        if (dto.when.getTime() <= todayStart) {
            return await this.telegramCacheService.scrapeLookback(dto);
        }
        return await this.scraperService.scrapeLookback(dto);
    }

    public scrapePage = async (dto: {
        channel: string;
        limit: number;
        offset: number;
        when: Date;
    }) => {
        this.loggerService.log("telegramGlobalService scrapePage", {
            dto,
        });
        return await this.scraperService.scrapePage(dto);
    }
}

export default TelegramGlobalService;
