import { check } from 'k6';
import http from 'k6/http';
import secrets from 'k6/secrets';

import { loadConfig } from '../src/config.ts';

function secretName(name: string): string {
  const value = __ENV[name]?.trim();

  if (!value || !/^[A-Za-z0-9._-]{1,128}$/.test(value)) {
    throw new Error(
      `${name} must name a secret using 1-128 letters, numbers, dots, underscores or hyphens.`,
    );
  }

  return value;
}

function requireSecureUrl(value: string, name: string): void {
  const isHttps = /^https:\/\/[^/]+/.test(value);
  const isLoopback =
    /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/.test(value);

  if (
    value.length > 2048 ||
    /\s/.test(value) ||
    /^https?:\/\/[^/]*@/.test(value) ||
    (!isHttps && !isLoopback)
  ) {
    throw new Error(
      `${name} must use HTTPS or loopback HTTP without credentials.`,
    );
  }
}

const config = loadConfig('smoke', true);
const tokenUrl = __ENV.TOKEN_URL?.trim();

if (!tokenUrl) {
  throw new Error('TOKEN_URL is required.');
}

requireSecureUrl(tokenUrl, 'TOKEN_URL');
requireSecureUrl(config.baseUrl, 'BASE_URL');

const clientIdSecret = secretName('OAUTH_CLIENT_ID_SECRET');
const clientSecretSecret = secretName('OAUTH_CLIENT_SECRET_SECRET');

export const options = {
  iterations: 1,
  maxRedirects: 0,
  thresholds: {
    checks: ['rate>0.99'],
    'http_req_duration{name:OAuth resource}': ['p(95)<500'],
    'http_req_duration{name:OAuth token}': ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
  vus: 1,
};

export default async function (): Promise<void> {
  const clientId = await secrets.get(clientIdSecret);
  const clientSecret = await secrets.get(clientSecretSecret);
  const tokenResponse = await http.asyncRequest(
    'POST',
    tokenUrl,
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    },
    {
      responseCallback: http.expectedStatuses(200),
      tags: { name: 'OAuth token' },
    },
  );

  check(tokenResponse, {
    'token endpoint returns 200': (response) => response.status === 200,
  });

  if (tokenResponse.status !== 200) {
    throw new Error(`Token endpoint returned HTTP ${tokenResponse.status}.`);
  }

  const accessToken = tokenResponse.json('access_token');

  if (
    typeof accessToken !== 'string' ||
    accessToken.length === 0 ||
    accessToken.length > 8192
  ) {
    throw new Error('Token response requires a bounded access_token string.');
  }

  const resourceResponse = await http.asyncRequest(
    'GET',
    config.baseUrl,
    null,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      responseCallback: http.expectedStatuses(200),
      tags: { name: 'OAuth resource' },
    },
  );

  check(resourceResponse, {
    'protected resource returns 200': (response) => response.status === 200,
  });
}
