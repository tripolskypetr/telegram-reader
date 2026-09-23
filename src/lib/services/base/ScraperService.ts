import { inject } from "../../core/di";
import LoggerService from "../base/LoggerService";
import TYPES from "../../core/types";
import { getTelegram } from "../../../config/telegram";
import { ScraperMessage } from "../../../model/ScraperMessage.model";
import { execpool, pickDocuments, queued, ttl } from "functools-kit";
import type { Api } from "telegram";
import sharp from "sharp";
import type { Dimension } from "get-moment-stamp";
import { DIMENSION_DELTA, dayStampUtc } from "../../../utils/datetime";
import { alignToMinute } from "../../../utils/align";

// Целевая ширина превью: 800px — середина телеграмовской прогрессии размеров
// (320/800/1280/2560). На 320px текст мылится, ретина-размеры (1280+) для
// чтения избыточны; 800px — чёткий текст карточек при умеренном весе.
const PHOTO_THUMB_WIDTH = 800;

// Качество JPEG после ужатия. 80 — порог, ниже которого на скриншотах бирж
// начинают сыпаться тонкие цифры в таблицах позиций.
const PHOTO_JPEG_QUALITY = 80;

// Ограничение обработки фото одновременно чтобы не получить OOM на слабом железе
const MAX_EXEC = 5;

// Даем задержку чтобы кластер пришел в норму
const EXEC_DELAY = 100;

// TTL живых кешей: короткий, потому что данные ещё пополняются; длинное
// кеширование завершённых дней — забота TelegramCacheService
const TTL_TIMEOUT = 60 * 1_000;

/**
 * Скачивает фото поста и ужимает его до PHOTO_THUMB_WIDTH.
 *
 * Скачиваем ВСЕГДА полный размер, без опции thumb. Телеграм отдаёт крупные
 * фото как PhotoSizeProgressive, а downloadMedia({ thumb }) на прогрессивном
 * размере возвращает пусто — из-за этого превью молча терялись, и посты со
 * скриншотами доходили до агента без картинки. Ресайз делаем на своей
 * стороне: это дороже по трафику, но детерминированно.
 *
 * @param message - Сообщение канала с фото
 * @returns JPEG-буфер ужатого превью либо null, если скачать не удалось
 */
const DOWNLOAD_MEDIA_FN = execpool(
  async (self: ScraperService, message: Api.Message): Promise<Buffer | null> => {
    const client = await getTelegram();
    const media = await client.downloadMedia(message);
    if (!media) {
      self.loggerService.warn(`ScraperService download failed for message=${message.id}`);
      return null;
    }
    const source = Buffer.isBuffer(media) ? media : Buffer.from(media);
    try {
      self.loggerService.warn(
        `ScraperService resize begin for message=${message.id}`
      );
      return await sharp(source)
        .rotate()
        .resize({ width: PHOTO_THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: PHOTO_JPEG_QUALITY })
        .toBuffer();
    } catch (error) {
      // Ужатие — оптимизация, а не обязательный шаг: пусть агент получит
      // тяжёлый оригинал, чем ничего
      self.loggerService.warn(
        `ScraperService resize failed for message=${message.id}, using original`,
        error,
      );
      return source;
    }
  },
  {
    maxExec: MAX_EXEC,
    delay: EXEC_DELAY,
  }
);

const SCRAPE_DAY_FN = ttl(
  async (
    self: ScraperService,
    dto: {
      channel: string;
      when: Date;
    },
  ): Promise<ScraperMessage[]> => {
    const client = await getTelegram();

    const dayStart = new Date(dto.when);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(dto.when);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const rows: ScraperMessage[] = [];

    for await (const message of client.iterMessages(dto.channel, {
      offsetDate: Math.floor(dayEnd.getTime() / 1000) + 1,
      reverse: false,
    })) {
      if (!message.message && !message.photo) {
        continue;
      }
      const ts = message.date * 1000;
      if (ts < dayStart.getTime()) {
        break;
      }
      let photo: string | null = null;
      if (message.photo) {
        const media = await DOWNLOAD_MEDIA_FN(self, message);
        photo = media ? media.toString("base64") : null;
      }
      rows.push({
        id: message.id,
        content: message.message || "",
        channel: dto.channel,
        photo,
        date: new Date(ts),
      });
    }
    return rows;
  },
  {
    timeout: TTL_TIMEOUT,
    // От when важна только дата — ключ по UTC-дню
    key: ([, dto]) => `${dto.channel}-${dayStampUtc(dto.when)}`,
  },
);

const SCRAPE_LOOKBACK_FN = ttl(
  async (
    self: ScraperService,
    dto: {
      channel: string;
      when: Date;
      limit: number;
      dimension?: Dimension;
    },
  ): Promise<ScraperMessage[]> => {
    const client = await getTelegram();

    // Подсчёт ведём в минутах: любое измерение сначала приводим к минутам,
    // затем к миллисекундам — так окно для minute/hour/day считается одинаково
    const minutes =
      (dto.limit * DIMENSION_DELTA[dto.dimension ?? "minute"]) /
      DIMENSION_DELTA.minute;
    const windowStart = dto.when.getTime() - minutes * DIMENSION_DELTA.minute;

    const rows: ScraperMessage[] = [];

    // offsetDate без +1: телеграм отдаёт посты строго старше when,
    // пост с датой == when в окно не попадает — он ещё «не виден»
    for await (const message of client.iterMessages(dto.channel, {
      offsetDate: Math.floor(dto.when.getTime() / 1000),
      reverse: false,
    })) {
      if (!message.message && !message.photo) {
        continue;
      }
      const ts = message.date * 1000;
      if (ts < windowStart) {
        break;
      }
      let photo: string | null = null;
      if (message.photo) {
        const media = await DOWNLOAD_MEDIA_FN(self, message);
        photo = media ? media.toString("base64") : null;
      }
      rows.push({
        id: message.id,
        content: message.message || "",
        channel: dto.channel,
        photo,
        date: new Date(ts),
      });
    }
    return rows;
  },
  {
    timeout: TTL_TIMEOUT,
    // when округлён вниз до минуты — повторные вызовы с теми же параметрами
    // в пределах минуты бьют в кеш
    key: ([, dto]) =>
      `${dto.channel}-${alignToMinute(dto.when)}-${dto.limit}-${dto.dimension ?? "minute"}`,
  },
);

const SCRAPE_PAGE_FN = ttl(
  async (
    self: ScraperService,
    dto: {
      channel: string;
      limit: number;
      offset: number;
      when: Date;
    },
  ): Promise<ScraperMessage[]> => {
    const client = await getTelegram();

    const iter = pickDocuments<ScraperMessage>(dto.limit, dto.offset);

    for await (const message of client.iterMessages(dto.channel, {
      offsetDate: Math.floor(dto.when.getTime() / 1000),
      reverse: false,
    })) {
      if (!message.message && !message.photo) {
        continue;
      }
      const ts = message.date * 1000;

      let photo: string | null = null;

      if (message.photo) {
        const media = await DOWNLOAD_MEDIA_FN(self, message);
        photo = media ? media.toString("base64") : null;
      }

      const chunk: ScraperMessage[] = [];

      chunk.push({
        id: message.id,
        content: message.message || "",
        channel: dto.channel,
        date: new Date(ts),
        photo,
      });

      if (iter(chunk).done) {
        break;
      }
    }

    return iter().rows;
  },
  {
    timeout: TTL_TIMEOUT,
    // when округлён вниз до минуты — повторные вызовы с теми же параметрами
    // в пределах минуты бьют в кеш
    key: ([, dto]) =>
      `${dto.channel}-${alignToMinute(dto.when)}-${dto.limit}-${dto.offset}`,
  },
);

type ScrapeAction =
  | { type: "day"; dto: Parameters<typeof SCRAPE_DAY_FN>[1] }
  | { type: "lookback"; dto: Parameters<typeof SCRAPE_LOOKBACK_FN>[1] }
  | { type: "page"; dto: Parameters<typeof SCRAPE_PAGE_FN>[1] };

// Единая точка входа во все походы в Telegram: queued сериализует вызовы,
// единовременно выполняется ровно один скрейп, остальные ждут своей очереди —
// параллельные iterMessages не молотят один MTProto-клиент одновременно
const SCRAPE_FN = queued(
  async (self: ScraperService, action: ScrapeAction): Promise<ScraperMessage[]> => {
    try {
      if (action.type === "day") {
        return await SCRAPE_DAY_FN(self, action.dto);
      }
      if (action.type === "lookback") {
        return await SCRAPE_LOOKBACK_FN(self, action.dto);
      }
      return await SCRAPE_PAGE_FN(self, action.dto);
    } finally {
      // Уборка протухших записей: ключи с alignToMinute повторно не
      // запрашиваются, без gc они копились бы до конца процесса
      SCRAPE_DAY_FN.gc();
      SCRAPE_LOOKBACK_FN.gc();
      SCRAPE_PAGE_FN.gc();
    }
  },
);

export class ScraperService {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public scrapeDay = async (dto: {
    channel: string;
    when: Date;
  }): Promise<ScraperMessage[]> => {
    this.loggerService.log("scraperService scrapeDay", {
      dto,
    });
    // cancel() у очереди не используется, CANCELED_PROMISE_SYMBOL недостижим
    return (await SCRAPE_FN(this, { type: "day", dto })) as ScraperMessage[];
  };

  public scrapeLookback = async (dto: {
    channel: string;
    when: Date;
    limit: number;
    dimension?: Dimension;
  }): Promise<ScraperMessage[]> => {
    this.loggerService.log("scraperService scrapeLookback", {
      dto,
    });
    // when выравниваем до минуты, чтобы результат соответствовал ключу кеша,
    // а не секундам первого вызвавшего
    return (await SCRAPE_FN(this, {
      type: "lookback",
      dto: { ...dto, when: new Date(alignToMinute(dto.when)) },
    })) as ScraperMessage[];
  };

  public scrapePage = async (dto: {
    channel: string;
    limit: number;
    offset: number;
    when: Date;
  }): Promise<ScraperMessage[]> => {
    this.loggerService.log("scraperService scrapePage", {
      dto,
    });
    // when выравниваем до минуты, чтобы результат соответствовал ключу кеша,
    // а не секундам первого вызвавшего
    return (await SCRAPE_FN(this, {
      type: "page",
      dto: { ...dto, when: new Date(alignToMinute(dto.when)) },
    })) as ScraperMessage[];
  };
}

export default ScraperService;
