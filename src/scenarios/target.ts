import { check, sleep } from 'k6';
import http from 'k6/http';

import type { TestConfig } from '../config.ts';
import { routeForIteration } from '../data/routes.ts';

function responseIsSuccessful(status: number): boolean {
  return status >= 200 && status < 400;
}

export function preflightTarget(config: TestConfig): void {
  const response = http.get(config.baseUrl, {
    tags: {
      name: 'SETUP target',
      scenario: 'preflight',
    },
  });

  if (!responseIsSuccessful(response.status)) {
    throw new Error(
      `Target preflight failed with HTTP ${response.status}; load was not started.`,
    );
  }
}

export function visitTarget(config: TestConfig): void {
  const route = routeForIteration();
  const response = http.get(`${config.baseUrl}${route.path}`, {
    tags: {
      name: route.name,
      scenario: 'target-availability',
    },
  });

  check(response, {
    'target responds successfully': (result) =>
      responseIsSuccessful(result.status),
  });

  sleep(1);
}
