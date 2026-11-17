// Archetype presets: each one steers planning and file generation toward a specific kind of product.
// Web archetypes are build-free (open index.html or run `npx serve`) so a delivered zip always runs.

const WEB_BASE = [
  'Plain HTML, CSS and modern JavaScript (ES modules). No build step, no framework, no TypeScript.',
  'Libraries only from a CDN with pinned versions (e.g. https://cdn.jsdelivr.net/npm/chart.js@4.4.1).',
  'Mobile-first responsive layout, semantic HTML, visible focus states, labelled form fields, no lorem ipsum.',
  'All styling in styles.css using CSS custom properties for a distinct brand palette, typography, card elevations, and shadows derived from the business.',
  'Persist user-created data in localStorage under one namespaced key, and handle empty, loading and error states.',
];

const CURATED_MEDIA = [
  'Use authentic, high-resolution Unsplash images with auto=format&fit=crop&q=80 for all imagery (never use gray placeholder boxes or broken images):',
  '  - Chefs & Culinary: https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=600&auto=format&fit=crop&q=80 (Executive Chef), https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=600&h=600&auto=format&fit=crop&q=80 (Pastry / Sous Chef), https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=600&h=600&auto=format&fit=crop&q=80 (Sommelier / Beverage Lead)',
  '  - Restaurant & Dishes: https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80 (Dining Room Ambience), https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80 (Signature Entree), https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80 (Wood-fired / Artisanal)',
  '  - Leadership & Staff: https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&auto=format&fit=crop&q=80 (Founder / Managing Director), https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&auto=format&fit=crop&q=80 (Principal / Lead), https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=600&auto=format&fit=crop&q=80 (Operations Lead), https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&auto=format&fit=crop&q=80 (Creative Lead)',
  '  - Clinical & Specialists: https://images.unsplash.com/photo-1594824813515-78e718816c72?w=600&h=600&auto=format&fit=crop&q=80 (Healthcare / Specialist)',
  '  - Spaces & Atmosphere: https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80 (Modern Studio), https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80 (Team Workshop)',
];

const LINKABLE_STAFF_RULES = [
  'Feature a dedicated, interactive Team/Staff/Chefs roster with real photography and linkable connectivity:',
  '  - Each member card displays their portrait photo, full name, role badge, specialty, and direct communication links (tel: and mailto: with pre-filled subject).',
  '  - Linkable Actions: include an action button on each card (e.g. "Book with [Name]", "Reserve Table with Chef", or "View Credentials").',
  '  - Real Modal & Booking Flow: Clicking an employee/chef opens an interactive dialog pre-filled with that staff member\'s name and role.',
  '  - Functional Persistence: Submissions save to localStorage, display a toast notification referencing the employee by name, and update a visible "My Bookings / Inquiries" panel or drawer so the user can verify real saved data.',
];

export const ARCHETYPES = {
  website: {
    label: 'Business website',
    requiredFiles: ['index.html', 'styles.css', 'app.js'],
    guidelines: [
      ...WEB_BASE,
      ...CURATED_MEDIA,
      ...LINKABLE_STAFF_RULES,
      'Multi-section marketing site: responsive navigation with mobile drawer/toggle, hero with a clear offer, services/products grid, proof (testimonials, stats), interactive team roster with photos, interactive booking/inquiry modal, FAQ accordion, contact form with validation, and footer.',
      'Write real, specific copy and names for this business, not generic placeholders.',
    ],
  },
  restaurant: {
    label: 'Restaurant / Dining / Hospitality',
    requiredFiles: ['index.html', 'styles.css', 'app.js'],
    guidelines: [
      ...WEB_BASE,
      ...CURATED_MEDIA,
      ...LINKABLE_STAFF_RULES,
      'Culinary showcase: Chef & culinary team spotlight with high-res portrait photos, culinary philosophy, awards, and direct tasting/event inquiry triggers.',
      'Interactive menu with category filters (Starters, Mains, Desserts, Drinks), dietary tags (GF, Vegan), pricing, and dish photography.',
      'Live table reservation system: date, time slot, party size (1-8+ guests), and special seating requests. Saves reservations in localStorage, shows confirmation modal/toast, and displays active bookings in a "My Reservations" badge/drawer.',
      'Operating details: opening hours, address with Google Maps link, phone number with tel: link, and private event inquiry modal.',
    ],
  },
  services: {
    label: 'Professional services / Clinic / Agency',
    requiredFiles: ['index.html', 'styles.css', 'app.js'],
    guidelines: [
      ...WEB_BASE,
      ...CURATED_MEDIA,
      ...LINKABLE_STAFF_RULES,
      'Practitioner & staff roster: specialists with portrait photos, credentials, specialties, and direct "Book Appointment with [Specialist]" triggers.',
      'Interactive service & pricing estimator: interactive fee calculator based on service package selection or project scope.',
      'Client booking workflow: appointment scheduler storing confirmed bookings in localStorage with instant toast alerts and appointment summary.',
    ],
  },
  saas: {
    label: 'Internal tool / SaaS dashboard',
    requiredFiles: ['index.html', 'styles.css', 'app.js'],
    guidelines: [
      ...WEB_BASE,
      ...CURATED_MEDIA,
      'App shell with sidebar navigation and hash-based views (#/dashboard, #/team, #/records, #/settings).',
      'Team / staff management view with avatar photos, roles, permissions, and invite/edit staff modal.',
      'Data model in its own module (data.js) with create, read, update, delete, search, filter and CSV export.',
      'Dashboard with KPI cards and at least one Chart.js chart computed from the stored records. Seed realistic sample records on first run.',
    ],
  },
  social: {
    label: 'Social media kit',
    requiredFiles: ['index.html', 'styles.css', 'app.js'],
    guidelines: [
      ...WEB_BASE,
      'A social content studio for this business: post composer with live previews sized for Instagram (1080x1080), story (1080x1920) and LinkedIn (1200x627).',
      'At least 6 on-brand post templates (announcement, quote, offer, event, testimonial, tip) the user can edit, plus a content calendar view.',
      'Export each design as PNG using html2canvas from a CDN, and copy caption + hashtags to the clipboard.',
    ],
  },
  spreadsheet: {
    label: 'Spreadsheet connector',
    requiredFiles: ['index.html', 'styles.css', 'app.js', 'data/sample.csv'],
    guidelines: [
      ...WEB_BASE,
      'Import CSV/XLSX with drag-and-drop using SheetJS (https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js).',
      'Editable data grid with sorting, filtering, column type detection, validation highlights and totals.',
      'Export back to CSV and XLSX. Include an optional Google Apps Script file (connectors/google-sheets.gs) that syncs a sheet with the same columns.',
      'data/sample.csv holds 25+ realistic rows for this business.',
    ],
  },
  software: {
    label: 'Node.js software',
    requiredFiles: ['package.json', 'src/index.js'],
    guidelines: [
      'Node.js 20+, ES modules, zero or few well-known dependencies declared in package.json with exact versions.',
      'Clear entry point in src/index.js, a `start` script, and config read from environment variables with safe defaults.',
      'Input validation, helpful error messages, and no hard-coded secrets.',
      'If it serves HTTP, use the built-in node:http module or express and listen on process.env.PORT.',
    ],
  },
};

export function getArchetype(type) {
  const archetype = ARCHETYPES[type];
  if (!archetype) {
    throw new RangeError(`Unknown type "${type}". Use one of: ${Object.keys(ARCHETYPES).join(', ')}.`);
  }
  return archetype;
}

/** Files Forge always adds itself, so the AI budget goes to the actual product. */
export function scaffoldFiles(type, plan) {
  const name = plan.name || 'Forge AI project';
  const isWeb = type !== 'software';
  const files = {
    'README.md': [
      `# ${name}`,
      '',
      plan.summary || '',
      '',
      '## Run it',
      '',
      isWeb
        ? 'Open `index.html` in a browser, or run `npx serve .` and visit the printed address.'
        : 'Run `npm install`, then `npm start`.',
      '',
      '## Files',
      '',
      ...plan.files.map((f) => `- \`${f.path}\` — ${f.purpose}`),
      '',
      'Generated by Forge AI.',
      '',
    ].join('\n'),
  };
  if (isWeb) {
    files['package.json'] = JSON.stringify(
      { name: slug(name), private: true, version: '1.0.0', scripts: { start: 'npx --yes serve .' } },
      null,
      2,
    ) + '\n';
  }
  return files;
}

export function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'forge-project';
}
