import assert from 'node:assert/strict';
import test from 'node:test';

import { renderSummary } from './render-summary.mjs';

test('renders metrics and marks crossed thresholds as failed', () => {
  const markdown = renderSummary(
    {
      metrics: {
        checks: {
          thresholds: { 'rate>0.99': false },
          value: 1,
        },
        http_req_duration: {
          'p(95)': 420.125,
          'p(99)': 610.5,
          thresholds: { 'p(95)<500': false },
        },
        http_req_failed: {
          thresholds: { 'rate<0.01': true },
          value: 0.02,
        },
        http_reqs: { count: 12, rate: 4.25 },
        iterations: { count: 10 },
      },
    },
    {
      ENVIRONMENT: 'staging',
      GITHUB_SHA: 'abc123',
      TEST_ID: 'pr-42',
      WORKLOAD: 'smoke',
    },
  );

  assert.match(markdown, /Performance budget failed/);
  assert.match(markdown, /420\.13 ms/);
  assert.match(markdown, /610\.50 ms/);
  assert.match(markdown, /2\.00%/);
  assert.match(markdown, /`rate&lt;0\.01`.*❌ Failed/);
});

test('rejects summaries without metrics', () => {
  assert.throws(() => renderSummary({}), /metrics object/);
});
