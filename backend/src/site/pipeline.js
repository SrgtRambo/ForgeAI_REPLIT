import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';

import { createAnalyzer } from './analyze.js';
import { buildSite } from './build.js';
import { runQA } from '../qa/index.js';

const DEFAULT_MAX_OUTPUT_BYTES = 1_500_000;

function summarizeQa(report) {
  return {
    status: report?.qaStatus ?? 'skipped',
    errors: (report?.errors ?? []).slice(0, 10),
    pages: (report?.pages ?? []).map((page) => ({
      page: String(page.page ?? '').split('/').pop() || 'page',
      overflow: Boolean(page.overflow),
      errors: (page.errors ?? []).slice(0, 10),
      accessibilityIssues: (page.axeViolations ?? []).slice(0, 10),
      bannedText: (page.bannedText ?? []).slice(0, 10),
    })),
  };
}

export function createSitePipeline({
  chat,
  modelAnalysis,
  modelCopy,
  qaRunner = runQA,
  idFactory = randomUUID,
  maxModelCalls = 10,
  maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
}) {
  let modelCalls = 0;
  const boundedChat = async (request) => {
    modelCalls += 1;
    if (modelCalls > maxModelCalls) {
      const error = new Error('This build reached its model-call safety limit. Try a shorter brief.');
      error.status = 429;
      throw error;
    }
    return chat({
      ...request,
      maxTokens: Math.min(Number(request.maxTokens) || 4096, 4096),
    });
  };
  const analyzer = createAnalyzer({
    chat: boundedChat,
    modelAnalysis,
    modelCopy,
    maxRetries: 1,
    maxCopyRepairs: 3,
  });

  return async function generateSite(input) {
    modelCalls = 0;
    const result = await analyzer.run(input);
    const images = result.spec.images.map((image) => ({ ...image, source: 'none', filePath: null }));
    const built = await buildSite(result.spec, images);
    const totalBytes = Object.values(built.files).reduce(
      (total, content) => total + Buffer.byteLength(content),
      0,
    );
    if (totalBytes > maxOutputBytes) {
      throw new Error('The generated site is too large to save. Shorten the brief and try again.');
    }

    let qaResult;
    try {
      qaResult = await qaRunner({ files: built.files });
    } catch {
      qaResult = {
        report: {
          qaStatus: 'skipped',
          errors: ['Automated browser checks could not run. Review the preview before publishing.'],
          pages: [],
        },
        tmpDir: null,
      };
    } finally {
      if (qaResult?.tmpDir) {
        await rm(qaResult.tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    return {
      id: idFactory(),
      name: result.spec.meta.businessName,
      industry: result.spec.meta.industry || result.spec.meta.businessType,
      fileCount: Object.keys(built.files).length,
      files: built.files,
      qa: summarizeQa(qaResult?.report),
      copyFixes: result.copyFixes,
      unknowns: result.spec.unknowns,
      modelCalls,
    };
  };
}
