import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateSpec } from '../src/site/spec.js';
import { buildSpecFromAnalysis } from '../src/site/build-spec-from-analysis.js';

const FIXTURE_DIR = path.join(process.cwd(), 'test', 'fixtures');
const FIXTURE_FILES = [
  'sushi-restaurant.json',
  'plumber.json',
  'family-law-firm.json',
  'dental-clinic.json',
  'boutique-clothing-shop.json',
  'b2b-saas.json',
  'wedding-photographer.json',
  'nonprofit-food-bank.json',
  'yoga-studio.json',
  'digital-agency.json',
];

for (const file of FIXTURE_FILES) {
  const name = file.replace('.json', '');
  test(`fixture ${name} builds a valid spec`, () => {
    const raw = fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8');
    const analysis = JSON.parse(raw);
    const spec = buildSpecFromAnalysis(analysis);
    const validation = validateSpec(spec);
    assert.equal(validation.ok, true, `${name}: spec validates. Errors: ${JSON.stringify(validation.errors)}`);
  });
}
