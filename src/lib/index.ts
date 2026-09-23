import "./core/provide";
import { inject, init } from "./core/di";
import TYPES from "./core/types";

import AuthService from "./services/base/AuthService";
import LoggerService from "./services/base/LoggerService";
import ScraperService from "./services/base/ScraperService";

import TelegramGlobalService from "./services/global/TelegramGlobalService";
import TelegramCacheService from "./services/cache/TelegramCacheService";

const baseServices = {
  authService: inject<AuthService>(TYPES.authService),
  loggerService: inject<LoggerService>(TYPES.loggerService),
  scraperService: inject<ScraperService>(TYPES.scraperService),
};

const globalServices = {
  telegramGlobalService: inject<TelegramGlobalService>(TYPES.telegramGlobalService),
};

const cacheServices = {
  telegramCacheService: inject<TelegramCacheService>(TYPES.telegramCacheService),
}

export const lib = {
  ...baseServices,
  ...globalServices,
  ...cacheServices,
};

init();

export default lib;
