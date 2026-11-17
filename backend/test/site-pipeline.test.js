import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildSpecFromAnalysis } from '../src/site/build-spec-from-analysis.js';
import { createSitePipeline } from '../src/site/pipeline.js';

const analysis = {
  ...JSON.parse(await readFile(new URL('./fixtures/plumber.json', import.meta.url), 'utf8')),
  businessName: 'Summit Plumbing',
  industry: 'Home services',
};

test('site pipeline analyzes, validates, builds, and checks a site without network calls', async () => {
  const calls = [];
  const pipeline = createSitePipeline({
    modelAnalysis: 'test-model',
    qaRunner: async ({ files }) => {
      assert.ok(files['index.html']);
      return {
        report: {
          qaStatus: 'passed',
          errors: [],
          pages: [{ page: 'http://127.0.0.1/index.html', overflow: false, errors: [], axeViolations: [], bannedText: [] }],
        },
        tmpDir: null,
      };
    },
    idFactory: () => 'site-test-id',
    chat: async ({ messages }) => {
      calls.push(messages[0].content);
      const prompt = messages[0].content;
      assert.match(prompt, /untrusted/i);
      if (prompt.includes('business analyst')) return { content: JSON.stringify(analysis) };
      if (prompt.includes('senior web designer')) {
        return { content: JSON.stringify(buildSpecFromAnalysis(analysis)) };
      }
      throw new Error('Unexpected model step');
    },
  });

  const result = await pipeline({
    businessName: analysis.businessName,
    industry: analysis.industry,
    description: 'Build a clear, accessible site for local plumbing customers.',
  });

  assert.equal(result.id, 'site-test-id');
  assert.equal(result.name, analysis.businessName);
  assert.equal(result.qa.status, 'passed');
  assert.equal(result.modelCalls, 2);
  assert.ok(result.files['index.html']);
  assert.ok(result.files['css/site.css']);
  assert.ok(Object.keys(result.files).some((file) => file.endsWith('.svg')));
  assert.equal(calls.length, 2);
});

test('site pipeline caps model calls and refuses oversized output', async () => {
  const pipeline = createSitePipeline({
    modelAnalysis: 'test-model',
    maxOutputBytes: 10,
    qaRunner: async () => ({ report: { qaStatus: 'passed', errors: [], pages: [] }, tmpDir: null }),
    chat: async ({ messages }) => {
      if (messages[0].content.includes('business analyst')) return { content: JSON.stringify(analysis) };
      return { content: JSON.stringify(buildSpecFromAnalysis(analysis)) };
    },
  });
  await assert.rejects(
    () => pipeline({ businessName: analysis.businessName, description: 'A long enough test brief for a business website.' }),
    /too large/,
  );
});
