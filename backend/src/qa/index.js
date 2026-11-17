// QA render + critic gate for Forge AI websites.
// Renders built pages in a headless browser, runs axe accessibility checks,
// and optionally critiques screenshots with a vision model.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';
import axe from 'axe-core';

const BANNED_PATTERNS = /lorem ipsum|click here|unlock|seamless|revolutionary|game changer|\{\{[^}]*\}\}|\[insert[^\]]*\]/i;

const VIEWPORTS = [
  { width: 390, height: 844, label: 'mobile' },
  { width: 768, height: 1024, label: 'tablet' },
  { width: 1440, height: 900, label: 'desktop' },
];

/** Check if Chromium is available for Playwright. */
export function chromiumAvailable() {
  try {
    return fs.existsSync(chromium.executablePath());
  } catch {}
  return false;
}

/** Serve a directory of static files on a random localhost port. */
function serveStatic(dir) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost`);
      let filePath = path.resolve(dir, `.${url.pathname}`);
      if (filePath !== dir && !filePath.startsWith(`${dir}${path.sep}`)) {
        res.writeHead(404);
        res.end();
        return;
      }
      if (filePath === dir) filePath = path.join(dir, 'index.html');
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

/** Run QA against built files. Returns { passed, report, screenshots }. */
export async function runQA({ files, modelCritic, chat, outDir = path.join(os.tmpdir(), 'forge-qa-') }) {
  const report = {
    pages: [],
    errors: [],
    critic: null,
    repairApplied: false,
    qaStatus: 'failed',
  };

  const tmpDir = fs.mkdtempSync(outDir);
  for (const [filePath, content] of Object.entries(files)) {
    if (path.isAbsolute(filePath) || filePath.split(/[\\/]/).includes('..')) {
      throw new Error('QA input contains an unsafe file path.');
    }
    const fullPath = path.resolve(tmpDir, filePath);
    if (!fullPath.startsWith(`${tmpDir}${path.sep}`)) {
      throw new Error('QA input contains an unsafe file path.');
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  if (!chromiumAvailable()) {
    report.errors.push('Chromium is not installed; browser QA skipped.');
    report.qaStatus = 'skipped';
    return { passed: false, report, screenshots: [], tmpDir };
  }

  const { server, port, url } = await serveStatic(tmpDir);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    server.close();
    report.errors.push('Chromium could not start; browser QA skipped.');
    report.qaStatus = 'skipped';
    return { passed: false, report, screenshots: [], tmpDir };
  }

  try {
    for (const pageSpec of Object.keys(files).filter((f) => f.endsWith('.html'))) {
      const pageUrl = `${url}/${pageSpec}`;
      const pageResult = { page: pageUrl, viewports: [], errors: [], axeViolations: [], bannedText: [], overflow: false };

      for (const vp of VIEWPORTS) {
        const page = await browser.newPage();
        const consoleErrors = [];
        const failedRequests = [];

        page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
        page.on('pageerror', (error) => consoleErrors.push(error.message));
        page.on('requestfailed', (req) => { failedRequests.push(req.url()); });

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });

        // Screenshot
        const shotPath = path.join(tmpDir, `qa-${pageSpec.replace(/\//g, '-')}-${vp.width}.png`);
        await page.screenshot({ path: shotPath, fullPage: true });
        pageResult.viewports.push({ width: vp.width, height: vp.height, screenshot: shotPath });

        // Horizontal overflow check
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (overflow) pageResult.overflow = true;

        // Collect console errors and failed requests
        pageResult.errors.push(...consoleErrors, ...failedRequests);

        // Axe accessibility check
        if (axe) {
          await page.addScriptTag({ content: axe.source });
          const axeResult = await page.evaluate(() => window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
          }));
          const serious = axeResult.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
          pageResult.axeViolations.push(...serious.map((v) => `${v.id} (${v.impact}) at ${v.nodes.map((n) => n.target.join(',')).join('; ')}`));
        }

        // Banned text check
        const visibleText = await page.evaluate(() => document.body.innerText || '');
        const bannedMatches = [...visibleText.matchAll(BANNED_PATTERNS)].map((m) => m[0]);
        if (bannedMatches.length) pageResult.bannedText.push(...bannedMatches);

        await page.close();
      }

      report.pages.push(pageResult);
    }

    // Critique with vision model
    if (modelCritic && chat) {
      const screenshots = report.pages.flatMap((p) => p.viewports.map((v) => v.screenshot));
      try {
        const critique = await runCritic({ chat, model: modelCritic, screenshots });
        report.critic = critique;
      } catch (err) {
        report.errors.push(`Critic failed: ${err.message}`);
      }
    }

    // Gate logic
    const allOk = report.errors.length === 0 && report.pages.every((p) =>
      !p.errors.length &&
      !p.overflow &&
      !p.axeViolations.length &&
      !p.bannedText.length
    );
    const criticOk = !modelCritic || (report.critic && Object.values(report.critic.scores || {}).every((s) => s >= 7));

    if (allOk && criticOk) {
      report.qaStatus = 'passed';
    } else {
      report.qaStatus = 'needs-review';
    }
  } finally {
    await browser.close();
    server.close();
  }

  return { passed: report.qaStatus === 'passed', report, screenshots: report.pages.flatMap((p) => p.viewports.map((v) => v.screenshot)), tmpDir };
}

/** Run the vision critic on screenshots. */
async function runCritic({ chat, model, screenshots }) {
  const imageParts = screenshots.map((s) => ({
    type: 'image',
    image: { path: s },
  }));

  const response = await chat({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a senior design critic. Score the website screenshots 1-10 for layout, typography, imagery, originality, professionalism. List issues as {section, problem, fix} where fix is one of: change-variant, change-palette-role, change-font-pairing, change-density, rewrite-copy, swap-image-query, remove-section, move-section. Return JSON only.',
      },
      {
        role: 'user',
        content: ['Here are screenshots of a generated website:', ...imageParts],
      },
    ],
    json: true,
    maxTokens: 2000,
  });

  return JSON.parse(response.content);
}

export { BANNED_PATTERNS };
