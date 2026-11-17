import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSite } from '../src/site/build.js';
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
  test(`build: ${name} produces all required files`, async () => {
    const raw = fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf8');
    const analysis = JSON.parse(raw);
    const spec = buildSpecFromAnalysis(analysis);
    const images = spec.images;

    const { files } = await buildSite(spec, images, { baseUrl: 'https://example.com' });

    // Required files exist.
    assert.ok(files['index.html'], 'index.html exists');
    assert.ok(files['css/site.css'], 'css/site.css exists');
    assert.ok(files['js/app.js'], 'js/app.js exists');
    assert.ok(files['assets/CREDITS.md'], 'CREDITS.md exists');
    assert.ok(files['robots.txt'], 'robots.txt exists');
    assert.ok(files['site.json'], 'site.json exists');
    assert.ok(files['README.md'], 'README.md exists');

    // Home page has exactly one h1.
    const html = files['index.html'];
    const h1Matches = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi);
    assert.equal(h1Matches?.length, 1, `home page has exactly one h1, got ${h1Matches?.length}`);

    // Every img src exists in files.
    const imgSrcs = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/gi)].map((m) => m[1]);
    for (const src of imgSrcs) {
      assert.ok(files[src], `img src ${src} exists in files`);
      if (src.endsWith('.svg')) assert.match(files[src], /<svg\b/);
    }

    // Every internal href exists.
    const pageSlugs = spec.pages.map((p) => p.slug);
    const hrefs = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((m) => m[1]);
    for (const href of hrefs) {
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;
      const pageFile = href.endsWith('.html') ? href : href + '.html';
      assert.ok(pageSlugs.includes(pageFile.replace('.html', '')) || files[pageFile], `internal href ${href} exists`);
    }

    // Every url(...) in CSS points to an existing file.
    const css = files['css/site.css'];
    const cssUrls = [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/gi)].map((m) => m[1]);
    for (const cssUrl of cssUrls) {
      if (cssUrl.startsWith('http') || cssUrl.startsWith('data:')) continue;
      assert.ok(files[cssUrl], `CSS url ${cssUrl} exists in files`);
    }

    // No banned phrases in any output.
    for (const [filePath, content] of Object.entries(files)) {
      assert.ok(!/lorem ipsum/i.test(content), `${filePath} contains no lorem ipsum`);
      assert.ok(!/click here/i.test(content), `${filePath} contains no click here`);
    }

    // README mentions unknowns.
    const readme = files['README.md'];
    if (spec.unknowns && spec.unknowns.length) {
      for (const u of spec.unknowns) {
        assert.ok(readme.includes(u), `README mentions unknown: ${u}`);
      }
    }
  });
}

test('buildSite refuses duplicate page slugs instead of overwriting a page', async () => {
  const raw = fs.readFileSync(path.join(FIXTURE_DIR, 'plumber.json'), 'utf8');
  const spec = buildSpecFromAnalysis(JSON.parse(raw));
  spec.pages.push({ ...structuredClone(spec.pages[0]), title: 'Duplicate page' });
  await assert.rejects(() => buildSite(spec, spec.images), /slug "index" is duplicated/);
});
