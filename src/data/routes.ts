import { SharedArray } from 'k6/data';
import type { Options } from 'k6/options';

import { weightedIndex } from './weighted-selection.ts';

export interface TestRoute {
  expectedStatus: number;
  maxErrorRate: number;
  method: 'GET';
  name: string;
  operationId?: string;
  path: string;
  p95Ms: number;
  weight: number;
}

const routes = new SharedArray<TestRoute>('test routes', () => {
  const data = JSON.parse(open('./routes.json')) as unknown;

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('src/data/routes.json must contain at least one route.');
  }

  if (data.length > 100) {
    throw new Error('src/data/routes.json supports at most 100 routes.');
  }

  const names = new Set<string>();
  const operationIds = new Set<string>();
  let totalWeight = 0;

  for (const route of data) {
    const operationId = route?.operationId;

    if (
      typeof route?.name !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,79}$/.test(route.name) ||
      names.has(route.name) ||
      (operationId !== undefined &&
        (typeof operationId !== 'string' ||
          operationId.length === 0 ||
          operationId.length > 256 ||
          operationId.trim() !== operationId ||
          /[\u0000-\u001f\u007f]/.test(operationId) ||
          operationIds.has(operationId))) ||
      route.method !== 'GET' ||
      typeof route?.path !== 'string' ||
      route.path.length > 2048 ||
      !route.path.startsWith('/') ||
      route.path.startsWith('//') ||
      /\s/.test(route.path) ||
      !Number.isInteger(route.weight) ||
      route.weight < 1 ||
      route.weight > 100 ||
      !Number.isInteger(route.expectedStatus) ||
      route.expectedStatus < 100 ||
      route.expectedStatus > 599 ||
      !Number.isInteger(route.p95Ms) ||
      route.p95Ms < 1 ||
      route.p95Ms > 60_000 ||
      typeof route.maxErrorRate !== 'number' ||
      !Number.isFinite(route.maxErrorRate) ||
      route.maxErrorRate <= 0 ||
      route.maxErrorRate > 1
    ) {
      throw new Error(
        'Each route requires a unique stable name, GET method, bounded path, weight, expected status, p95Ms and maxErrorRate; operationId is optional but must be unique and bounded.',
      );
    }

    names.add(route.name);
    if (operationId) {
      operationIds.add(operationId);
    }
    totalWeight += route.weight;
  }

  if (totalWeight > 10_000) {
    throw new Error('The total route weight must not exceed 10000.');
  }

  return data as TestRoute[];
});

const routeWeights = routes.map((route) => route.weight);

export function routeForIteration(): TestRoute {
  const index = weightedIndex(routeWeights, __VU - 1 + __ITER);

  return routes[index];
}

export function routeThresholds(): NonNullable<Options['thresholds']> {
  const thresholds: NonNullable<Options['thresholds']> = {};

  for (const route of routes) {
    thresholds[`http_req_duration{name:${route.name}}`] = [
      `p(95)<${route.p95Ms}`,
    ];
    thresholds[`http_req_failed{name:${route.name}}`] = [
      `rate<${route.maxErrorRate}`,
    ];
  }

  return thresholds;
}
