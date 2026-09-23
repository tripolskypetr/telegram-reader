import type { Dimension } from "get-moment-stamp";

export const DAY_MS = 24 * 60 * 60 * 1_000;

// Длительности измерений в миллисекундах, совместимы с get-moment-stamp
export const DIMENSION_DELTA: Record<Dimension, number> = {
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: DAY_MS,
};

// Индекс UTC-дня: сутки UTC выровнены по эпохе, floor даёт номер дня.
// Границы дня совпадают с UTC-границами scrapeDay
export const dayStampUtc = (when: Date) => Math.floor(when.getTime() / DAY_MS);
