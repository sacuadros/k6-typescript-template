import { check, sleep } from 'k6';
import http from 'k6/http';
import secrets from 'k6/secrets';

import type { TestConfig } from '../config.ts';
import { routeForIteration } from '../data/routes.ts';

export async function visitAuthenticatedTarget(
  config: TestConfig,
  secretName: string,
): Promise<void> {
  const token = await secrets.get(secretName);
  const route = routeForIteration();
  const response = await http.asyncRequest(
    'GET',
    `${config.baseUrl}${route.path}`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      tags: {
        name: route.name,
        scenario: 'authenticated-target',
      },
    },
  );

  check(response, {
    'authenticated target responds successfully': (result) =>
      result.status >= 200 && result.status < 400,
  });

  sleep(1);
}
