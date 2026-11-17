import { getSqlClient } from "./db";

export async function countAiRequests(userId: string, since: Date) {
  const [row] = await getSqlClient()`
    select count(*)::int as count
    from ai_requests
    where user_id = ${userId}
      and created_at > ${since}
  `;
  return Number(row?.count ?? 0);
}

export async function claimAiRequest(userId: string, perMinute: number, perDay: number) {
  return getSqlClient().begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(hashtext(${userId}))`;
    const [counts] = await transaction`
      select
        count(*) filter (where created_at > now() - interval '1 minute')::int as minute_count,
        count(*) filter (where created_at > now() - interval '1 day')::int as day_count
      from ai_requests
      where user_id = ${userId}
    `;
    const minuteCount = Number(counts?.minute_count ?? 0);
    const dayCount = Number(counts?.day_count ?? 0);

    if (minuteCount >= perMinute) return { allowed: false, reason: "minute", usedToday: dayCount };
    if (dayCount >= perDay) return { allowed: false, reason: "day", usedToday: dayCount };

    await transaction`insert into ai_requests (user_id) values (${userId})`;
    await transaction`delete from ai_requests where user_id = ${userId} and created_at < now() - interval '2 days'`;
    return { allowed: true, usedToday: dayCount + 1 };
  });
}
