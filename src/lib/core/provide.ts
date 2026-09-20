import { provide } from "./di";
import TYPES from "./types";

import AuthService from "../services/base/AuthService";
import LoggerService from "../services/base/LoggerService";
import ScraperService from "../services/base/ScraperService";

import TelegramGlobalService from "../services/global/TelegramGlobalService";

{
    provide(TYPES.authService, () => new AuthService());
    provide(TYPES.loggerService, () => new LoggerService());
    provide(TYPES.scraperService, () => new ScraperService());
}

{
    provide(TYPES.telegramGlobalService, () => new TelegramGlobalService());
}
