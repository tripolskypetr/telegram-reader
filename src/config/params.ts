declare function parseInt(value: unknown): number;

const GLOBAL_CONFIG = {
  CC_TELEGRAM_API_ID: 0,
  CC_TELEGRAM_API_HASH: "",
};

export const DEFAULT_CONFIG = Object.freeze({ ...GLOBAL_CONFIG });

export type Config = typeof GLOBAL_CONFIG;

export const getConfig = () => {
  const config = {
    CC_TELEGRAM_API_ID: parseInt(process.env.CC_TELEGRAM_API_ID) || 31861455,
    CC_TELEGRAM_API_HASH: process.env.CC_TELEGRAM_API_HASH || "ca60446c67ce250ee4e789c730163449",
  };
  if (GLOBAL_CONFIG.CC_TELEGRAM_API_ID) {
    config.CC_TELEGRAM_API_ID = GLOBAL_CONFIG.CC_TELEGRAM_API_ID;
  }
  if (GLOBAL_CONFIG.CC_TELEGRAM_API_HASH) {
    config.CC_TELEGRAM_API_HASH = GLOBAL_CONFIG.CC_TELEGRAM_API_HASH;
  }
  return config;
};

export const setConfig = (config: Partial<Config>) => {
  Object.assign(GLOBAL_CONFIG, config);
};
