import { check } from 'k6';
import http from 'k6/http';

import { loadConfig } from '../src/config.ts';

const config = loadConfig('smoke', true);
const path = __ENV.GRAPHQL_PATH?.trim() || '/graphql';

if (
  path.length > 2048 ||
  !path.startsWith('/') ||
  path.startsWith('//') ||
  /\s/.test(path)
) {
  throw new Error('GRAPHQL_PATH must be a bounded relative path.');
}

export const options = {
  iterations: 1,
  maxRedirects: 0,
  thresholds: {
    checks: ['rate>0.99'],
    'http_req_duration{name:GraphQL health}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
  vus: 1,
};

export default function (): void {
  const response = http.post(
    `${config.baseUrl}${path}`,
    JSON.stringify({
      operationName: 'Health',
      query: 'query Health { __typename }',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      responseCallback: http.expectedStatuses(200),
      tags: {
        name: 'GraphQL health',
      },
    },
  );

  check(response, {
    'GraphQL returns 200 without errors': (result) => {
      if (result.status !== 200) {
        return false;
      }

      const body = result.json() as { errors?: unknown };
      return !Array.isArray(body.errors) || body.errors.length === 0;
    },
  });
}
