const baseServices = {
    authService: Symbol('authService'),
    loggerService: Symbol('loggerService'),
    scraperService: Symbol('scraperService'),
};

const globalServices = {
    telegramGlobalService: Symbol('telegramGlobalService'),
}

const cacheServices = {
    telegramCacheService: Symbol('telegramCacheService'),
}

export const TYPES = {
    ...baseServices,
    ...globalServices,
    ...cacheServices,
}

export default TYPES;
