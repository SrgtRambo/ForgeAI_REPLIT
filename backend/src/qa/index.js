// QA render + critic gate for Forge AI websites.
// Renders built pages in a headless browser, runs axe accessibility checks,
// and optionally critiques screenshots with a vision model.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let playwright;
let axe;
try {
  playwright = require('playwright');
} catch {}
try {
  axe = require('axe-core');
} catch {}

const BANNED_PATTERNS = /lorem ipsum|click here|unlock|seamless|revolutionary|game changer|\{\{[^}]*\}\}|\[insert[^\]]*\]/i;

const VIEWPORTS = [
  { width: 390, height: 844, label: 'mobile' },
  { width: 1440, height: 900, label: 'desktop' },
];

/** Check if Chromium is available for Playwright. */
export function chromiumAvailable() {
  try {
    require.resolve('playwright-chromium');
    return true;
  } catch {}
  try {
    execSync('npx playwright --version', { stdio: 'pipe', timeout: 10000 });
    return true;
  } catch {}
  return false;
}

/** Serve a directory of static files on a random localhost port. */
function serveStatic(dir) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost`);
      let filePath = path.join(dir, url.pathname);
      if (filePath === dir) filePath = path.join(dir, 'index.html');
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };
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
    const fullPath = path.join(tmpDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  if (!chromiumAvailable() || !playwright || !axe) {
    report.errors.push('Playwright/Chromium or axe-core not available; QA skipped.');
    report.qaStatus = 'skipped';
    return { passed: false, report, screenshots: [], tmpDir };
  }

  const { server, port, url } = await serveStatic(tmpDir);
  const browser = await playwright.chromium.launch({ headless: true });

  try {
    for (const pageSpec of Object.keys(files).filter((f) => f.endsWith('.html'))) {
      const pageUrl = `${url}/${pageSpec}`;
      const pageResult = { page: pageUrl, viewports: [], errors: [], axeViolations: [], bannedText: [], overflow: false };

      for (const vp of VIEWPORTS) {
        const page = await browser.newPage();
        const consoleErrors = [];
        const failedRequests = [];

        page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
        page.on('requestfailed', (req) => { failedRequests.push(req.url()); });

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageUrl, { waitUntil: 'networkidle' });

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
          const axeResult = await axe.run(page, { rules: { 'wcag2a': { enabled: true }, 'wcag2aa': { enabled: true } } });
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
    const allOk = report.pages.every((p) =>
      !p.errors.length &&
      !p.overflow &&
      !p.axeViolations.length &&
      !p.bannedText.length
    );
    const criticOk = report.critic ? Object.values(report.critic.scores || {}).every((s) => s >= 7) : false;

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
