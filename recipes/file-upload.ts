import { check } from 'k6';
import http from 'k6/http';

import { loadConfig } from '../src/config.ts';

const config = loadConfig('smoke', true);
const path = __ENV.UPLOAD_PATH?.trim() || '/upload';
const expectedStatusValue = __ENV.UPLOAD_EXPECTED_STATUS || '200';

if (
  path.length > 2048 ||
  !path.startsWith('/') ||
  path.startsWith('//') ||
  /\s/.test(path)
) {
  throw new Error('UPLOAD_PATH must be a bounded relative path.');
}

if (!/^\d{3}$/.test(expectedStatusValue)) {
  throw new Error('UPLOAD_EXPECTED_STATUS must be a three-digit HTTP status.');
}

const expectedStatus = Number(expectedStatusValue);

if (expectedStatus < 100 || expectedStatus > 599) {
  throw new Error('UPLOAD_EXPECTED_STATUS must be between 100 and 599.');
}

const fixture = open('./fixtures/sample.txt', 'b');

export const options = {
  discardResponseBodies: true,
  iterations: 1,
  maxRedirects: 0,
  thresholds: {
    checks: ['rate>0.99'],
    'http_req_duration{name:File upload}': ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
  vus: 1,
};

export default function (): void {
  const response = http.post(
    `${config.baseUrl}${path}`,
    {
      file: http.file(fixture, 'sample.txt', 'text/plain'),
    },
    {
      responseCallback: http.expectedStatuses(expectedStatus),
      tags: {
        name: 'File upload',
      },
    },
  );

  check(response, {
    [`file upload returns ${expectedStatus}`]: (result) =>
      result.status === expectedStatus,
  });
}
