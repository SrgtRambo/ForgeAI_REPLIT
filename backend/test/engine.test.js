import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';

import { generateProject, GenerationError } from '../src/engine.js';
import { buildZip } from '../src/packager.js';

function fakeChat({ truncate = new Set(), neverEnds = false } = {}) {
  const calls = [];
  const chat = async ({ messages, json, maxTokens }) => {
    calls.push({ messages, json, maxTokens });
    if (json) {
      return {
        finishReason: 'stop',
        content: '```json\n' + JSON.stringify({
          name: 'Paws Salon',
          summary: 'Booking site',
          contract: '#bookingForm',
          files: [{ path: 'index.html', purpose: 'Home' }, { path: 'styles.css', purpose: 'Styles' }, { path: 'app.js', purpose: 'Logic' }, { path: '../evil.js', purpose: 'x' }],
        }) + '\n```',
      };
    }
    const target = messages[1].content.match(/contents of (\S+)/)[1];
    const isContinuation = messages.length > 2;
    if (neverEnds) return { content: 'more', finishReason: 'length' };
    if (truncate.has(target) && !isContinuation) return { content: '```js\nconst part1 = 1;\n', finishReason: 'length' };
    if (truncate.has(target)) return { content: 'const part2 = 2;\n```', finishReason: 'stop' };
    return { content: `/* ${target} */`, finishReason: 'stop' };
  };
  return { chat, calls };
}

test('plans once, writes one call per file, and adds README + package.json', async () => {
  const { chat, calls } = fakeChat();
  const progress = [];
  const project = await generateProject({
    chat, model: 'm', prompt: 'A booking site for a dog grooming salon', type: 'website', tier: 'standard',
    onProgress: (p) => progress.push(p),
  });
  assert.equal(calls.filter((c) => c.json).length, 1);
  assert.equal(calls.filter((c) => !c.json).length, 3);
  assert.deepEqual(Object.keys(project.files).sort(), ['README.md', 'app.js', 'index.html', 'package.json', 'styles.css']);
  assert.equal(project.files['index.html'], '/* index.html */\n');
  assert.ok(progress.at(-1) >= 90);
});

test('a cut-off file is finished with a continuation call', async () => {
  const { chat, calls } = fakeChat({ truncate: new Set(['app.js']) });
  const project = await generateProject({ chat, model: 'm', prompt: 'A booking site for a dog grooming salon', type: 'website', tier: 'standard' });
  assert.equal(project.files['app.js'], 'const part1 = 1;\nconst part2 = 2;\n');
  assert.equal(calls.filter((c) => !c.json).length, 4);
});

test('a file that never finishes fails the job instead of shipping broken code', async () => {
  const { chat } = fakeChat({ neverEnds: true });
  await assert.rejects(
    generateProject({ chat, model: 'm', prompt: 'A booking site for a dog grooming salon', type: 'website', tier: 'standard' }),
    GenerationError,
  );
});

test('the zip contains every file inside one project folder', async () => {
  const buffer = await buildZip('Paws Salon!', { 'index.html': '<p>x</p>', 'data/sample.csv': 'a,b\n' });
  const zip = await JSZip.loadAsync(buffer);
  assert.equal(await zip.file('paws-salon/index.html').async('string'), '<p>x</p>');
  assert.equal(await zip.file('paws-salon/data/sample.csv').async('string'), 'a,b\n');
});

test('restaurant archetype passes culinary and staff guidelines to planner and file writer', async () => {
  const { chat, calls } = fakeChat();
  const project = await generateProject({
    chat,
    model: 'm',
    prompt: 'A farm-to-table bistro with head chef tastings and table reservations',
    type: 'restaurant',
    tier: 'standard',
  });
  // Check the planning prompt received the chef and Unsplash photo guidelines
  const planMessage = calls[0].messages[1].content;
  assert.ok(planMessage.includes('Chef'), 'plan prompt mentions chefs');
  assert.ok(planMessage.includes('Unsplash'), 'plan prompt includes photo CDN guidance');
  assert.ok(planMessage.includes('Linkable'), 'plan prompt includes linkable staff guidance');

  // Check the file writer prompt also received the guidelines
  const writeMessage = calls[1].messages[1].content;
  assert.ok(writeMessage.includes('Chef'));
  assert.ok(writeMessage.includes('Unsplash'));

  assert.deepEqual(Object.keys(project.files).sort(), ['README.md', 'app.js', 'index.html', 'package.json', 'styles.css']);
});
