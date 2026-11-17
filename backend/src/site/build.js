// Build: spec → static site files.
// buildSite(spec, images) → { files: { [path]: content } }.
// No build step: plain HTML/CSS/JS that opens by double-clicking index.html.

import { rootVariables } from './design/tokens.js';
import { SECTION_MODULES } from './sections/index.js';
import { isValidFontPairing } from './design/fonts.js';

const ASSET_IMAGE_DIR = 'assets/images';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'page';
}

/** Resolve an image id to a local asset path. */
function resolveImageUrl(imageId, images) {
  if (!imageId || !images) return '';
  const img = images.find((i) => i.id === imageId);
  if (!img) return '';
  if (img.filePath) return img.filePath;
  if (img.source === 'url' || img.source === 'upload') return `assets/images/${imageId}.jpg`;
  return `assets/images/${imageId}.jpg`;
}

/** Build a single HTML page from a page spec. */
function buildPage(page, spec, images, baseUrl) {
  const { sections, slug, title, description } = page;
  const heroImageId = sections.find((s) => s && s.type === 'hero')?.content?.imageId;
  const heroImageUrl = heroImageId ? resolveImageUrl(heroImageId, images) : '';
  const fontPairing = spec.design.fonts;
  const palette = spec.design.palette;

  const head = [
    `<!doctype html>`,
    `<html lang="${esc(spec.meta.locale || 'en')}">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description || spec.meta.businessName)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description || spec.meta.businessName)}">`,
    heroImageUrl ? `<meta property="og:image" content="${esc(heroImageUrl)}">` : '',
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link rel="stylesheet" href="css/site.css">`,
    spec.meta.businessName && baseUrl ? `<link rel="canonical" href="${esc(baseUrl)}/${slug}.html">` : '',
    `</head>`,
    `<body>`,
  ].filter(Boolean).join('\n');

  const bodySections = sections.map((section, i) => {
    if (!section || !section.type) return '';
    const module = SECTION_MODULES.find((m) => m.type === section.type);
    if (!module) return '';
    const variant = module.variants[section.variant];
    if (!variant) return '';
    const imageMap = {};
    (images || []).forEach((img) => { imageMap[img.id] = resolveImageUrl(img.id, images); });
    const ctx = {
      content: section.content || {},
      images: imageMap,
      palette: spec.design.palette,
      fonts: spec.design.fonts,
      density: spec.design.density,
      radius: spec.design.radius,
      motion: spec.design.motion,
      imageStyle: spec.design.imageStyle,
    };
    const rendered = variant.render(ctx);
    if (!rendered) return '';
    return rendered;
  }).filter(Boolean).join('\n');

  const scripts = `<script defer src="js/app.js"></script>`;

  return [
    head,
    bodySections,
    scripts,
    `</body>`,
    `</html>`,
  ].join('\n');
}

/** Build the full CSS: tokens + base + section CSS + app CSS. */
function buildCss(spec, usedSections) {
  const { palette, fonts, radius, density } = spec.design;
  const lines = [];
  lines.push('/** Forge AI design tokens */');
  lines.push(rootVariables({ palette, fonts, radius, density }));
  lines.push('');
  lines.push('/** Base reset */');
  lines.push('*, *::before, *::after { box-sizing: border-box; }');
  lines.push('html { scroll-behavior: smooth; }');
  lines.push('body { margin: 0; font-family: var(--font-body); color: var(--ink); background: var(--bg); line-height: 1.6; }');
  lines.push('a { color: var(--brand); text-decoration: none; }');
  lines.push('a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: var(--radius-sm); }');
  lines.push('h1, h2, h3 { font-family: var(--font-display); margin-top: 0; }');
  lines.push('.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }');
  lines.push('');
  lines.push('/** Section styles (deduplicated) */');

  const seenCss = new Set();
  for (const sectionRef of usedSections) {
    const module = SECTION_MODULES.find((m) => m.type === sectionRef.type);
    if (!module) continue;
    const variant = module.variants[sectionRef.variant];
    if (!variant || !variant.css) continue;
    const cssKey = `${sectionRef.type}:${sectionRef.variant}`;
    if (seenCss.has(cssKey)) continue;
    seenCss.add(cssKey);
    lines.push(`/* ${sectionRef.type} / ${sectionRef.variant} */`);
    lines.push(variant.css);
    lines.push('');
  }

  lines.push('/** App overrides */');
  lines.push('.form-message { min-height: 1.2em; }');
  lines.push('.success-message { font-weight: 600; color: var(--brand); }');
  lines.push('.btn { display: inline-block; background: var(--brand); color: #ffffff; text-decoration: none; padding: 0.6rem calc(var(--space-unit) * 1.5); border-radius: var(--radius); font-family: var(--font-body); font-weight: 600; font-size: clamp(0.9rem, 1vw + 0.3rem, 1rem); border: none; cursor: pointer; }');
  lines.push('.btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }');
  lines.push('@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }');

  return lines.join('\n') + '\n';
}

/** Build the shared JS app.js. */
function buildJs(spec) {
  return `// Forge AI site app: mobile nav, FAQ accordion, form handling, booking storage.
(function () {
  'use strict';

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navLinks.hidden = expanded;
    });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const answer = document.getElementById(button.getAttribute('aria-controls'));
      button.setAttribute('aria-expanded', String(!expanded));
      if (answer) answer.hidden = expanded;
    });
  });

  // Form validation and localStorage save
  document.querySelectorAll('form').forEach((form) => {
    const messageEl = document.getElementById(form.id + '-message');
    const successEl = document.getElementById(form.id + '-success');
    const successMessage = successEl ? successEl.textContent : 'Thanks!';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let valid = true;
      form.querySelectorAll('[required]').forEach((field) => {
        if (!field.value.trim()) {
          valid = false;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });
      if (!valid) {
        if (messageEl) { messageEl.textContent = 'Please fill in the required fields.'; messageEl.style.color = 'var(--brand)'; }
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      try {
        localStorage.setItem(form.id, JSON.stringify(data));
      } catch {}
      if (messageEl) { messageEl.textContent = ''; }
      if (successEl) { successEl.hidden = false; successEl.textContent = successMessage; }
      form.reset();
    });
  });

  // Reduced motion respect
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--space-unit', '1rem');
  }
})();
`;
}

/** Build CREDITS.md from image credits. */
function buildCredits(images) {
  const lines = ['# Image Credits', '', 'The following images are used in this site:', ''];
  for (const img of images || []) {
    if (img.source === 'none') continue;
    const credit = img.credit || {};
    lines.push(`- ${img.slot}: ${credit.photographer || 'Unknown'} via ${credit.provider || 'stock'}`);
    if (credit.sourceUrl) lines.push(`  - Source: ${credit.sourceUrl}`);
    if (credit.license) lines.push(`  - License: ${credit.license}`);
  }
  lines.push('');
  lines.push('Any slot marked "Add your team photos" shows initials avatars instead of stock portraits.');
  return lines.join('\n') + '\n';
}

/** Build README.md. */
function buildReadme(spec, images, qaStatus) {
  const unknowns = Array.isArray(spec.unknowns) && spec.unknowns.length ? spec.unknowns : [];
  const lines = [
    `# ${spec.meta.businessName || 'My Business'}`,
    '',
    `${spec.meta.tagline || ''}`,
    '',
    '## How to open',
    '',
    'Open `index.html` in a web browser, or run `npx serve .` and visit the printed address. No build step required.',
    '',
    '## Files',
    '',
    '- `index.html` — Home page',
    '- `css/site.css` — Styles',
    '- `js/app.js` — Interactivity',
    '- `assets/images/` — Site images',
    '- `site.json` — Full site specification (for rebuilding or editing)',
    '',
    '## To confirm',
    '',
  ];
  if (unknowns.length) {
    for (const u of unknowns) lines.push(`- [ ] ${esc(u)}`);
  } else {
    lines.push('- None. All facts confirmed.');
  }
  lines.push('', 'These items are shown here and in the Studio, never on the public page.', '');
  if (qaStatus) {
    lines.push('## Build status', '', `QA status: ${qaStatus}`, '');
  }
  lines.push('Generated by Forge AI.');
  return lines.join('\n') + '\n';
}

/** Build sitemap.xml (only if baseUrl is set). */
function buildSitemap(pages, baseUrl) {
  if (!baseUrl) return null;
  const urls = pages.map((p) => `  <url><loc>${baseUrl}/${p.slug}.html</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Build robots.txt. */
function buildRobots() {
  return 'User-agent: *\nAllow: /\n';
}

/** Check output for placeholder text or banned patterns. */
function checkForbiddenOutput(files) {
  const issues = [];
  for (const [path, content] of Object.entries(files)) {
    if (/\{\{[^}]+\}\}/.test(content)) issues.push(`${path}: contains unresolved {{...}} placeholder`);
    if (/\[insert[^\]]*\]/i.test(content)) issues.push(`${path}: contains [insert] placeholder`);
    if (/lorem ipsum/i.test(content)) issues.push(`${path}: contains lorem ipsum`);
  }
  return issues;
}

/** Build all site files from a spec. */
export async function buildSite(spec, images = [], options = {}) {
  const { baseUrl = '' } = options;
  const files = {};
  const usedSections = [];

  // Collect used section type/variant pairs for CSS deduplication.
  for (const page of spec.pages) {
    for (const section of page.sections) {
      if (section && section.type && section.variant) {
        usedSections.push({ type: section.type, variant: section.variant });
      }
    }
  }

  // HTML pages.
  for (const page of spec.pages) {
    const html = buildPage(page, spec, images, baseUrl);
    files[`${page.slug}.html`] = html;
  }

  // CSS.
  files['css/site.css'] = buildCss(spec, usedSections);

  // JS.
  files['js/app.js'] = buildJs(spec);

  // Images: add placeholder entries for referenced images without content.
  const referencedImageIds = new Set();
  for (const page of spec.pages) {
    for (const section of page.sections) {
      if (section && section.content && section.content.imageId) {
        referencedImageIds.add(section.content.imageId);
      }
    }
  }
  for (const img of images || []) {
    if (img.filePath) {
      // Actual image content is set by the caller via options.imageContents.
    }
    if (img.id && !files[`assets/images/${img.id}.jpg`]) {
      files[`assets/images/${img.id}.jpg`] = '// placeholder image'; // replaced by caller with real binary
    }
  }
  for (const id of referencedImageIds) {
    if (!files[`assets/images/${id}.jpg`]) {
      files[`assets/images/${id}.jpg`] = '// placeholder image';
    }
  }

  // CREDITS.md.
  files['assets/CREDITS.md'] = buildCredits(images);

  // sitemap.xml and robots.txt.
  const sitemap = buildSitemap(spec.pages, baseUrl);
  if (sitemap) files['sitemap.xml'] = sitemap;
  files['robots.txt'] = buildRobots();

  // site.json (spec for rebuild/edit).
  files['site.json'] = JSON.stringify(spec, null, 2) + '\n';

  // README.md.
  files['README.md'] = buildReadme(spec, images, options.qaStatus);

  // Forbidden output check.
  const forbidden = checkForbiddenOutput(files);
  if (forbidden.length) {
    throw new Error(`Build failed: unresolved placeholders found: ${forbidden.join('; ')}`);
  }

  return { files, usedSections, imageCredits: images || [] };
}
