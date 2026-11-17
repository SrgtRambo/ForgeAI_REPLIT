// Forge AI site spec schema validator.
// A site.json spec must pass validateSpec() before it is built.
// Rules are strict: invalid specs never reach the renderer.

import { isValidFontPairing } from './design/fonts.js';
import { isValidSection, sectionVariants } from './catalog.js';

export const SPEC_VERSION = 1;

const PRIMARY_ACTIONS = new Set(['book', 'buy', 'apply', 'contact', 'enquire', 'subscribe']);
const RADIUS_VALUES = new Set(['sharp', 'soft', 'round']);
const DENSITY_VALUES = new Set(['compact', 'regular', 'airy']);
const MOTION_VALUES = new Set(['none', 'subtle']);
const IMAGE_STYLE_VALUES = new Set(['natural', 'warm', 'bright', 'moody', 'monochrome']);
const IMAGE_ASPECT_VALUES = new Set(['landscape', 'portrait', 'square']);
const IMAGE_SOURCE_VALUES = new Set(['stock', 'upload', 'url', 'none']);
const FIELD_TYPES = new Set(['text', 'email', 'tel', 'date', 'select', 'textarea']);
const BUSINESS_TYPES = new Set(['restaurant', 'service', 'retail', 'professional', 'health', 'creative', 'nonprofit', 'fitness', 'tech', 'other']);

const HEX_RE = /^#[0-9a-f]{6}$/;
const BANNED_PHRASES = [
  'lorem ipsum', 'unlock', 'game-changer', 'game changer', 'revolutionize', 'revolutionary',
  'seamless', 'elevate your', 'transform your', 'next level', 'world-class', 'cutting-edge',
  'leverage', 'synergy', 'your one-stop', 'we are passionate', 'passionate about',
  'welcome to our website', 'click here', 'placeholder', 'TODO', 'XXX', '[insert', '{{',
  'Example Company', 'Your Company', 'John Doe', 'Jane Doe', 'Lorem',
];

const REQUIRED_META = ['businessName', 'businessType'];
const REQUIRED_BRIEF = ['primaryAction'];
const REQUIRED_PALETTE = ['bg', 'surface', 'ink', 'muted', 'brand', 'accent'];
const REQUIRED_FONTS = ['display', 'body'];

// WCAG relative luminance for an sRGB color.
function linearize(c) {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}
function parseHex(hex) {
  const m = String(hex).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
  if (!m) return null;
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}
function contrastRatio(color1, color2) {
  const c1 = parseHex(color1);
  const c2 = parseHex(color2);
  if (!c1 || !c2) return 0;
  const l1 = luminance(c1[0], c1[1], c1[2]);
  const l2 = luminance(c2[0], c2[1], c2[2]);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function isString(value) {
  return typeof value === 'string';
}
function nonEmpty(value) {
  return isString(value) && value.trim().length > 0;
}
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isArrayOfStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function bannedPhraseHit(text) {
  const lower = String(text).toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

function checkBanned(value, path, errors) {
  if (!isString(value)) return;
  const hit = bannedPhraseHit(value);
  if (hit) errors.push(`${path}: contains banned phrase "${hit}".`);
}

/** Walk every string leaf in an object and run a checker. */
function walkStrings(node, path, fn, errors) {
  if (isString(node)) {
    fn(node, path, errors);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkStrings(item, `${path}[${i}]`, fn, errors));
    return;
  }
  if (isPlainObject(node)) {
    for (const [key, value] of Object.entries(node)) {
      walkStrings(value, `${path}.${key}`, fn, errors);
    }
  }
}

function collectBanned(node, path, errors) {
  walkStrings(node, path, checkBanned, errors);
}

export function validateSpec(spec) {
  const errors = [];

  if (!isPlainObject(spec)) {
    return { ok: false, errors: ['Spec must be a JSON object.'] };
  }

  // --- version ---
  if (spec.version !== SPEC_VERSION) {
    errors.push(`version must be ${SPEC_VERSION}.`);
  }

  // --- meta ---
  const meta = spec.meta;
  if (!isPlainObject(meta)) {
    errors.push('meta must be an object.');
  } else {
    for (const field of REQUIRED_META) {
      if (!nonEmpty(meta[field])) errors.push(`meta.${field} is required.`);
    }
    if (meta.businessType && !BUSINESS_TYPES.has(meta.businessType)) {
      errors.push(`meta.businessType "${meta.businessType}" is not a valid business type.`);
    }
    ['businessName', 'tagline', 'industry', 'description'].forEach((field) => {
      if (isString(meta[field]) && meta[field].length > 300) {
        errors.push(`meta.${field} exceeds 300 characters.`);
      }
    });
  }

  // --- brief ---
  const brief = spec.brief;
  if (!isPlainObject(brief)) {
    errors.push('brief must be an object.');
  } else {
    for (const field of REQUIRED_BRIEF) {
      if (!nonEmpty(brief[field])) errors.push(`brief.${field} is required.`);
    }
    if (brief.primaryAction && !PRIMARY_ACTIONS.has(brief.primaryAction)) {
      errors.push(`brief.primaryAction "${brief.primaryAction}" is not valid.`);
    }
    if (!isArrayOfStrings(brief.tone)) errors.push('brief.tone must be an array of strings.');
    if (!isArrayOfStrings(brief.avoid)) errors.push('brief.avoid must be an array of strings.');
    ['offer', 'audience'].forEach((field) => {
      if (isString(brief[field]) && brief[field].length > 1200) {
        errors.push(`brief.${field} exceeds 1200 characters.`);
      }
    });
  }

  // --- unknowns ---
  if (!isArrayOfStrings(spec.unknowns)) {
    errors.push('unknowns must be an array of strings.');
  }

  // --- design ---
  const design = spec.design;
  if (!isPlainObject(design)) {
    errors.push('design must be an object.');
  } else {
    const palette = design.palette;
    if (!isPlainObject(palette)) {
      errors.push('design.palette must be an object.');
    } else {
      for (const role of REQUIRED_PALETTE) {
        if (!HEX_RE.test(String(palette[role] ?? ''))) {
          errors.push(`design.palette.${role} must be a hex color (#rrggbb).`);
        }
      }
      // Contrast checks (only when all relevant colors are valid hex).
      const bg = palette.bg;
      const surface = palette.surface;
      const ink = palette.ink;
      const muted = palette.muted;
      const brand = palette.brand;
      if (HEX_RE.test(String(bg ?? '')) && HEX_RE.test(String(ink ?? ''))) {
        if (contrastRatio(ink, bg) < 4.5) errors.push('design.palette: ink on bg must reach WCAG AA contrast (4.5:1).');
      }
      if (HEX_RE.test(String(ink ?? '')) && HEX_RE.test(String(surface ?? ''))) {
        if (contrastRatio(ink, surface) < 4.5) errors.push('design.palette: ink on surface must reach WCAG AA contrast (4.5:1).');
      }
      if (HEX_RE.test(String(muted ?? '')) && HEX_RE.test(String(bg ?? ''))) {
        if (contrastRatio(muted, bg) < 4.5) errors.push('design.palette: muted on bg must reach WCAG AA contrast (4.5:1).');
      }
      if (HEX_RE.test(String(brand ?? '')) && HEX_RE.test(String(bg ?? ''))) {
        if (contrastRatio(brand, bg) < 3) errors.push('design.palette: brand on bg must reach contrast 3:1.');
      }
    }
    const fonts = design.fonts;
    if (!isPlainObject(fonts)) {
      errors.push('design.fonts must be an object.');
    } else {
      for (const field of REQUIRED_FONTS) {
        if (!nonEmpty(fonts[field])) errors.push(`design.fonts.${field} is required.`);
      }
      if (fonts.display && fonts.body && !isValidFontPairing(fonts.display, fonts.body)) {
        errors.push(`design.fonts: "${fonts.display}" / "${fonts.body}" is not a valid font pairing.`);
      }
    }
    if (design.radius && !RADIUS_VALUES.has(design.radius)) {
      errors.push(`design.radius "${design.radius}" is not valid.`);
    }
    if (design.density && !DENSITY_VALUES.has(design.density)) {
      errors.push(`design.density "${design.density}" is not valid.`);
    }
    if (design.motion && !MOTION_VALUES.has(design.motion)) {
      errors.push(`design.motion "${design.motion}" is not valid.`);
    }
    if (design.imageStyle && !IMAGE_STYLE_VALUES.has(design.imageStyle)) {
      errors.push(`design.imageStyle "${design.imageStyle}" is not valid.`);
    }
  }

  // --- nav ---
  if (!Array.isArray(spec.nav)) {
    errors.push('nav must be an array.');
  } else {
    spec.nav.forEach((item, i) => {
      const p = `nav[${i}]`;
      if (!isPlainObject(item)) { errors.push(`${p} must be an object.`); return; }
      if (!nonEmpty(item.label)) errors.push(`${p}.label is required.`);
      if (!nonEmpty(item.href)) errors.push(`${p}.href is required.`);
    });
  }

  // --- pages ---
  if (!Array.isArray(spec.pages) || spec.pages.length === 0 || spec.pages.length > 8) {
    errors.push('pages must be a non-empty array with at most 8 entries.');
  } else {
    const pageSlugs = new Set();
    spec.pages.forEach((page, pi) => {
      const p = `pages[${pi}]`;
      if (!isPlainObject(page)) { errors.push(`${p} must be an object.`); return; }
      if (!nonEmpty(page.slug)) errors.push(`${p}.slug is required.`);
      else {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) {
          errors.push(`${p}.slug must contain only lowercase letters, numbers, and hyphens.`);
        }
        if (pageSlugs.has(page.slug)) errors.push(`${p}.slug "${page.slug}" is duplicated.`);
        pageSlugs.add(page.slug);
      }
      if (!nonEmpty(page.title)) errors.push(`${p}.title is required.`);
      if (isString(page.description) && page.description.length > 1200) {
        errors.push(`${p}.description exceeds 1200 characters.`);
      }
      if (!Array.isArray(page.sections) || page.sections.length === 0 || page.sections.length > 20) {
        errors.push(`${p}.sections must be a non-empty array with at most 20 entries.`);
        return;
      }
      const nonNav = page.sections.filter((s) => s && s.type !== 'nav');
      const first = nonNav[0];
      const last = nonNav[nonNav.length - 1];
      if (!isPlainObject(first) || first.type !== 'hero') {
        errors.push(`${p}: first section must be of type hero.`);
      }
      if (!isPlainObject(last) || !['footer', 'cta'].includes(last.type)) {
        errors.push(`${p}: last section must be of type footer or cta.`);
      }
      page.sections.forEach((section, si) => {
        const sp = `${p}.sections[${si}]`;
        if (!isPlainObject(section)) { errors.push(`${sp} must be an object.`); return; }
        if (!nonEmpty(section.type)) errors.push(`${sp}.type is required.`);
        if (!nonEmpty(section.variant)) errors.push(`${sp}.variant is required.`);
        if (section.type && section.variant && !isValidSection(section.type, section.variant)) {
          errors.push(`${sp}: variant "${section.variant}" is not valid for type "${section.type}".`);
        }
        // Content strings: headings <= 300, body <= 1200, banned phrases.
        if (isPlainObject(section.content)) {
          for (const [key, value] of Object.entries(section.content)) {
            const cp = `${sp}.content.${key}`;
            if (isString(value)) {
              const isHeading = /^(heading|title|headline|label|submitLabel|successMessage)$/i.test(key);
              if (isHeading && value.length > 300) errors.push(`${cp} exceeds 300 characters.`);
              if (!isHeading && value.length > 1200) errors.push(`${cp} exceeds 1200 characters.`);
              checkBanned(value, cp, errors);
            }
          }
        }
      });
      // Three consecutive sections with identical type+variant.
      for (let si = 0; si + 2 < page.sections.length; si++) {
        const a = page.sections[si];
        const b = page.sections[si + 1];
        const c = page.sections[si + 2];
        if (isPlainObject(a) && isPlainObject(b) && isPlainObject(c) &&
          a.type && b.type && c.type && a.variant && b.variant && c.variant &&
          a.type === b.type && b.type === c.type && a.variant === b.variant && b.variant === c.variant) {
          errors.push(`${p}: sections ${si + 1}, ${si + 2}, ${si + 3} repeat the same type/variant.`);
        }
      }
    });
  }

  // --- images ---
  if (!Array.isArray(spec.images)) {
    errors.push('images must be an array.');
  } else if (spec.images.length > 24) {
    errors.push('images must contain at most 24 entries.');
  } else {
    const imageIds = new Set();
    spec.images.forEach((image, ii) => {
      const p = `images[${ii}]`;
      if (!isPlainObject(image)) { errors.push(`${p} must be an object.`); return; }
      if (!nonEmpty(image.id)) errors.push(`${p}.id is required.`);
      else {
        if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(image.id)) {
          errors.push(`${p}.id must be a safe filename identifier.`);
        }
        if (imageIds.has(image.id)) errors.push(`${p}.id "${image.id}" is duplicated.`);
        imageIds.add(image.id);
      }
      if (!nonEmpty(image.slot)) errors.push(`${p}.slot is required.`);
      if (!nonEmpty(image.purpose)) errors.push(`${p}.purpose is required.`);
      if (!nonEmpty(image.query)) errors.push(`${p}.query is required.`);
      if (image.aspect && !IMAGE_ASPECT_VALUES.has(image.aspect)) {
        errors.push(`${p}.aspect "${image.aspect}" is not valid.`);
      }
      if (!nonEmpty(image.alt)) errors.push(`${p}.alt is required.`);
      if (image.source && !IMAGE_SOURCE_VALUES.has(image.source)) {
        errors.push(`${p}.source "${image.source}" is not valid.`);
      }
    });
    // Every image id referenced must exist; every image id must be used at least once.
    const referencedIds = new Set();
    const collectRefs = (node) => {
      if (isPlainObject(node)) {
        for (const [key, value] of Object.entries(node)) {
          if (key === 'photoImageId' || key === 'imageId') {
            if (isString(value)) referencedIds.add(value);
          } else {
            collectRefs(value);
          }
        }
      } else if (Array.isArray(node)) {
        node.forEach(collectRefs);
      }
    };
    collectRefs(spec.pages);
    collectRefs(spec.team);
    for (const id of referencedIds) {
      if (!imageIds.has(id)) errors.push(`image id "${id}" is referenced but does not exist in images.`);
    }
    for (const id of imageIds) {
      if (!referencedIds.has(id)) errors.push(`image id "${id}" is declared but never used.`);
    }
  }

  // --- forms ---
  if (!Array.isArray(spec.forms)) {
    errors.push('forms must be an array.');
  } else {
    spec.forms.forEach((form, fi) => {
      const p = `forms[${fi}]`;
      if (!isPlainObject(form)) { errors.push(`${p} must be an object.`); return; }
      if (!nonEmpty(form.id)) errors.push(`${p}.id is required.`);
      if (!nonEmpty(form.purpose)) errors.push(`${p}.purpose is required.`);
      if (!nonEmpty(form.submitLabel)) errors.push(`${p}.submitLabel is required.`);
      if (!nonEmpty(form.successMessage)) errors.push(`${p}.successMessage is required.`);
      if (!Array.isArray(form.fields)) {
        errors.push(`${p}.fields must be an array.`);
      } else {
        form.fields.forEach((field, fj) => {
          const fp = `${p}.fields[${fj}]`;
          if (!isPlainObject(field)) { errors.push(`${fp} must be an object.`); return; }
          if (!nonEmpty(field.name)) errors.push(`${fp}.name is required.`);
          if (!nonEmpty(field.label)) errors.push(`${fp}.label is required.`);
          if (field.type && !FIELD_TYPES.has(field.type)) {
            errors.push(`${fp}.type "${field.type}" is not valid.`);
          }
        });
      }
    });
  }

  // --- team ---
  if (!Array.isArray(spec.team)) {
    errors.push('team must be an array.');
  } else {
    spec.team.forEach((member, ti) => {
      const p = `team[${ti}]`;
      if (!isPlainObject(member)) { errors.push(`${p} must be an object.`); return; }
      if (!nonEmpty(member.name)) errors.push(`${p}.name is required.`);
      if (!nonEmpty(member.role)) errors.push(`${p}.role is required.`);
      if (isString(member.bio) && member.bio.length > 1200) {
        errors.push(`${p}.bio exceeds 1200 characters.`);
      }
      if (member.photoImageId !== null && member.photoImageId !== undefined && !nonEmpty(member.photoImageId)) {
        errors.push(`${p}.photoImageId must be an image id or null.`);
      }
    });
  }

  // --- seo ---
  const seo = spec.seo;
  if (!isPlainObject(seo)) {
    errors.push('seo must be an object.');
  } else {
    if (!isArrayOfStrings(seo.keywords)) errors.push('seo.keywords must be an array of strings.');
    if (seo.localBusiness !== undefined && typeof seo.localBusiness !== 'boolean') {
      errors.push('seo.localBusiness must be a boolean.');
    }
  }

  // --- section-type gating rules ---
  const businessType = (meta && meta.businessType) || '';
  const hasTeamContent = Array.isArray(spec.team) && spec.team.length > 0;
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const hasPricingSection = pages.some((page) =>
    isPlainObject(page) && Array.isArray(page.sections) &&
    page.sections.some((section) => isPlainObject(section) && section.type === 'pricing'),
  );
  pages.forEach((page, pi) => {
    if (!isPlainObject(page) || !Array.isArray(page.sections)) return;
    const p = `pages[${pi}]`;
    page.sections?.forEach((section, si) => {
      if (!isPlainObject(section)) return;
      const sp = `${p}.sections[${si}]`;
      if (section.type === 'team' && !hasTeamContent) {
        errors.push(`${sp}: team section requires a non-empty team array.`);
      }
      if (section.type === 'menu' && businessType !== 'restaurant') {
        errors.push(`${sp}: menu section is only allowed for restaurant business type.`);
      }
      if (section.type === 'pricing' && !hasPricingSection) {
        errors.push(`${sp}: pricing section must be explicitly included.`);
      }
    });
  });

  // --- banned phrases across the whole spec ---
  collectBanned(spec, 'spec', errors);

  // Hero heading word count (<= 9 words).
  pages.forEach((page, pi) => {
    if (!isPlainObject(page) || !Array.isArray(page.sections)) return;
    const hero = page.sections?.find((s) => s && s.type === 'hero');
    if (hero && isPlainObject(hero.content)) {
      for (const [key, value] of Object.entries(hero.content)) {
        if (/^(heading|title|headline)$/i.test(key) && isString(value)) {
          const words = value.trim().split(/\s+/).filter(Boolean).length;
          if (words > 9) {
            errors.push(`pages[${pi}].sections[].content.${key}: hero heading exceeds 9 words (${words}).`);
          }
        }
      }
    }
  });

  return { ok: errors.length === 0, errors };
}
