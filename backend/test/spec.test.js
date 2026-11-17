import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSpec, SPEC_VERSION } from '../src/site/spec.js';

function baseSpec() {
  return {
    version: SPEC_VERSION,
    meta: {
      businessName: 'Summit Plumbing',
      tagline: 'Reliable pipe repairs since 2010.',
      industry: 'Home Services',
      businessType: 'service',
      locale: 'en',
      description: 'Local plumbing repairs and installations.',
    },
    brief: {
      offer: 'Emergency plumbing repairs and fixture installation.',
      audience: 'Homeowners in the metro area.',
      primaryAction: 'contact',
      tone: ['friendly', 'direct'],
      avoid: [],
    },
    unknowns: ['Confirm the service area radius.'],
    design: {
      palette: { bg: '#ffffff', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' },
      fonts: { display: 'modern-grotesk', body: 'Inter' },
      radius: 'soft',
      density: 'regular',
      motion: 'subtle',
      imageStyle: 'natural',
    },
    nav: [{ label: 'Home', href: '/' }, { label: 'Contact', href: '/contact' }],
    pages: [
      {
        slug: 'index',
        title: 'Summit Plumbing',
        description: 'Local plumbing repairs.',
        sections: [
          { type: 'nav', variant: 'split', content: {} },
          { type: 'hero', variant: 'split-image', content: { heading: 'Fast plumbing help', body: 'We fix leaks and install fixtures.', imageId: 'img-1' } },
          { type: 'services', variant: 'grid-cards', content: { heading: 'Our services', body: 'Repairs, installs, and inspections.' } },
          { type: 'contact', variant: 'form-split', content: { heading: 'Get in touch', body: 'Call or message us today.' } },
          { type: 'footer', variant: 'minimal', content: {} },
        ],
      },
    ],
    images: [
      { id: 'img-1', slot: 'hero', purpose: 'Hero background', query: 'plumber fixing a pipe', aspect: 'landscape', alt: 'A plumber working on a pipe', source: 'stock' },
    ],
    forms: [
      { id: 'contact-1', purpose: 'General enquiry', fields: [{ name: 'name', label: 'Your name', type: 'text', required: true }], submitLabel: 'Send', successMessage: 'Thanks, we will reply soon.' },
    ],
    team: [],
    seo: { keywords: ['plumber', 'repairs'], localBusiness: false },
  };
}

test('SPEC_VERSION is 1', () => {
  assert.equal(SPEC_VERSION, 1);
});

test('a complete spec passes validation', () => {
  const result = validateSpec(baseSpec());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('invalid version fails', () => {
  const spec = baseSpec();
  spec.version = 2;
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('version')));
});

test('invalid hex color fails', () => {
  const spec = baseSpec();
  spec.design.palette.bg = 'not-a-color';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('bg')));
});

test('ink on bg below WCAG AA contrast fails', () => {
  const spec = baseSpec();
  spec.design.palette.ink = '#aaaaaa';
  spec.design.palette.bg = '#ffffff';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('4.5:1')));
});

test('muted on bg below WCAG AA contrast fails', () => {
  const spec = baseSpec();
  spec.design.palette.muted = '#eeeeee';
  spec.design.palette.bg = '#ffffff';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('muted on bg')));
});

test('brand on bg below 3:1 contrast fails', () => {
  const spec = baseSpec();
  spec.design.palette.brand = '#eeeeee';
  spec.design.palette.bg = '#ffffff';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('brand on bg')));
});

test('invalid font pairing fails', () => {
  const spec = baseSpec();
  spec.design.fonts.display = 'modern-grotesk';
  spec.design.fonts.body = 'not-a-font';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('font pairing')));
});

test('invalid section type fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections[1].type = 'not-a-type';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('type')));
});

test('invalid section variant fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections[1].variant = 'not-a-variant';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('variant')));
});

test('referenced image id that does not exist fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections[1].content.imageId = 'missing-id';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('referenced but does not exist')));
});

test('declared image id that is never used fails', () => {
  const spec = baseSpec();
  spec.images.push({ id: 'unused-id', slot: 'x', purpose: 'y', query: 'z', aspect: 'square', alt: 'x', source: 'stock' });
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('never used')));
});

test('page without hero first section fails', () => {
  const spec = baseSpec();
  // Move hero after services so the first non-nav section is not hero.
  const sections = spec.pages[0].sections;
  const hero = sections.find((s) => s.type === 'hero');
  sections.splice(sections.indexOf(hero), 1);
  sections.splice(2, 0, hero);
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('first section must be of type hero')));
});

test('page without footer or cta last section fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections.pop();
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('last section must be of type footer or cta')));
});

test('team section with empty team array fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections.splice(2, 0, { type: 'team', variant: 'initial-cards', content: { heading: 'Team' } });
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('team section requires a non-empty team')));
});

test('menu section with non-restaurant business type fails', () => {
  const spec = baseSpec();
  spec.meta.businessType = 'service';
  spec.pages[0].sections.splice(2, 0, { type: 'menu', variant: 'two-column-list', content: {} });
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('menu section is only allowed for restaurant')));
});

test('empty required meta field fails', () => {
  const spec = baseSpec();
  spec.meta.businessName = '';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('meta.businessName is required')));
});

test('heading over 300 characters fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections[1].content.heading = 'A'.repeat(301);
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('exceeds 300 characters')));
});

test('body over 1200 characters fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections[1].content.body = 'B'.repeat(1201);
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('exceeds 1200 characters')));
});

test('banned phrase in copy fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections[1].content.body = 'We unlock your potential with seamless service.';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('banned phrase')));
});

test('hero heading over 9 words fails', () => {
  const spec = baseSpec();
  spec.pages[0].sections[1].content.heading = 'This is a way too long hero heading for the page';
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('hero heading exceeds 9 words')));
});

test('three consecutive sections with same type and variant fails', () => {
  const spec = baseSpec();
  const dup = { type: 'feature', variant: 'stacked', content: { heading: 'x', body: 'y' } };
  spec.pages[0].sections = [spec.pages[0].sections[0], dup, { ...dup }, { ...dup }, spec.pages[0].sections[spec.pages[0].sections.length - 1]];
  const result = validateSpec(spec);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('repeat the same type/variant')));
});

test('valid restaurant spec with menu section passes', () => {
  const spec = baseSpec();
  spec.meta.businessType = 'restaurant';
  spec.pages[0].sections.splice(2, 0, { type: 'menu', variant: 'categories-tabs', content: { heading: 'Menu', body: 'Our dishes.' } });
  const result = validateSpec(spec);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('valid team section with non-empty team passes', () => {
  const spec = baseSpec();
  spec.team = [{ name: 'Sam', role: 'Owner', bio: '', photoImageId: null }];
  spec.pages[0].sections.splice(2, 0, { type: 'team', variant: 'initial-cards', content: { heading: 'Team' } });
  const result = validateSpec(spec);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});
