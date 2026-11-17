// Section catalog: every section type and the variants it supports.
// Used by spec validation (Phase 1), section rendering (Phase 2), and the builder (Phase 6).
// Variants are intentional design choices, not free-form layout.

export const SECTION_CATALOG = {
  nav: ['split', 'centered', 'minimal'],
  hero: ['split-image', 'full-bleed', 'editorial'],
  services: ['grid-cards', 'numbered-list', 'alternating-rows'],
  feature: ['image-left', 'image-right', 'stacked'],
  testimonials: ['quote-large', 'cards'],
  stats: ['row', 'band'],
  process: ['steps-horizontal', 'steps-vertical'],
  team: ['initial-cards', 'photo-cards'],
  gallery: ['masonry', 'grid'],
  menu: ['categories-tabs', 'two-column-list'],
  pricing: ['three-tier', 'single-plan'],
  faq: ['accordion'],
  contact: ['form-split', 'form-centered'],
  booking: ['inline-form'],
  cta: ['band', 'card'],
  footer: ['columns', 'minimal'],
};

export const SECTION_TYPES = Object.keys(SECTION_CATALOG);

export function sectionVariants(type) {
  return SECTION_CATALOG[type] || [];
}

export function isValidSection(type, variant) {
  const variants = SECTION_CATALOG[type];
  return Boolean(variants && variants.includes(variant));
}
