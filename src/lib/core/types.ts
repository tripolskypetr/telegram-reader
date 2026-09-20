const baseServices = {
    authService: Symbol('authService'),
    loggerService: Symbol('loggerService'),
    scraperService: Symbol('scraperService'),
};

const globalServices = {
    telegramGlobalService: Symbol('telegramGlobalService'),
}

export const TYPES = {
    ...baseServices,
    ...globalServices,
}

export default TYPES;
