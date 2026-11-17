import { test } from 'node:test';
import assert from 'node:assert/strict';

// Import every section module directly.
import { variants as navVariants } from '../src/site/sections/nav.js';
import { variants as heroVariants } from '../src/site/sections/hero.js';
import { variants as servicesVariants } from '../src/site/sections/services.js';
import { variants as featureVariants } from '../src/site/sections/feature.js';
import { variants as testimonialsVariants } from '../src/site/sections/testimonials.js';
import { variants as statsVariants } from '../src/site/sections/stats.js';
import { variants as processVariants } from '../src/site/sections/process.js';
import { variants as teamVariants } from '../src/site/sections/team.js';
import { variants as galleryVariants } from '../src/site/sections/gallery.js';
import { variants as menuVariants } from '../src/site/sections/menu.js';
import { variants as pricingVariants } from '../src/site/sections/pricing.js';
import { variants as faqVariants } from '../src/site/sections/faq.js';
import { variants as contactVariants } from '../src/site/sections/contact.js';
import { variants as bookingVariants } from '../src/site/sections/booking.js';
import { variants as ctaVariants } from '../src/site/sections/cta.js';
import { variants as footerVariants } from '../src/site/sections/footer.js';

const VARIANTS = {
  nav: navVariants,
  hero: heroVariants,
  services: servicesVariants,
  feature: featureVariants,
  testimonials: testimonialsVariants,
  stats: statsVariants,
  process: processVariants,
  team: teamVariants,
  gallery: galleryVariants,
  menu: menuVariants,
  pricing: pricingVariants,
  faq: faqVariants,
  contact: contactVariants,
  booking: bookingVariants,
  cta: ctaVariants,
  footer: footerVariants,
};

const CTX = {
  content: {
    heading: 'Test heading',
    body: 'Test body copy.',
    brand: 'Test Business',
    businessName: 'Test Business',
    imageId: 'img-1',
    imageAlt: 'A test photo.',
    stat: '10+',
    statLabel: 'years',
    items: [{ heading: 'Item one', body: 'Description one.' }, { heading: 'Item two', body: 'Description two.' }],
    quotes: [{ text: 'Great service.', name: 'Sam', role: 'Owner' }],
    links: [{ label: 'Home', href: '/' }],
    members: [{ name: 'Sam Lee', role: 'Owner', bio: 'Founder.' }],
    plans: [{ name: 'Starter', price: '$9', description: 'Simple plan.', features: ['One', 'Two'], buttonLabel: 'Buy', buttonHref: '#' }],
    categories: [{ label: 'Starters', items: [{ name: 'Soup', price: '$6', description: 'Tasty.' }] }],
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true }],
    steps: [{ heading: 'Step one', body: 'Do this.' }, { heading: 'Step two', body: 'Do that.' }],
  },
  images: { 'img-1': 'assets/images/test.jpg' },
  palette: { bg: '#ffffff', surface: '#f5f5f5', ink: '#111111', muted: '#666666', brand: '#0066cc', accent: '#ff9900' },
  fonts: { display: 'modern-grotesk', body: 'Inter' },
  density: 'regular',
  motion: 'subtle',
};

function variantCases() {
  const cases = [];
  for (const [type, variants] of Object.entries(VARIANTS)) {
    for (const [name] of Object.entries(variants)) {
      cases.push({ type, variant: name, render: variants[name].render });
    }
  }
  return cases;
}

// Minimal well-formedness check: tags are balanced and properly nested.
function isWellFormed(html) {
  const voidElements = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'col', 'hr']);
  const stack = [];
  const tagRe = /<\s*(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    const isClose = match[1] === '/';
    const tag = match[2].toLowerCase();
    if (voidElements.has(tag)) continue;
    if (isClose) {
      if (stack.length === 0 || stack[stack.length - 1] !== tag) return false;
      stack.pop();
    } else {
      stack.push(tag);
    }
  }
  return stack.length === 0;
}
function hasInlineHexColor(html) {
  // style="..." attributes containing a hex color #rrggbb
  return /style\s*=\s*["'][^"']*#[0-9a-f]{6}[^"']*["']/i.test(html);
}
function hasEventHandler(html) {
  return /\bon[a-z]+\s*=/i.test(html);
}
function h1Count(html) {
  const re = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  let count = 0;
  let m;
  while ((m = re.exec(html)) !== null) count++;
  return count;
}

test('every section variant renders without throwing', () => {
  for (const { type, variant, render } of variantCases()) {
    assert.doesNotThrow(() => render(CTX), `${type}/${variant} should render`);
  }
});

test('every section variant returns a string', () => {
  for (const { type, variant, render } of variantCases()) {
    const result = render(CTX);
    assert.equal(typeof result, 'string', `${type}/${variant} should return a string`);
  }
});

test('every section variant produces well-formed HTML', () => {
  for (const { type, variant, render } of variantCases()) {
    const html = render(CTX);
    assert.equal(isWellFormed(html), true, `${type}/${variant} HTML should be well-formed`);
  }
});

test('no section variant uses inline hex colors in style attributes', () => {
  for (const { type, variant, render } of variantCases()) {
    const html = render(CTX);
    assert.equal(hasInlineHexColor(html), false, `${type}/${variant} should not use inline hex colors`);
  }
});

test('no section variant uses inline event handlers', () => {
  for (const { type, variant, render } of variantCases()) {
    const html = render(CTX);
    assert.equal(hasEventHandler(html), false, `${type}/${variant} should not use inline event handlers`);
  }
});

test('hero variant renders exactly one h1', () => {
  for (const [name, variant] of Object.entries(heroVariants)) {
    const html = variant.render(CTX);
    assert.equal(h1Count(html), 1, `hero/${name} should have exactly one h1`);
  }
});

test('nav section renders a nav element with links', () => {
  const html = navVariants.split.render(CTX);
  assert.ok(/<nav\b/i.test(html), 'nav should render a <nav> element');
  assert.ok(/<a\b/i.test(html), 'nav should render links');
});

test('testimonials with no quotes returns empty string', () => {
  const noQuotes = { ...CTX, content: { ...CTX.content, quotes: [] } };
  for (const [name, variant] of Object.entries(testimonialsVariants)) {
    assert.equal(variant.render(noQuotes), '', `testimonials/${name} with no quotes returns empty`);
  }
});

test('stats with no items returns empty string', () => {
  const noItems = { ...CTX, content: { ...CTX.content, items: [] } };
  for (const [name, variant] of Object.entries(statsVariants)) {
    assert.equal(variant.render(noItems), '', `stats/${name} with no items returns empty`);
  }
});

test('team photo-cards falls back to initial-cards when photo missing', () => {
  const noPhoto = { ...CTX, content: { ...CTX.content, members: [{ name: 'Sam', role: 'Owner', photoImageId: 'missing' }] } };
  const html = teamVariants['photo-cards'].render(noPhoto);
  assert.ok(/initials/.test(html) || /avatar/.test(html), 'team photo-cards should fall back gracefully');
});

test('every image rendered has an alt attribute', () => {
  const html = heroVariants['split-image'].render(CTX);
  const imgRe = /<img\b[^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    assert.ok(/alt\s*=/i.test(m[0]), `every img should have alt: ${m[0]}`);
  }
});

test('booking form has labels for every field', () => {
  const html = bookingVariants['inline-form'].render(CTX);
  const inputRe = /<(input|select|textarea)\b[^>]*id="([^"]+)"/gi;
  let m;
  while ((m = inputRe.exec(html)) !== null) {
    const fieldId = m[2];
    assert.ok(`for="${fieldId}"`.toLowerCase() !== 'for=""', `field ${fieldId} should have a label`);
    assert.ok(new RegExp(`for="${fieldId}"`).test(html), `label for=${fieldId} should exist`);
  }
});
