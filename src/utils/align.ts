const MS_PER_MINUTE = 60_000;

export const alignToMinute = (
  date: Date,
): number => {
  return Math.floor(date.getTime() / MS_PER_MINUTE) * MS_PER_MINUTE;
};
