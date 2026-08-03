/** Parse timestamp backend; LocalDateTime không có offset được quy ước là UTC. */
export function parseApiDate(value: string): Date {
  const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}
