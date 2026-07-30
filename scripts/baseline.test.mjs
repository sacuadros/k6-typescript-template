import assert from 'node:assert/strict';
import test from 'node:test';

import { compareBaseline, createBaseline } from './baseline.mjs';

function summary({ failedRate = 0, p95Ms = 200, requestRate = 20 } = {}) {
  return {
    metrics: {
      http_req_duration: { 'p(95)': p95Ms },
      http_req_failed: { value: failedRate },
      http_reqs: { rate: requestRate },
    },
  };
}

const metadata = {
  ENVIRONMENT: 'staging',
  WORKLOAD: 'capacity',
};

test('creates a scoped baseline and accepts equivalent results', () => {
  const baseline = createBaseline(summary(), metadata);
  const comparison = compareBaseline(summary(), baseline, metadata);

  assert.equal(baseline.schemaVersion, 1);
  assert.equal(comparison.regressed, false);
  assert.match(comparison.markdown, /No performance regression detected/);
});

test('detects latency, failure-rate and throughput regressions', () => {
  const baseline = createBaseline(summary(), metadata);
  const comparison = compareBaseline(
    summary({ failedRate: 0.02, p95Ms: 300, requestRate: 10 }),
    baseline,
    metadata,
  );

  assert.equal(comparison.regressed, true);
  assert.match(comparison.markdown, /Performance regression detected/);
  assert.equal((comparison.markdown.match(/❌ Regressed/g) || []).length, 3);
});

test('rejects a baseline from another execution scope', () => {
  const baseline = createBaseline(summary(), metadata);

  assert.throws(
    () =>
      compareBaseline(summary(), baseline, {
        ENVIRONMENT: 'production',
        WORKLOAD: 'capacity',
      }),
    /Baseline targets staging\/capacity/,
  );
});
