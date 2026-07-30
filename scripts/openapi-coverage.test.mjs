import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateOpenApiCoverage } from './openapi-coverage.mjs';

function document(paths) {
  return {
    openapi: '3.2.0',
    paths,
  };
}

test('matches templated OpenAPI paths by operationId', () => {
  const coverage = calculateOpenApiCoverage(
    document({
      '/users/{userId}': {
        get: { operationId: 'getUser' },
      },
    }),
    [
      {
        method: 'GET',
        operationId: 'getUser',
        path: '/users/example',
      },
    ],
  );

  assert.equal(coverage.passed, true);
  assert.equal(coverage.percentage, 100);
  assert.equal(coverage.unmatchedRoutes.length, 0);
});

test('reports missing operations and unmatched routes', () => {
  const coverage = calculateOpenApiCoverage(
    document({
      '/health': { get: { operationId: 'getHealth' } },
      '/users': { post: { operationId: 'createUser' } },
    }),
    [{ method: 'GET', path: '/unknown' }],
    75,
  );

  assert.equal(coverage.passed, false);
  assert.equal(coverage.percentage, 0);
  assert.equal(coverage.missing.length, 1);
  assert.equal(coverage.excluded.length, 1);
  assert.equal(coverage.unmatchedRoutes.length, 1);
  assert.match(coverage.markdown, /OpenAPI GET performance coverage: 0.00%/);
});

test('rejects duplicate OpenAPI operationIds', () => {
  assert.throws(
    () =>
      calculateOpenApiCoverage(
        document({
          '/one': { get: { operationId: 'duplicate' } },
          '/two': { get: { operationId: 'duplicate' } },
        }),
        [{ method: 'GET', path: '/one' }],
      ),
    /operationId must be unique/,
  );
});
