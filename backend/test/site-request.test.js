import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateSiteRequest } from '../src/site/request.js';
import { createSiteUsageLimiter } from '../src/site/usage-limits.js';

const validRequest = {
  businessName: 'Summit Plumbing',
  industry: 'Home services',
  location: 'Denver',
  description: 'A clear website for local plumbing repairs and fixture installation.',
  brandColors: ['#112233', '#abcdef'],
};

test('site request accepts bounded business details and normalized colors', () => {
  const result = validateSiteRequest(validRequest);
  assert.equal(result.businessName, validRequest.businessName);
  assert.deepEqual(result.brandColors, ['#112233', '#abcdef']);
});

test('site request rejects short or oversized descriptions and invalid colors', () => {
  assert.throws(() => validateSiteRequest({ ...validRequest, description: 'Too short.' }), /at least 30/);
  assert.throws(() => validateSiteRequest({ ...validRequest, description: 'x'.repeat(3001) }), /at most 3000/);
  assert.throws(() => validateSiteRequest({ ...validRequest, brandColors: ['red'] }), /hex colors/);
});

test('site generation limits enforce per-minute, per-user, per-IP, and global caps', () => {
  let time = 1_000_000;
  const limiter = createSiteUsageLimiter({
    now: () => time,
    perUserMinute: 1,
    perUserDay: 2,
    perIpDay: 3,
    globalPerDay: 2,
  });
  const first = limiter.consume({ userId: 'u1', ip: 'ip1' });
  assert.equal(first.allowed, true);
  assert.equal(limiter.consume({ userId: 'u1', ip: 'ip1' }).reason, 'minute');

  time += 60_001;
  assert.equal(limiter.consume({ userId: 'u1', ip: 'ip1' }).allowed, true);
  assert.equal(limiter.consume({ userId: 'u2', ip: 'ip2' }).reason, 'daily-cap');

  time += 24 * 60 * 60_000;
  assert.equal(limiter.consume({ userId: 'u2', ip: 'ip2' }).allowed, true);
});
