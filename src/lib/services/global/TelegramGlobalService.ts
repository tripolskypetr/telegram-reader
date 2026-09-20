import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import AuthService from "../base/AuthService";
import ScraperService from "../base/ScraperService";
import type { Dimension } from "get-moment-stamp";

export class TelegramGlobalService {

    readonly loggerService = inject<LoggerService>(TYPES.loggerService);
    readonly authService = inject<AuthService>(TYPES.authService);
    readonly scraperService = inject<ScraperService>(TYPES.scraperService);

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
