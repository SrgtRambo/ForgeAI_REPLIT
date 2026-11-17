import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contrastRatio, parseHex, validatePalette, repairPalette, derivePalette } from '../src/site/design/palette.js';
import { findBannedPhrase, isCleanCopy, scanBanned } from '../src/site/design/banned.js';
import { isValidFontPairing, findFontPairing, FONT_PAIRING_IDS } from '../src/site/design/fonts.js';
import { rootVariables, radiusToken, spaceToken } from '../src/site/design/tokens.js';

test('contrast ratio: black on white is 21:1', () => {
  const ratio = contrastRatio('#000000', '#ffffff');
  assert.equal(ratio.toFixed(2), '21.00');
});

test('contrast ratio: white on black is 21:1', () => {
  const ratio = contrastRatio('#ffffff', '#000000');
  assert.equal(ratio.toFixed(2), '21.00');
});

test('contrast ratio: #777 on white is below 4.5:1', () => {
  const ratio = contrastRatio('#777777', '#ffffff');
  assert.ok(ratio < 4.5, `#777 on white should be below 4.5:1, got ${ratio}`);
});

test('contrast ratio: same color is 1:1', () => {
  const ratio = contrastRatio('#ff0000', '#ff0000');
  assert.equal(ratio.toFixed(2), '1.00');
});

test('parseHex returns null for invalid input', () => {
  assert.equal(parseHex('not-a-color'), null);
  assert.equal(parseHex('#gggggg'), null);
  assert.deepEqual(parseHex('#ffffff'), [1, 1, 1]);
  assert.deepEqual(parseHex('#000000'), [0, 0, 0]);
});

test('validatePalette: valid palette passes', () => {
  const result = validatePalette({ bg: '#ffffff', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('validatePalette: invalid hex fails', () => {
  const result = validatePalette({ bg: 'not-hex', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('bg')));
});

test('validatePalette: ink on bg below 4.5:1 fails', () => {
  const result = validatePalette({ bg: '#ffffff', surface: '#f5f5f5', ink: '#aaaaaa', muted: '#666666', brand: '#0066cc', accent: '#ff9900' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('4.5')));
});

test('validatePalette: brand on bg below 3:1 fails', () => {
  const result = validatePalette({ bg: '#ffffff', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#eeeeee', accent: '#ff9900' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('3:1')));
});

test('validatePalette: bg and surface identical fails', () => {
  const result = validatePalette({ bg: '#ffffff', surface: '#ffffff', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('identical')));
});

test('repairPalette: fixes failing contrast', () => {
  const { palette, changed } = repairPalette({ bg: '#ffffff', surface: '#f5f5f5', ink: '#eeeeee', muted: '#666666', brand: '#eeeeee', accent: '#ff9900' });
  const result = validatePalette(palette);
  assert.equal(result.ok, true);
  assert.equal(changed, true);
});

test('repairPalette: valid palette unchanged', () => {
  const { palette, changed } = repairPalette({ bg: '#ffffff', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' });
  assert.equal(changed, false);
  assert.deepEqual(palette.ink, '#111111');
});

test('derivePalette: no customer colors returns null', () => {
  assert.equal(derivePalette(null), null);
  assert.equal(derivePalette({}), null);
});

test('derivePalette: customer colors with adjustment note', () => {
  const palette = derivePalette({ bg: '#ffffff', ink: '#eeeeee', brand: '#eeeeee' });
  assert.ok(palette, 'should return a palette');
  assert.ok(palette._adjusted, 'should be marked as adjusted');
  assert.ok(palette._adjustmentNote, 'should have adjustment note');
});

test('font pairing: valid pairing returns true', () => {
  assert.equal(isValidFontPairing('modern-grotesk', 'Inter'), true);
  assert.equal(isValidFontPairing('editorial-serif', 'Inter'), true);
});

test('font pairing: mismatched pairing returns false', () => {
  assert.equal(isValidFontPairing('modern-grotesk', 'Lora'), false);
});

test('font pairing: unknown pairing returns false', () => {
  assert.equal(isValidFontPairing('not-a-font', 'Inter'), false);
});

test('FONT_PAIRING_IDS has 10 entries', () => {
  assert.equal(FONT_PAIRING_IDS.size, 10);
});

test('findFontPairing returns the pairing object', () => {
  const p = findFontPairing('warm-serif');
  assert.ok(p);
  assert.equal(p.display, 'Playfair Display');
  assert.equal(p.body, 'Source Sans 3');
});

test('banned phrase: catches lorem ipsum', () => {
  assert.equal(findBannedPhrase('Lorem ipsum dolor sit amet'), 'lorem ipsum');
});

test('banned phrase: catches unlock', () => {
  assert.equal(findBannedPhrase('Unlock your potential'), 'unlock');
});

test('banned phrase: catches game changer', () => {
  assert.equal(findBannedPhrase('A game changer for your business'), 'game changer');
});

test('banned phrase: clean copy returns null', () => {
  assert.equal(findBannedPhrase('Fast plumbing repairs for local homeowners.'), null);
});

test('banned phrase: case insensitive', () => {
  assert.equal(findBannedPhrase('LOREM IPSUM'), 'lorem ipsum');
  assert.equal(findBannedPhrase('Revolutionary'), 'revolutionary');
});

test('isCleanCopy: true for clean text', () => {
  assert.equal(isCleanCopy('Reliable service you can trust.'), true);
});

test('isCleanCopy: false for banned text', () => {
  assert.equal(isCleanCopy('Click here to unlock savings.'), false);
});

test('scanBanned: returns hits with paths', () => {
  const hits = scanBanned({ heading: 'Click here now', body: 'Clean text here.' });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].phrase, 'click here');
});

test('rootVariables: generates CSS custom properties', () => {
  const css = rootVariables({
    palette: { bg: '#ffffff', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' },
    fonts: { display: 'modern-grotesk', body: 'Inter' },
    radius: 'soft',
    density: 'regular',
  });
  assert.ok(css.includes('--bg: #ffffff;'));
  assert.ok(css.includes('--brand: #0066cc;'));
  assert.ok(css.includes('--font-display:'));
  assert.ok(css.includes('--space-unit: 1rem;'));
});

test('radiusToken: maps radius values', () => {
  assert.equal(radiusToken('sharp'), '0.25rem');
  assert.equal(radiusToken('soft'), '0.75rem');
  assert.equal(radiusToken('round'), '1.5rem');
  assert.equal(radiusToken('unknown'), '0.75rem');
});

test('spaceToken: maps density values', () => {
  assert.equal(spaceToken('compact'), '0.85rem');
  assert.equal(spaceToken('regular'), '1rem');
  assert.equal(spaceToken('airy'), '1.25rem');
  assert.equal(spaceToken('unknown'), '1rem');
});
