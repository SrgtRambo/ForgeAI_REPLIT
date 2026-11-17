import { test } from 'node:test';
import assert from 'node:assert/strict';

import { chromiumAvailable, BANNED_PATTERNS } from '../src/qa/index.js';
test('BANNED_PATTERNS catches banned phrases', () => {
  assert.ok(BANNED_PATTERNS.test('lorem ipsum dolor'));
  assert.ok(BANNED_PATTERNS.test('click here to continue'));
  assert.ok(BANNED_PATTERNS.test('unlock your potential'));
  assert.ok(BANNED_PATTERNS.test('seamless integration'));
  assert.ok(BANNED_PATTERNS.test('revolutionary product'));
  assert.ok(BANNED_PATTERNS.test('game changer'));
  assert.ok(BANNED_PATTERNS.test('{{ variable }}'));
  assert.ok(BANNED_PATTERNS.test('[insert text]'));
  assert.ok(!BANNED_PATTERNS.test('Fast plumbing repairs for homeowners.'));
});

test('chromiumAvailable returns a boolean', () => {
  const available = chromiumAvailable();
  assert.equal(typeof available, 'boolean');
});

test('gate logic: all ok passes', () => {
  const pages = [{
    errors: [],
    overflow: false,
    axeViolations: [],
    bannedText: [],
  }];
  const critic = { scores: { layout: 8, typography: 8, imagery: 8, originality: 8, professionalism: 8 } };
  const allOk = pages.every((p) => !p.errors.length && !p.overflow && !p.axeViolations.length && !p.bannedText.length);
  const criticOk = Object.values(critic.scores).every((s) => s >= 7);
  assert.equal(allOk, true);
  assert.equal(criticOk, true);
});

test('gate logic: console error fails', () => {
  const pages = [{ errors: ['404'], overflow: false, axeViolations: [], bannedText: [] }];
  const allOk = pages.every((p) => !p.errors.length && !p.overflow && !p.axeViolations.length && !p.bannedText.length);
  assert.equal(allOk, false);
});

test('gate logic: overflow fails', () => {
  const pages = [{ errors: [], overflow: true, axeViolations: [], bannedText: [] }];
  const allOk = pages.every((p) => !p.errors.length && !p.overflow && !p.axeViolations.length && !p.bannedText.length);
  assert.equal(allOk, false);
});

test('gate logic: axe violation fails', () => {
  const pages = [{ errors: [], overflow: false, axeViolations: ['color-contrast (serious)'], bannedText: [] }];
  const allOk = pages.every((p) => !p.errors.length && !p.overflow && !p.axeViolations.length && !p.bannedText.length);
  assert.equal(allOk, false);
});

test('gate logic: banned text fails', () => {
  const pages = [{ errors: [], overflow: false, axeViolations: [], bannedText: ['lorem ipsum'] }];
  const allOk = pages.every((p) => !p.errors.length && !p.overflow && !p.axeViolations.length && !p.bannedText.length);
  assert.equal(allOk, false);
});

test('gate logic: critic score below 7 fails', () => {
  const critic = { scores: { layout: 6, typography: 8, imagery: 8, originality: 8, professionalism: 8 } };
  const criticOk = Object.values(critic.scores).every((s) => s >= 7);
  assert.equal(criticOk, false);
});
