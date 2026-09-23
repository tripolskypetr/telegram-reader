import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import ScraperService from "../base/ScraperService";
import { type Dimension } from "get-moment-stamp";
import { ttl } from "functools-kit";

import {
  DAY_MS,
  DIMENSION_DELTA,
  dayStampUtc,
} from "../../../utils/datetime";

// TTL дневного кеша: повторные обращения в пределах таймаута отдаются
// без похода в Telegram; длиннее живого — завершённые дни неизменны
const TTL_TIMEOUT = 15 * 60 * 1_000;

/**
 * Отдаёт историю канала строго из кеша завершённых дней. Никаких живых
 * докачиваний: запрос, выходящий в текущий день, — ошибка вызывающего.
 * Решение "кеш или живой скрейпер" принимает TelegramGlobalService.
 */
export class TelegramCacheService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly scraperService = inject<ScraperService>(TYPES.scraperService);

  // Кеш завершённых дней: повторные обращения в пределах TTL_TIMEOUT
  // отдаются без похода в Telegram
  private cacheDay = ttl(
    async (channel: string, when: Date) => {
      return await this.scraperService.scrapeDay({
        channel,
        when,
      });
    },
    {
      timeout: TTL_TIMEOUT,
      key: ([channel, when]) => `${channel}-${dayStampUtc(when)}`,
    },
  );

  public scrapeDay = async (dto: { channel: string; when: Date }) => {
    this.loggerService.log("telegramCacheService scrapeDay", {
      dto,
    });
    if (dayStampUtc(dto.when) >= dayStampUtc(new Date())) {
      throw new Error(
        `telegram-reader TelegramCacheService scrapeDay: day ${dto.when.toISOString()} is not finished yet, cache holds completed days only`,
      );
    }
    try {
      return await this.cacheDay(dto.channel, dto.when);
    } finally {
      // Уборка протухших дневных записей, фонового таймера у ttl нет
      this.cacheDay.gc();
    }
  };

  public scrapeLookback = async (dto: {
    channel: string;
    when: Date;
    limit: number;
    dimension?: Dimension;
  }) => {
    this.loggerService.log("telegramCacheService scrapeLookback", {
      dto,
    });

    const todayStart = dayStampUtc(new Date()) * DAY_MS;

    if (dto.when.getTime() > todayStart) {
      throw new Error(
        `telegram-reader TelegramCacheService scrapeLookback: window [.., ${dto.when.toISOString()}) reaches into the current day, cache holds completed days only`,
      );
    }

    const windowStart =
      dto.when.getTime() -
      dto.limit * DIMENSION_DELTA[dto.dimension ?? "minute"];

    const rows: Awaited<ReturnType<typeof this.cacheDay>> = [];

    try {
      // Дни окна от новых к старым, с фильтрацией по границам [windowStart, when)
      const lastDay = dayStampUtc(new Date(dto.when.getTime() - 1));
      const firstDay = Math.floor(windowStart / DAY_MS);

      for (let day = lastDay; day >= firstDay; day--) {
        const messages = await this.cacheDay(dto.channel, new Date(day * DAY_MS));
        rows.push(
          ...messages.filter(({ date }) => {
            const ts = date.getTime();
            return ts >= windowStart && ts < dto.when.getTime();
          }),
        );
      }
    } finally {
      // Уборка протухших дневных записей, фонового таймера у ttl нет
      this.cacheDay.gc();
    }

    return rows;
  };
}

export default TelegramCacheService;
