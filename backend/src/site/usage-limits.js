const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

function prune(times, after) {
  let index = 0;
  while (index < times.length && times[index] <= after) index += 1;
  if (index) times.splice(0, index);
  return times;
}

function retryAfter(times, now, windowMs) {
  const first = times[0] ?? now;
  return Math.max(1, Math.ceil((first + windowMs - now) / 1000));
}

/** Rolling, in-process caps for the single Replit backend instance. */
export function createSiteUsageLimiter({
  now = Date.now,
  perUserMinute = 1,
  perUserDay = 3,
  perIpDay = 5,
  globalPerDay = 20,
} = {}) {
  const users = new Map();
  const ips = new Map();
  const global = [];

  return {
    consume({ userId, ip }) {
      const time = now();
      prune(global, time - DAY_MS);
      const userTimes = prune(users.get(userId) ?? [], time - DAY_MS);
      const ipTimes = prune(ips.get(ip || 'unknown') ?? [], time - DAY_MS);
      const userMinute = userTimes.filter((timestamp) => timestamp > time - MINUTE_MS);

      if (global.length >= globalPerDay) {
        return { allowed: false, reason: 'daily-cap', retryAfterSeconds: retryAfter(global, time, DAY_MS) };
      }
      if (userMinute.length >= perUserMinute) {
        return { allowed: false, reason: 'minute', retryAfterSeconds: retryAfter(userMinute, time, MINUTE_MS) };
      }
      if (userTimes.length >= perUserDay) {
        return { allowed: false, reason: 'daily-user', retryAfterSeconds: retryAfter(userTimes, time, DAY_MS) };
      }
      if (ipTimes.length >= perIpDay) {
        return { allowed: false, reason: 'daily-ip', retryAfterSeconds: retryAfter(ipTimes, time, DAY_MS) };
      }

      userTimes.push(time);
      ipTimes.push(time);
      global.push(time);
      users.set(userId, userTimes);
      ips.set(ip || 'unknown', ipTimes);
      return {
        allowed: true,
        remainingForUser: Math.max(0, perUserDay - userTimes.length),
        remainingGlobal: Math.max(0, globalPerDay - global.length),
      };
    },
  };
}
