(function attachImportCenterWorkflow(root, factory) {
  const api = factory();
  if (root) root.ImportCenterWorkflow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createImportCenterWorkflow() {
  'use strict';

  const EXTENSION_TO_PARSER = Object.freeze({
    csv: 'parseSpreadsheet',
    xls: 'parseSpreadsheet',
    xlsx: 'parseSpreadsheet',
    pdf: 'parsePdf',
  });

async function openReviewForFile(file, adapters = {}) {
  const fileName = String(file?.name || '');
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const parserName = EXTENSION_TO_PARSER[extension];
  if (!file || !parserName || typeof adapters[parserName] !== 'function') {
    return { status: 'UNSUPPORTED', fileName, writeCount: 0, reason: 'FORMAT_OR_PARSER_UNSUPPORTED' };
  }

  let parsed;
  try {
    parsed = await adapters[parserName](file);
  } catch (error) {
    return { status: 'FAILED', fileName, writeCount: 0, reason: 'FILE_READ_OR_PARSE_FAILED', error };
  }
  if (!parsed || parsed.status !== 'READY_FOR_REVIEW' || !parsed.provider || !parsed.sourceType) {
    return {
      status: parsed?.status || 'REVIEW_REQUIRED', fileName, writeCount: 0,
      reason: parsed?.reason || 'PARSER_DID_NOT_PROVE_REVIEW_READINESS',
      provider: parsed?.provider || 'UNKNOWN', sourceType: parsed?.sourceType || 'UNKNOWN',
    };
  }
  if (typeof adapters.openReview !== 'function') {
    return { status: 'FAILED', fileName, writeCount: 0, reason: 'REVIEW_HANDLER_UNAVAILABLE' };
  }

  try {
    const opened = await adapters.openReview({ file, fileName, ...parsed });
    if (opened !== true) return { status: 'FAILED', fileName, writeCount: 0, reason: 'REVIEW_NOT_OPENED' };
    return {
      status: 'REVIEW_OPEN', fileName, provider: parsed.provider, sourceType: parsed.sourceType,
      recordCount: Number.isInteger(parsed.recordCount) ? parsed.recordCount : null,
      notePreview: parsed.notePreview || parsed.parsed?.v330Preview || null,
      confirmationRequired: true, writeCount: 0,
    };
  } catch (error) {
    return { status: 'FAILED', fileName, writeCount: 0, reason: 'REVIEW_HANDLER_FAILED', error };
  }
}

  return Object.freeze({ openReviewForFile });
});
