// Multi-step generation engine: plan the file tree once, then write each file in its own call.
// Splitting the work keeps every reply well under the model's output limit, and continuation
// calls finish any file that still gets cut off, so real multi-file apps are never truncated.
import { getArchetype, scaffoldFiles } from './archetypes.js';
import { MAX_FILE_BYTES, sanitizePath } from './paths.js';
import { getTier } from './pricing.js';
import { extractJson, stripCodeFence } from './text.js';

export const ENGINE_LIMITS = {
  planTokens: 3000,
  maxContinuations: 3,
  fileConcurrency: 3,
};

export class GenerationError extends Error {}

function brief(prompt, archetype) {
  return [
    `Product type: ${archetype.label}`,
    '',
    'Customer request:',
    prompt,
    '',
    'Requirements:',
    ...archetype.guidelines.map((g) => `- ${g}`),
  ].join('\n');
}

/** Turns the model's plan into a safe, bounded file list. Pure, so it is unit tested. */
export function normalizePlan(raw, { type, tier }) {
  const archetype = getArchetype(type);
  const { maxFiles } = getTier(tier);
  if (!raw || typeof raw !== 'object') throw new GenerationError('The project plan was empty.');
  const reserved = new Set(Object.keys(scaffoldFiles(type, { files: [] })));
  const seen = new Set();
  const files = [];
  const add = (path, purpose) => {
    const clean = sanitizePath(path);
    if (!clean || seen.has(clean) || reserved.has(clean)) return;
    seen.add(clean);
    files.push({ path: clean, purpose: String(purpose || 'Part of the project.').slice(0, 400) });
  };
  const planned = Array.isArray(raw.files) ? raw.files : [];
  // Required entry files come first so the cap never removes them.
  for (const path of archetype.requiredFiles) {
    const match = planned.find((f) => sanitizePath(f?.path) === path);
    add(path, match?.purpose ?? 'Required entry file.');
  }
  for (const f of planned) add(f?.path, f?.purpose);
  return {
    name: String(raw.name || 'Forge AI project').slice(0, 80),
    summary: String(raw.summary || '').slice(0, 600),
    contract: String(raw.contract || '').slice(0, 4000),
    files: files.slice(0, maxFiles),
  };
}

async function planProject({ chat, model, prompt, type, tier }) {
  const archetype = getArchetype(type);
  const { maxFiles } = getTier(tier);
  const { content } = await chat({
    model,
    json: true,
    maxTokens: ENGINE_LIMITS.planTokens,
    messages: [
      {
        role: 'system',
        content:
          'You are the lead architect at Forge AI, a studio that builds bespoke software for one specific business. ' +
          'Plan the project as JSON only: {"name": string, "summary": string, "contract": string, "files": [{"path": string, "purpose": string}]}. ' +
          '"contract" is the shared interface every file must follow: element ids, CSS class names, module exports, data shapes, storage keys, brand colors and fonts. ' +
          `Use at most ${maxFiles} files, relative paths with forward slashes, and always include: ${archetype.requiredFiles.join(', ')}. ` +
          'Do not plan README.md' + (type === 'software' ? '.' : ' or package.json; Forge adds them.'),
      },
      { role: 'user', content: brief(prompt, archetype) },
    ],
  });
  let raw;
  try {
    raw = extractJson(content);
  } catch {
    throw new GenerationError('The AI returned an unreadable project plan.');
  }
  const plan = normalizePlan(raw, { type, tier });
  if (!plan.files.length) throw new GenerationError('The AI did not plan any usable files.');
  return plan;
}

async function writeFile({ chat, model, prompt, type, tier, plan, file }) {
  const archetype = getArchetype(type);
  const { maxFileTokens } = getTier(tier);
  const messages = [
    {
      role: 'system',
      content:
        'You write exactly one file of a multi-file project. Reply with ONLY the raw file contents: ' +
        'no Markdown code fences, no explanations before or after. The file must be complete, valid, and consistent with the shared contract and the other files.',
    },
    {
      role: 'user',
      content: [
        brief(prompt, archetype),
        '',
        `Project: ${plan.name} — ${plan.summary}`,
        '',
        'Shared contract (follow it exactly):',
        plan.contract || '(none)',
        '',
        'All project files:',
        ...plan.files.map((f) => `- ${f.path}: ${f.purpose}`),
        '',
        `Now write the complete contents of ${file.path} (${file.purpose}).`,
      ].join('\n'),
    },
  ];
  let output = '';
  for (let round = 0; round <= ENGINE_LIMITS.maxContinuations; round++) {
    const { content, finishReason } = await chat({ model, messages, maxTokens: maxFileTokens });
    const piece =
      round === 0 && finishReason === 'length'
        ? content.replace(/^```[\w.+-]*[ \t]*\r?\n/, '')
        : round === 0
          ? stripCodeFence(content)
          : content
              .replace(/^```[\w.+-]*[ \t]*\r?\n/, '')
              .replace(/\r?\n?```[ \t]*$/, (fence) => (fence.includes('\n') ? '\n' : ''));
    output += piece;
    if (finishReason !== 'length') {
      output = stripCodeFence(output);
      if (!output.trim()) throw new GenerationError(`The AI returned an empty ${file.path}.`);
      if (Buffer.byteLength(output) > MAX_FILE_BYTES) throw new GenerationError(`${file.path} came out too large.`);
      return output.endsWith('\n') ? output : output + '\n';
    }
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: 'Continue exactly where you stopped. Output only the remaining content, without repeating anything and without code fences.' },
    );
  }
  throw new GenerationError(`${file.path} was still incomplete after ${ENGINE_LIMITS.maxContinuations} continuations.`);
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Generates a full project. `chat` is injected so tests can run without a network.
 * Returns { name, summary, files: { [path]: content } }.
 */
export async function generateProject({ chat, model, prompt, type, tier, onProgress = () => {} }) {
  await onProgress(5, 'Planning the project');
  const plan = await planProject({ chat, model, prompt, type, tier });
  await onProgress(15, `Planned ${plan.files.length} files`);
  let done = 0;
  const contents = await mapLimit(plan.files, ENGINE_LIMITS.fileConcurrency, async (file) => {
    const text = await writeFile({ chat, model, prompt, type, tier, plan, file });
    done++;
    await onProgress(15 + Math.round((done / plan.files.length) * 75), `Wrote ${file.path}`);
    return text;
  });
  const files = { ...scaffoldFiles(type, plan) };
  plan.files.forEach((file, i) => {
    files[file.path] = contents[i];
  });
  return { name: plan.name, summary: plan.summary, files };
}
