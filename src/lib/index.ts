import "./core/provide";
import { inject, init } from "./core/di";
import TYPES from "./core/types";

import AuthService from "./services/base/AuthService";
import LoggerService from "./services/base/LoggerService";
import ScraperService from "./services/base/ScraperService";

import TelegramGlobalService from "./services/global/TelegramGlobalService";

const baseServices = {
  authService: inject<AuthService>(TYPES.authService),
  loggerService: inject<LoggerService>(TYPES.loggerService),
  scraperService: inject<ScraperService>(TYPES.scraperService),
};

const globalServices = {
  telegramGlobalService: inject<TelegramGlobalService>(TYPES.telegramGlobalService),
};

export const lib = {
  ...baseServices,
  ...globalServices,
};

init();

export default lib;
