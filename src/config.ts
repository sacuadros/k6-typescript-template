import type { Workload } from './profiles.ts';

const environments = ['demo', 'local', 'staging', 'production'] as const;

export type Environment = (typeof environments)[number];

export interface TestConfig {
  baseUrl: string;
  environment: Environment;
  testId: string;
}

function readEnvironment(): Environment {
  const value = __ENV.ENVIRONMENT || (__ENV.BASE_URL ? 'local' : 'demo');

  if (!environments.includes(value as Environment)) {
    throw new Error(
      `ENVIRONMENT must be one of: ${environments.join(', ')}. Received: ${value}`,
    );
  }

  return value as Environment;
}

export function loadConfig(
  workload: Workload,
  requireExplicitBaseUrl = false,
): TestConfig {
  const environment = readEnvironment();
  const configuredBaseUrl = __ENV.BASE_URL?.trim();
  const baseUrl =
    configuredBaseUrl ||
    (!requireExplicitBaseUrl && workload === 'smoke'
      ? 'https://test.k6.io'
      : undefined);

  if (!baseUrl) {
    throw new Error(`${workload} requires an explicit BASE_URL.`);
  }

  if (!/^https?:\/\/[^/]+/.test(baseUrl) || /\s/.test(baseUrl)) {
    throw new Error('BASE_URL must be an absolute HTTP or HTTPS URL.');
  }

  if (baseUrl.length > 2048) {
    throw new Error('BASE_URL must be 2048 characters or fewer.');
  }

  if (/^https?:\/\/[^/]*@/.test(baseUrl)) {
    throw new Error('BASE_URL must not contain credentials.');
  }

  if (workload !== 'smoke' && __ENV.ALLOW_LOAD_TEST !== 'true') {
    throw new Error(
      `${workload} is blocked. Set ALLOW_LOAD_TEST=true to run it intentionally.`,
    );
  }

  if (
    (workload === 'stress' || workload === 'capacity') &&
    environment === 'production' &&
    __ENV.ALLOW_PRODUCTION_LOAD !== 'true'
  ) {
    throw new Error(
      `${workload} against production is blocked. Set ALLOW_PRODUCTION_LOAD=true only with explicit authorization.`,
    );
  }

  const testId = __ENV.TEST_ID || `${workload}-${environment}`;

  if (!/^[A-Za-z0-9._-]{1,64}$/.test(testId)) {
    throw new Error(
      'TEST_ID must be 1-64 letters, numbers, dots, underscores, or hyphens.',
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    environment,
    testId,
  };
}
