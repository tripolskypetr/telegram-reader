import { Logger, LogLevel } from "telegram/extensions/Logger";
import { lib } from "../lib";

/**
 * Перенаправляет внутренние логи gramjs (TelegramClient) в lib.loggerService
 * вместо stdout. По умолчанию LoggerService содержит noop-логгер, так что
 * клиент молчит, пока потребитель не вызовет setLogger.
 */
class TelegramLogger extends Logger {
  public log(level: LogLevel, message: string, _color: string) {
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      lib.loggerService.warn(`telegram ${level}`, message);
      return;
    }
    if (level === LogLevel.DEBUG) {
      lib.loggerService.debug(`telegram ${level}`, message);
      return;
    }
    lib.loggerService.info(`telegram ${level}`, message);
  }
}

export const createTelegramLogger = () => new TelegramLogger(LogLevel.INFO);
